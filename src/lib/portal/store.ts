import "server-only";
import { cached, invalidateCache } from "@/lib/cache";

// ============================================================================
// Portal saqlash qatlami — linklar, o'yin sessiyalari, ikki qurilmali xonalar.
//
//   • Supabase sozlangan bo'lsa — haqiqiy jadvallar (schema-portal.sql)
//   • Aks holda — xotira (globalThis) demo rejimi; tests bilan ishlash uchun
//
// XAVFSIZLIK QOYALARI:
//   • O'quvchi link tokeni bazada FAQAT SHA-256 xesh ko'rinishida saqlanadi
//   • O'yin javob kaliti (answer_key) hech qachon mijozga yuborilmaydi
//   • Xona maxfiy kalitlari (host/guest secret) ham faqat xesh sifatida
//   • Natija id = mijoz yuborgan attempt id → tarmoq qayta yuborsa ikki marta
//     yozilmaydi (idempotent insert)
// ============================================================================

import { createHash, randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseFetch } from "@/lib/supabase-fetch";
import { repo } from "@/lib/repo";
import type { Student } from "@/lib/types";
import type {
  FinishOutcome,
  QuestionAnswer,
  RoomStateView,
  RoomStatus,
  ServerQuestion,
} from "./types";

// ------------------------------- Yordamchilar -------------------------------

/** Tasodifiy, taxmin qilib bo'lmaydigan token (43 belgili base64url) */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Xona kodi: 6 belgili, chalkash belgilar (0/O, 1/I) yo'q */
function roomCodeAlphabet(): string[] {
  return "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".split("");
}

export function generateRoomCode(): string {
  const alphabet = roomCodeAlphabet();
  const bytes = randomBytes(6);
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function randomSecret(): string {
  return randomBytes(24).toString("base64url");
}

// ------------------------------- Supabase client ----------------------------

let cachedClient: SupabaseClient | null = null;

function sb(): SupabaseClient {
  if (cachedClient) return cachedClient;
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  ).trim();
  cachedClient = createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: supabaseFetch },
  });
  return cachedClient;
}

function isSupabase(): boolean {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  ).trim();
  return Boolean(url && key);
}

// --------------------------- Demo (xotira) ombori ---------------------------

export interface LinkRow {
  id: string;
  student_id: string;
  token_hash: string;
  active: boolean;
  created_at: string;
  revoked_at: string | null;
}

export interface SessionRow {
  id: string;
  student_id: string;
  game_key: string;
  game_title: string;
  game_type: string;
  mode: "solo" | "duo";
  room_id: string | null;
  questions: ServerQuestion[];
  answer_key: QuestionAnswer[];
  score: number;
  answered: number;
  total: number;
  status: "active" | "done" | "expired";
  created_at: string;
  expires_at: number;
  finished_at: string | null;
}

export interface RoomRow {
  id: string;
  game_key: string;
  game_title: string;
  game_type: string;
  subject: string;
  grade: number | null;
  status: RoomStatus;
  host_student_id: string;
  host_name: string;
  guest_student_id: string | null;
  guest_name: string;
  host_secret_hash: string;
  guest_secret_hash: string | null;
  seed: number;
  questions: ServerQuestion[];
  answer_key: QuestionAnswer[];
  total: number;
  /** Yakunlanish: questions = hamma savol, race = birinchi tugatgan, time = vaqt bo'yicha */
  end_mode: "questions" | "race" | "time";
  /** Vaqt bo'yicha rejim: minut (null = rejim yo'q) */
  time_limit_min: number | null;
  /** Poyga: birinchi tugatgan (birinchi finish yutadi) */
  winner_slot: "host" | "guest" | null;
  expires_at: number;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
}

export interface ProgressRow {
  room_id: string;
  player: "host" | "guest";
  score: number;
  answered: number;
  done: boolean;
  attempt_id: string;
  updated_at: string;
}

interface DemoStore {
  links: Map<string, LinkRow>; // key: student_id
  linksByHash: Map<string, LinkRow>; // key: token_hash
  sessions: Map<string, SessionRow>;
  rooms: Map<string, RoomRow>;
  progress: Map<string, ProgressRow>; // key: room_id:player
  results: Map<string, PortalResultRow>;
}

const g = globalThis as unknown as { __portalDemoStore?: DemoStore };

function demo(): DemoStore {
  if (!g.__portalDemoStore) {
    g.__portalDemoStore = {
      links: new Map(),
      linksByHash: new Map(),
      sessions: new Map(),
      rooms: new Map(),
      progress: new Map(),
      results: new Map(),
    };
  }
  return g.__portalDemoStore;
}

export function resetPortalDemoStore(): void {
  g.__portalDemoStore = undefined;
}

// ---------------------------------------------------------------------------
// O'QUVCHI LINKLARI
// ---------------------------------------------------------------------------

export interface IssuedLink {
  token: string;
  url: string;
  createdAt: string;
}

async function studentById(id: string): Promise<Student | null> {
  const students = await repo.listStudents();
  return students.find((s) => s.id === id) ?? null;
}

export interface StudentLinkStatus {
  active: boolean;
  createdAt: string | null;
  revokedAt: string | null;
}

export async function getLinkStatus(studentId: string): Promise<StudentLinkStatus> {
  if (!isSupabase()) {
    const row = demo().links.get(studentId);
    return {
      active: Boolean(row?.active),
      createdAt: row?.created_at ?? null,
      revokedAt: row?.revoked_at ?? null,
    };
  }
  const res = await sb()
    .from("student_links")
    .select("active, created_at, revoked_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = (res.data ?? null) as { active: boolean; created_at: string; revoked_at: string | null } | null;
  return {
    active: Boolean(row?.active),
    createdAt: row?.created_at ?? null,
    revokedAt: row?.revoked_at ?? null,
  };
}

export async function getLinkStatuses(studentIds: string[]): Promise<Map<string, StudentLinkStatus>> {
  const map = new Map<string, StudentLinkStatus>();
  if (!studentIds.length) return map;
  if (!isSupabase()) {
    for (const id of studentIds) map.set(id, await getLinkStatus(id));
    return map;
  }
  const res = await sb()
    .from("student_links")
    .select("student_id, active, created_at, revoked_at")
    .in("student_id", studentIds)
    .order("created_at", { ascending: false });
  for (const row of (res.data ?? []) as Array<{
    student_id: string;
    active: boolean;
    created_at: string;
    revoked_at: string | null;
  }>) {
    if (!map.has(row.student_id)) {
      map.set(row.student_id, {
        active: Boolean(row.active),
        createdAt: row.created_at,
        revokedAt: row.revoked_at,
      });
    }
  }
  for (const id of studentIds) if (!map.has(id)) map.set(id, { active: false, createdAt: null, revokedAt: null });
  return map;
}

/** Yangi token berish (eski faol link bo'lsa — bekor qilinadi) */
export async function issueStudentLink(studentId: string, baseUrl: string): Promise<IssuedLink> {
  const token = generateToken();
  const tokenHash = sha256(token);
  const now = new Date().toISOString();

  if (!isSupabase()) {
    const d = demo();
    const prev = d.links.get(studentId);
    if (prev?.active) {
      prev.active = false;
      prev.revoked_at = now;
    }
    const row: LinkRow = {
      id: `l-${randomBytes(6).toString("hex")}`,
      student_id: studentId,
      token_hash: tokenHash,
      active: true,
      created_at: now,
      revoked_at: null,
    };
    d.links.set(studentId, row);
    d.linksByHash.set(tokenHash, row);
    return { token, url: linkUrl(token, baseUrl), createdAt: now };
  }

  const client = sb();
  const { error: revError } = await client
    .from("student_links")
    .update({ active: false, revoked_at: now })
    .eq("student_id", studentId)
    .eq("active", true);
  if (revError) throw new Error(`Linkni yangilashda xato: ${revError.message}`);

  const { error } = await client
    .from("student_links")
    .insert({ student_id: studentId, token_hash: tokenHash, active: true });
  if (error) {
    // Boshqa sessiyada parallel berilgan bo'lsa — unik indeks rad etadi
    throw new Error(`Link yaratishda xato: ${error.message}`);
  }
  return { token, url: linkUrl(token, baseUrl), createdAt: now };
}

/** Linkni bekor qilish — eski kirish darhol ishlamaydi */
export async function revokeStudentLink(studentId: string): Promise<boolean> {
  if (!isSupabase()) {
    const d = demo();
    const row = d.links.get(studentId);
    if (!row?.active) return false;
    row.active = false;
    row.revoked_at = new Date().toISOString();
    return true;
  }
  const res = await sb()
    .from("student_links")
    .update({ active: false, revoked_at: new Date().toISOString() })
    .eq("student_id", studentId)
    .eq("active", true)
    .select("id");
  return (res.data?.length ?? 0) > 0;
}

/**
 * Token → o'quvchi. Faqat FAQOL link uchun ishlaydi; bekor qilingan yoki
 * yangilangan token topilmaydi (eski kirish o'ladi).
 */
export async function resolveStudentByToken(token: string): Promise<Student | null> {
  const tokenHash = sha256(token);
  if (!isSupabase()) {
    const row = demo().linksByHash.get(tokenHash);
    if (!row || !row.active) return null;
    return studentById(row.student_id);
  }
  const res = await sb()
    .from("student_links")
    .select("student_id")
    .eq("token_hash", tokenHash)
    .eq("active", true)
    .maybeSingle();
  const linkId = (res.data as { student_id: string } | null)?.student_id;
  if (!linkId) return null;
  return studentById(linkId);
}

// ---------------------------------------------------------------------------
// NATIJALAR (idempotent saqlash)
// ---------------------------------------------------------------------------

export interface PortalResultRow {
  id: string;
  book_id: string | null;
  topic_id: string | null;
  topic_title: string | null;
  game_id: string;
  game_title: string;
  game_type: string;
  student_id: string | null;
  student_name: string | null;
  score: number;
  total: number;
  time_sec: number;
  mode: "solo" | "duo" | null;
  percent: number;
  /** Ball tizimi: ona-tili=4, matematika=2 (points.ts) */
  points: number;
  source: "portal" | "dashboard";
  created_at: string;
}

/** attempt id bo'yicha yozish: mavjud bo'lsa YANGI QATOR YOZILMAYDI.
 *  Ballar shu yerda hisoblanadi (ona-tili=4, matematika=2 — points.ts). */
export async function saveResultIdempotent(row: PortalResultRow): Promise<{ saved: boolean }> {
  if (!row.points) {
    try {
      const { pointsForSubject, subjectForGameKey, DAILY_POINTS } = await import("@/lib/portal/points");
      row.points = pointsForSubject(await subjectForGameKey(row.game_id));
      // KUNLIK MAJBURIY O'YIN → fandan qat'i nazar 6 ball.
      // Server o'zi tekshiradi (mijoz yuborgan bayrog'iga ishonch yo'q);
      // faqat portal o'yinlari uchun — dashboard sinovlari oddiy fan balli oladi.
      if (row.source === "portal" && row.student_id) {
        const { isTodayDailyGameKey } = await import("@/lib/portal/catalog");
        if (await isTodayDailyGameKey(row.game_id, row.student_id)) row.points = DAILY_POINTS;
      }
    } catch {
      row.points = 2;
    }
  }
  if (!isSupabase()) {
    const d = demo();
    if (d.results.has(row.id)) return { saved: false };
    d.results.set(row.id, row);
    invalidateCache("results:");
    invalidateCache("portal:results");
    return { saved: true };
  }
  const res = await sb().from("game_results").upsert(row, { onConflict: "id", ignoreDuplicates: true }).select("id");
  if ((res.data?.length ?? 0) > 0) {
    invalidateCache("results:");
    invalidateCache("portal:results");
  }
  // ignoreDuplicates + select → yangi qator qaytadi, mavjud bo'lsa bo'sh
  return { saved: (res.data?.length ?? 0) > 0 };
}

export async function getResultById(id: string): Promise<PortalResultRow | null> {
  if (!isSupabase()) return demo().results.get(id) ?? null;
  const res = await sb().from("game_results").select("*").eq("id", id).maybeSingle();
  return (res.data as PortalResultRow | null) ?? null;
}

/** O'quvchi BUGUN (Toshkent vaqti bilan) tugatgan o'yinlar kalitlari.
 *  Kunlik majburiy o'yin bajarilganini tekshirish uchun. */
export async function studentTodayGameKeys(studentId: string): Promise<Set<string>> {
  if (!studentId) return new Set();
  const dateKey = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const since = new Date(`${dateKey}T00:00:00+05:00`).toISOString();
  if (!isSupabase()) {
    const keys = new Set<string>();
    for (const r of demo().results.values()) {
      if (r.student_id === studentId && r.created_at >= since) keys.add(r.game_id);
    }
    return keys;
  }
  const res = await sb()
    .from("game_results")
    .select("game_id")
    .eq("student_id", studentId)
    .gte("created_at", since);
  return new Set(((res.data ?? []) as Array<{ game_id: string }>).map((row) => row.game_id));
}

/** STATISTIKANI TO'LIQ TOZALASH — hamma game_results o'chiriladi */
export async function resetGameResults(): Promise<number> {
  invalidateCache("results:");
  invalidateCache("portal:results");
  if (!isSupabase()) {
    const d = demo();
    const n = d.results.size;
    d.results.clear();
    return n;
  }
  const res = await sb().from("game_results").delete().neq("id", "").select("id");
  return res.data?.length ?? 0;
}

/** Barcha portal natijalari (demo rejimda statistika sahifasi bilan umumiy ombor) */
export async function listAllPortalResults(): Promise<PortalResultRow[]> {
  return cached("portal:results", 5_000, async () => {
    if (!isSupabase()) return [...demo().results.values()];
    const res = await sb()
      .from("game_results")
      .select("*")
      .eq("source", "portal")
      .order("created_at", { ascending: false });
    return ((res.data ?? []) as PortalResultRow[]);
  });
}

// ---------------------------------------------------------------------------
// O'YIN SESSIYALARI (yakka o'yin — serverda tekshiriladi)
// ---------------------------------------------------------------------------

const SESSION_TTL_MS = 3 * 60 * 60 * 1000;

export interface CreateSessionInput {
  studentId: string;
  gameKey: string;
  gameTitle: string;
  gameType: string;
  mode: "solo" | "duo";
  roomId?: string | null;
  questions: ServerQuestion[];
}

export async function createGameSession(input: CreateSessionInput): Promise<SessionRow> {
  const id = randomBytes(16).toString("hex");
  const row: SessionRow = {
    id,
    student_id: input.studentId,
    game_key: input.gameKey,
    game_title: input.gameTitle,
    game_type: input.gameType,
    mode: input.mode,
    room_id: input.roomId ?? null,
    questions: input.questions,
    answer_key: input.questions.map((q) => q.a),
    score: 0,
    answered: 0,
    total: input.questions.length,
    status: "active",
    created_at: new Date().toISOString(),
    expires_at: Date.now() + SESSION_TTL_MS,
    finished_at: null,
  };

  if (!isSupabase()) {
    demo().sessions.set(id, row);
    return row;
  }

  const { error } = await sb().from("game_sessions").insert({
    id: row.id,
    student_id: row.student_id,
    game_key: row.game_key,
    game_title: row.game_title,
    game_type: row.game_type,
    mode: row.mode,
    room_id: row.room_id,
    questions: row.questions,
    answer_key: row.answer_key,
    score: 0,
    answered: 0,
    total: row.total,
    status: "active",
  });
  if (error) throw new Error(`Sessiya yaratishda xato: ${error.message}`);
  return row;
}

export async function getGameSession(id: string): Promise<SessionRow | null> {
  if (!isSupabase()) {
    const row = demo().sessions.get(id);
    if (!row) return null;
    if (row.status === "active" && Date.now() > row.expires_at) {
      row.status = "expired";
    }
    return row;
  }
  const res = await sb().from("game_sessions").select("*").eq("id", id).maybeSingle();
  const row = res.data as
    | (Omit<SessionRow, "expires_at" | "questions" | "answer_key"> & {
        expires_at: string;
        questions: ServerQuestion[];
        answer_key: QuestionAnswer[];
      })
    | null;
  if (!row) return null;
  const parsed: SessionRow = {
    ...row,
    expires_at: new Date(row.expires_at).getTime(),
  };
  if (parsed.status === "active" && Date.now() > parsed.expires_at) parsed.status = "expired";
  return parsed;
}

/** Javobni serverda TEKSHIRISH va sessiyaga yozish */
export async function checkSessionAnswer(
  session: SessionRow,
  qIndex: number,
  choice: number | number[]
): Promise<{ correct: boolean; score: number; answered: number }> {
  const answer = session.answer_key[qIndex];
  const correct =
    Array.isArray(answer) && Array.isArray(choice)
      ? answer.length === choice.length && answer.every((v, i) => v === choice[i])
      : !Array.isArray(answer) && !Array.isArray(choice)
        ? answer === choice
        : false;

  const score = session.score + (correct ? 1 : 0);
  const answered = Math.min(session.total, Math.max(session.answered, qIndex + 1));

  if (!isSupabase()) {
    session.score = score;
    session.answered = answered;
    return { correct, score, answered };
  }

  await sb()
    .from("game_sessions")
    .update({ score, answered })
    .eq("id", session.id);
  session.score = score;
  session.answered = answered;
  return { correct, score, answered };
}

export interface SessionFinish {
  outcome: FinishOutcome;
}

/** Sessiyani yakunlash → natijani avtomatik saqlash (idempotent) */
export async function finishGameSession(
  session: SessionRow,
  attemptId: string,
  timeSec: number,
  baseUrl: string
): Promise<SessionFinish> {
  if (session.status !== "active") {
    const existing = await getResultById(attemptId);
    return {
      outcome: {
        saved: Boolean(existing),
        alreadySaved: true,
        score: existing?.score ?? session.score,
        total: existing?.total ?? session.total,
        percent: existing?.percent ?? percentOf(session.score, session.total),
        problem: session.status === "expired" ? "Sessiya muddati tugagan." : undefined,
      },
    };
  }

  const now = new Date().toISOString();
  session.status = "done";
  session.finished_at = now;

  if (!isSupabase()) {
    const result = buildResultRow({
      attemptId,
      studentId: session.student_id,
      gameKey: session.game_key,
      gameTitle: session.game_title,
      gameType: session.game_type,
      score: session.score,
      total: session.total,
      timeSec,
      mode: session.mode,
    });
    const { saved } = await saveResultIdempotent(result);
    return {
      outcome: {
        saved,
        alreadySaved: !saved,
        score: session.score,
        total: session.total,
        percent: percentOf(session.score, session.total),
        problem: saved ? undefined : "Natija allaqachon saqlangan yoki saqlash muvaffaqiyatsiz bo'ldi.",
      },
    };
  }

  await sb().from("game_sessions").update({ status: "done", finished_at: now, score: session.score, answered: session.answered }).eq("id", session.id);

  const result = buildResultRow({
    attemptId,
    studentId: session.student_id,
    gameKey: session.game_key,
    gameTitle: session.game_title,
    gameType: session.game_type,
    score: session.score,
    total: session.total,
    timeSec,
    mode: session.mode,
  });
  let saved = false;
  try {
    const r = await saveResultIdempotent(result);
    saved = r.saved;
  } catch {
    saved = false;
  }
  void baseUrl;
  return {
    outcome: {
      saved,
      alreadySaved: !saved,
      score: session.score,
      total: session.total,
      percent: percentOf(session.score, session.total),
      problem: saved ? undefined : "Natijani saqlab bo'lmadi — internetni tekshirib, «Yana o'ynash» oldidan qayta urinib ko'ring.",
    },
  };
}

export function percentOf(score: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.round((Math.max(0, score) / total) * 100);
}

export function buildResultRow(input: {
  attemptId: string;
  studentId: string | null;
  studentName?: string | null;
  gameKey: string;
  gameTitle: string;
  gameType: string;
  score: number;
  total: number;
  timeSec: number;
  mode: "solo" | "duo" | null;
  source?: "portal" | "dashboard";
  bookId?: string | null;
  topicId?: string | null;
  topicTitle?: string | null;
}): PortalResultRow {
  return {
    id: input.attemptId,
    book_id: input.bookId ?? null,
    topic_id: input.topicId ?? null,
    topic_title: input.topicTitle ?? null,
    game_id: input.gameKey,
    game_title: input.gameTitle,
    game_type: input.gameType,
    student_id: input.studentId,
    student_name: input.studentName ?? null,
    score: Math.max(0, Math.round(input.score)),
    total: Math.max(0, Math.round(input.total)),
    time_sec: Math.max(0, Math.round(input.timeSec)),
    mode: input.mode,
    percent: percentOf(input.score, input.total),
    points: 0,
    source: input.source ?? "portal",
    created_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// DO'ST BILAN O'YNASH — XONALAR
// ---------------------------------------------------------------------------

const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

export interface CreateRoomInput {
  hostStudentId: string;
  hostName: string;
  gameKey: string;
  gameTitle: string;
  gameType: string;
  subject: string;
  grade: number | null;
  questions: ServerQuestion[];
  /** Yakunlanish rejimi (o'qituvchi ko'p kishilik rejimlari kabi) */
  endMode?: "questions" | "race" | "time";
  /** Vaqt bo'yicha rejim: minutlar (1..10) */
  timeLimitMin?: number | null;
}

export interface CreatedRoom {
  code: string;
  /** Host brauzeri uchun maxfiy kalit (reconnect) — faqat yaratilgan paytda qaytadi */
  hostSecret: string;
  invitePath: string;
  expiresAt: string;
}

export async function createRoom(input: CreateRoomInput): Promise<CreatedRoom> {
  const code = generateRoomCode();
  const hostSecret = randomSecret();
  const now = new Date().toISOString();

  const row: RoomRow = {
    id: code,
    game_key: input.gameKey,
    game_title: input.gameTitle,
    game_type: input.gameType,
    subject: input.subject,
    grade: input.grade,
    status: "waiting",
    host_student_id: input.hostStudentId,
    host_name: input.hostName,
    guest_student_id: null,
    guest_name: "",
    host_secret_hash: sha256(hostSecret),
    guest_secret_hash: null,
    seed: Math.floor(Math.random() * 2_000_000_000),
    questions: input.questions,
    answer_key: input.questions.map((q) => q.a),
    total: input.questions.length,
    end_mode: input.endMode ?? "questions",
    time_limit_min: input.timeLimitMin ?? null,
    winner_slot: null,
    expires_at: Date.now() + ROOM_TTL_MS,
    created_at: now,
    updated_at: now,
    finished_at: null,
  };

  if (!isSupabase()) {
    demo().rooms.set(code, row);
    return {
      code,
      hostSecret,
      invitePath: `/o/duo/${code}`,
      expiresAt: new Date(row.expires_at).toISOString(),
    };
  }

  const { error } = await sb().from("game_rooms").insert({
    id: code,
    game_key: row.game_key,
    game_title: row.game_title,
    game_type: row.game_type,
    subject: row.subject,
    grade: row.grade,
    status: row.status,
    host_student_id: row.host_student_id,
    host_name: row.host_name,
    host_secret_hash: row.host_secret_hash,
    seed: row.seed,
    questions: row.questions,
    answer_key: row.answer_key,
    total: row.total,
    end_mode: row.end_mode,
    time_limit_min: row.time_limit_min,
  });
  if (error) throw new Error(`Xona yaratishda xato: ${error.message}`);
  return {
    code,
    hostSecret,
    invitePath: `/o/duo/${code}`,
    expiresAt: new Date(row.expires_at).toISOString(),
  };
}

export type RoomJoinError = "not_found" | "expired" | "taken" | "cancelled";

export async function getRoom(code: string): Promise<RoomRow | null> {
  const normalized = (code ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4,10}$/.test(normalized)) return null;
  if (!isSupabase()) {
    const row = demo().rooms.get(normalized);
    if (!row) return null;
    if (row.status !== "finished" && row.status !== "cancelled" && Date.now() > row.expires_at) {
      row.status = "cancelled";
    }
    return row;
  }
  const res = await sb().from("game_rooms").select("*").eq("id", normalized).maybeSingle();
  if (!res.data) return null;
  const row = res.data as
    | (Omit<RoomRow, "expires_at" | "questions" | "answer_key"> & {
        expires_at: string;
        questions: ServerQuestion[];
        answer_key: QuestionAnswer[];
      })
    | null;
  if (!row) return null;
  const parsed: RoomRow = {
    ...row,
    end_mode: row.end_mode ?? "questions",
    time_limit_min: row.time_limit_min ?? null,
    winner_slot: row.winner_slot ?? null,
    expires_at: new Date(row.expires_at).getTime(),
  };
  if (parsed.status !== "finished" && parsed.status !== "cancelled" && Date.now() > parsed.expires_at) {
    parsed.status = "cancelled";
  }
  return parsed;
}

/** Mehmon qo'shilishi — uchinchi o'yinchi QABUL QILINMAYDI */
export async function joinRoom(
  code: string,
  nickname: string,
  studentId: string | null
): Promise<{ ok: true; guestSecret: string; room: RoomRow } | { ok: false; error: RoomJoinError }> {
  const room = await getRoom(code);
  if (!room) return { ok: false, error: "not_found" };
  if (room.status === "cancelled") return { ok: false, error: "cancelled" };
  if (Date.now() > room.expires_at) return { ok: false, error: "expired" };
  if (room.guest_secret_hash) return { ok: false, error: "taken" };

  const guestSecret = randomSecret();
  const now = new Date().toISOString();
  room.guest_name = nickname;
  room.guest_student_id = studentId;
  room.guest_secret_hash = sha256(guestSecret);
  room.updated_at = now;

  if (!isSupabase()) return { ok: true, guestSecret, room };

  const res = await sb()
    .from("game_rooms")
    .update({
      guest_name: nickname,
      guest_student_id: studentId,
      guest_secret_hash: room.guest_secret_hash,
      updated_at: now,
    })
    .eq("id", room.id)
    .is("guest_secret_hash", null) // parallel qo'shilishda faqat BITTA yutuqqa erishadi
    .select("id");
  // Boshqa sessiya bir vaqtda qo'shilgan bo'lsa — yangilanish bo'sh qaytadi
  if (res.error || (res.data?.length ?? 0) === 0) {
    return { ok: false, error: "taken" };
  }
  return { ok: true, guestSecret, room };
}

/** Host "Boshlash" — xona holati playing bo'ladi.
 *  Do'st hali qo'shilmagan bo'lsa HAM boshlash mumkin (qotib qolishning
 *  oldini olish uchun) — do'st keyin qo'shiladi va o'ynay oladi. */
export async function startRoom(code: string, slot: "host" | "guest", secret: string): Promise<boolean> {
  const room = await getRoom(code);
  if (!room) return false;
  if (!secretMatches(room, slot, secret)) return false;
  if (slot !== "host") return false;
  if (room.status !== "waiting") return false;
  room.status = "playing";
  room.updated_at = new Date().toISOString();
  if (!isSupabase()) return true;
  const { error } = await sb()
    .from("game_rooms")
    .update({ status: "playing", updated_at: room.updated_at })
    .eq("id", room.id)
    .eq("status", "waiting");
  return !error;
}

function secretMatches(room: RoomRow, slot: "host" | "guest", secret: string): boolean {
  const hash = slot === "host" ? room.host_secret_hash : room.guest_secret_hash;
  return Boolean(hash) && hash === sha256(secret);
}

export async function verifyRoomSlot(
  code: string,
  slot: "host" | "guest",
  secret: string
): Promise<RoomRow | null> {
  const room = await getRoom(code);
  if (!room) return null;
  if (!secretMatches(room, slot, secret)) return null;
  return room;
}

export interface RoomAnswerOutcome {
  ok: boolean;
  correct: boolean;
  score: number;
  answered: number;
  problem?: string;
}

export async function recordRoomAnswer(
  code: string,
  slot: "host" | "guest",
  secret: string,
  qIndex: number,
  choice: number | number[]
): Promise<RoomAnswerOutcome> {
  const room = await getRoom(code);
  if (!room || room.status !== "playing") {
    return { ok: false, correct: false, score: 0, answered: 0, problem: "Xona faol emas." };
  }
  if (!secretMatches(room, slot, secret)) {
    return { ok: false, correct: false, score: 0, answered: 0, problem: "Ruxsat yo'q." };
  }

  const answer = room.answer_key[qIndex];
  const correct =
    Array.isArray(answer) && Array.isArray(choice)
      ? answer.length === choice.length && answer.every((v, i) => v === choice[i])
      : !Array.isArray(answer) && !Array.isArray(choice)
        ? answer === choice
        : false;

  const prev = await getProgress(room.id, slot);
  const score = prev.score + (correct ? 1 : 0);
  const answered = Math.min(room.total, Math.max(prev.answered, qIndex + 1));
  await upsertProgress(room.id, slot, { score, answered, done: false, attempt_id: prev.attempt_id });
  return { ok: true, correct, score, answered };
}

export async function getProgress(roomId: string, slot: "host" | "guest"): Promise<ProgressRow> {
  const key = `${roomId}:${slot}`;
  if (!isSupabase()) {
    return demo().progress.get(key) ?? emptyProgress(roomId, slot);
  }
  const res = await sb()
    .from("game_room_progress")
    .select("*")
    .eq("room_id", roomId)
    .eq("player", slot)
    .maybeSingle();
  const row = res.data as { score: number; answered: number; done: boolean; attempt_id: string } | null;
  if (!row) return emptyProgress(roomId, slot);
  return {
    room_id: roomId,
    player: slot,
    score: row.score,
    answered: row.answered,
    done: row.done,
    attempt_id: row.attempt_id ?? "",
    updated_at: new Date().toISOString(),
  };
}

function emptyProgress(roomId: string, slot: "host" | "guest"): ProgressRow {
  return { room_id: roomId, player: slot, score: 0, answered: 0, done: false, attempt_id: "", updated_at: new Date().toISOString() };
}

async function upsertProgress(
  roomId: string,
  slot: "host" | "guest",
  patch: Partial<Pick<ProgressRow, "score" | "answered" | "done" | "attempt_id">>
): Promise<void> {
  const current = await getProgress(roomId, slot);
  const next: ProgressRow = { ...current, ...patch, updated_at: new Date().toISOString() };
  if (!isSupabase()) {
    demo().progress.set(`${roomId}:${slot}`, next);
    return;
  }
  await sb().from("game_room_progress").upsert(
    {
      room_id: roomId,
      player: slot,
      score: next.score,
      answered: next.answered,
      done: next.done,
      attempt_id: next.attempt_id,
      updated_at: next.updated_at,
    },
    { onConflict: "room_id,player" }
  );
}

export interface RoomFinishOutcome {
  ok: boolean;
  outcome?: FinishOutcome;
  problem?: string;
}

/** Bir o'yinchi xonadagi o'yinini yakunlaydi → O'Z natijasi saqlanadi */
export async function finishRoomPlayer(
  code: string,
  slot: "host" | "guest",
  secret: string,
  timeSec: number,
  attemptId: string
): Promise<RoomFinishOutcome> {
  const room = await getRoom(code);
  if (!room) return { ok: false, problem: "Xona topilmadi." };
  if (!secretMatches(room, slot, secret)) return { ok: false, problem: "Ruxsat yo'q." };

  const prev = await getProgress(room.id, slot);
  if (prev.done && prev.attempt_id === attemptId) {
    const existing = await getResultById(attemptId);
    return {
      ok: true,
      outcome: {
        saved: Boolean(existing),
        alreadySaved: true,
        score: existing?.score ?? prev.score,
        total: room.total,
        percent: existing?.percent ?? percentOf(prev.score, room.total),
      },
    };
  }

  await upsertProgress(room.id, slot, { done: true, attempt_id: attemptId });

  // POYGA: birinchi tugatgan g'olib (guarded update — parallel tugashda FAQAT bittasi)
  if (room.end_mode === "race" && !room.winner_slot) {
    if (!isSupabase()) {
      const r = demo().rooms.get(room.id);
      if (r && !r.winner_slot) r.winner_slot = slot;
    } else {
      await sb()
        .from("game_rooms")
        .update({ winner_slot: slot, updated_at: new Date().toISOString() })
        .eq("id", room.id)
        .is("winner_slot", null);
    }
  }

  const studentId = slot === "host" ? room.host_student_id : room.guest_student_id;
  const result = buildResultRow({
    attemptId,
    studentId,
    gameKey: room.game_key,
    gameTitle: room.game_title,
    gameType: room.game_type,
    score: prev.score,
    total: room.total,
    timeSec,
    mode: "duo",
  });

  let saved = false;
  try {
    const r = await saveResultIdempotent(result);
    saved = r.saved;
  } catch {
    saved = false;
  }

  // Ikkala o'yinchi tugatsa xona finished bo'ladi (bir martalik update)
  const host = await getProgress(room.id, "host");
  const guest = await getProgress(room.id, "guest");
  if (host.done && guest.done && room.status === "playing") {
    room.status = "finished";
    room.finished_at = new Date().toISOString();
    if (!isSupabase()) {
      // demo: allaqachon yangilangan
    } else {
      await sb()
        .from("game_rooms")
        .update({ status: "finished", finished_at: room.finished_at, updated_at: room.finished_at })
        .eq("id", room.id)
        .eq("status", "playing");
    }
  }

  return {
    ok: true,
    outcome: {
      saved,
      alreadySaved: !saved,
      score: prev.score,
      total: room.total,
      percent: percentOf(prev.score, room.total),
      problem: saved ? undefined : "Natijani saqlab bo'lmadi.",
    },
  };
}

export async function roomStateFor(code: string, slot: "host" | "guest"): Promise<RoomStateView | null> {
  const room = await getRoom(code);
  if (!room) return null;
  const host = await getProgress(room.id, "host");
  const guest = await getProgress(room.id, "guest");
  const mine = slot === "host" ? host : guest;
  const other = slot === "host" ? guest : host;
  return {
    status: room.status,
    slot,
    guestJoined: Boolean(room.guest_secret_hash),
    myScore: mine.score,
    myAnswered: mine.answered,
    myDone: mine.done,
    opponentScore: slot === "host" ? (room.guest_secret_hash ? guest.score : null) : host.score,
    opponentDone: slot === "host" ? guest.done : host.done,
    expired: room.status === "cancelled",
    total: room.total,
    endMode: room.end_mode,
    timeLimitMin: room.time_limit_min,
    winnerSlot: room.winner_slot,
  };
}

export async function cancelRoom(code: string, slot: "host" | "guest", secret: string): Promise<boolean> {
  const room = await getRoom(code);
  if (!room || slot !== "host" || !secretMatches(room, slot, secret)) return false;
  room.status = "cancelled";
  room.updated_at = new Date().toISOString();
  if (!isSupabase()) return true;
  const { error } = await sb()
    .from("game_rooms")
    .update({ status: "cancelled", updated_at: room.updated_at })
    .eq("id", room.id);
  return !error;
}

// ---------------------------------------------------------------------------
// URL yordamchisi
// ---------------------------------------------------------------------------

export function linkUrl(token: string, baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/o/${token}`;
}
