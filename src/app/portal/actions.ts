"use server";

// ============================================================================
// PORTAL SERVER AMALLARI — o'quvchi shaxsiy linkidan ishlaydigan o'yin API'i.
//
// HARBIR amal:
//   • Tokenni/xona maxfiy kalitini SERVERDA tekshiradi
//   • Javob kalitini brauzerga CHIQARMAYDI (faqat to'g'ri/xato javobi)
//   • Ballni SERVERDA hisoblaydi — mijoz yuborgan ballga ishonmaydi
//   • O'quvchi ID'si faqat token/sessiyadan olinadi
// ============================================================================

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { resolveCatalogGame } from "@/lib/portal/catalog";
import { portalInfoFor } from "@/lib/portal/catalog";
import { getBaseUrl } from "@/lib/base-url";
import {
  createGameSession,
  createRoom,
  cancelRoom,
  checkSessionAnswer,
  finishGameSession,
  finishRoomPlayer,
  getGameSession,
  getRoom,
  joinRoom,
  recordRoomAnswer,
  resolveStudentByToken,
  roomStateFor,
  startRoom,
  verifyRoomSlot,
  type RoomJoinError,
} from "@/lib/portal/store";
import type {
  AnswerFeedback,
  FinishOutcome,
  PortalQuestion,
  PortalSessionView,
  RoomStateView,
} from "@/lib/portal/types";

const STUDENT_COOKIE = "tw_student";
const ROOM_COOKIE_PREFIX = "tw_room_";
const ROOM_COOKIE_TTL = 60 * 60 * 3; // 3 soat (xona muddatidan uzun)

// ---------------------------------------------------------------------------
// Shaxsiy link → o'quvchi (barcha amallarning asosi)
// ---------------------------------------------------------------------------

async function requireStudent(token: string) {
  const student = await resolveStudentByToken(token);
  if (!student) throw new Error("Link yaroqsiz yoki bekor qilingan.");
  return student;
}

/** O'quvchi linkini ochgan brauzerga sessiya cookie'si (duo avtomatik bog'lash uchun) */
async function rememberStudentCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(STUDENT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function actionPortalVisit(token: string): Promise<{ ok: boolean }> {
  const student = await resolveStudentByToken(token);
  if (!student) return { ok: false };
  await rememberStudentCookie(token);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Yakka o'yin sessiyasi
// ---------------------------------------------------------------------------

export async function actionPortalStartGame(
  token: string,
  gameKey: string
): Promise<{ ok: true; session: PortalSessionView } | { ok: false; error: string }> {
  try {
    const student = await requireStudent(token);
    await rememberStudentCookie(token);
    const seed = Math.floor(Math.random() * 2_000_000_000);
    const game = await resolveCatalogGame(gameKey, seed);
    if (!game || !game.questions.length) return { ok: false, error: "O'yin topilmadi yoki savollar tayyor emas." };

    const session = await createGameSession({
      studentId: student.id,
      gameKey,
      gameTitle: game.title,
      gameType: game.gameType,
      mode: "solo",
      questions: game.questions,
    });

    return {
      ok: true,
      session: {
        sessionId: session.id,
        title: game.title,
        instructions: game.instructions,
        emoji: game.emoji,
        boardKind: game.boardKind,
        questions: game.questions.map((sq) => sq.q),
        mode: "solo",
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Xatolik yuz berdi." };
  }
}

export async function actionPortalAnswer(
  token: string,
  sessionId: string,
  qIndex: number,
  choice: number | number[]
): Promise<{ ok: true; feedback: AnswerFeedback } | { ok: false; error: string }> {
  try {
    const student = await requireStudent(token);
    const session = await getGameSession(sessionId);
    if (!session) return { ok: false, error: "Sessiya topilmadi." };
    if (session.student_id !== student.id) return { ok: false, error: "Ruxsat yo'q." };
    if (session.status !== "active") return { ok: false, error: "Sessiya yakunlangan yoki muddati tugagan." };
    if (qIndex < 0 || qIndex >= session.answer_key.length) return { ok: false, error: "Savol topilmadi." };

    const { correct } = await checkSessionAnswer(session, qIndex, choice);

    // Javob berilgandan keyingina to'g'ri javob ko'rsatiladi (feedback uchun)
    const answer = session.answer_key[qIndex];
    const answerIndex = typeof answer === "number" ? answer : undefined;

    return { ok: true, feedback: { correct, answerIndex } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Xatolik yuz berdi." };
  }
}

export async function actionPortalFinish(
  token: string,
  sessionId: string,
  timeSec: number,
  attemptId: string
): Promise<{ ok: true; outcome: FinishOutcome } | { ok: false; error: string }> {
  try {
    const student = await requireStudent(token);
    const session = await getGameSession(sessionId);
    if (!session) return { ok: false, error: "Sessiya topilmadi." };
    if (session.student_id !== student.id) return { ok: false, error: "Ruxsat yo'q." };

    const { outcome } = await finishGameSession(session, attemptId, timeSec, "");
    if (outcome.saved || outcome.alreadySaved) revalidatePath("/games/stats");
    return { ok: true, outcome };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Xatolik yuz berdi." };
  }
}

// ---------------------------------------------------------------------------
// Do'stim bilan o'ynash — xona (host oqimi)
// ---------------------------------------------------------------------------

function roomCookieName(code: string): string {
  return `${ROOM_COOKIE_PREFIX}${code}`;
}

/** Duo uchun savollar — ikkala o'yinchiga bir xil (bir xil seed) */
async function questionsForRoom(gameKey: string) {
  const seed = Math.floor(Math.random() * 2_000_000_000);
  const game = await resolveCatalogGame(gameKey, seed);
  if (!game || !game.questions.length) return null;
  return game;
}

export async function actionPortalCreateRoom(
  token: string,
  gameKey: string
): Promise<{ ok: true; code: string; inviteUrl: string; expiresAt: string } | { ok: false; error: string }> {
  try {
    const student = await requireStudent(token);
    const game = await questionsForRoom(gameKey);
    if (!game) return { ok: false, error: "O'yin topilmadi yoki savollar tayyor emas." };

    const baseUrl = await getBaseUrl();
    const room = await createRoom({
      hostStudentId: student.id,
      hostName: portalInfoFor(student).firstName || "Do'st",
      gameKey,
      gameTitle: game.title,
      gameType: game.gameType,
      subject: game.subject,
      grade: game.grade,
      questions: game.questions,
    });

    // Host maxfiy kalit cookie'da — sahifa yangilanganda qayta ulanadi
    const jar = await cookies();
    jar.set(roomCookieName(room.code), room.hostSecret, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ROOM_COOKIE_TTL,
    });

    return {
      ok: true,
      code: room.code,
      inviteUrl: `${baseUrl.replace(/\/+$/, "")}${room.invitePath}`,
      expiresAt: room.expiresAt,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Xatolik yuz berdi." };
  }
}

/** Cookie'dagi maxfiy kalit bo'yicha xona o'yinchisini aniqlash */
async function roomSlotFromCookie(code: string): Promise<
  { ok: true; slot: "host" | "guest"; secret: string } | { ok: false; error: string }
> {
  const jar = await cookies();
  const secret = jar.get(roomCookieName(code))?.value;
  if (!secret) return { ok: false, error: "Bu xonaga kirish maxfiy kaliti yo'q." };
  for (const slot of ["host", "guest"] as const) {
    const room = await verifyRoomSlot(code, slot, secret);
    if (room) return { ok: true, slot, secret };
  }
  return { ok: false, error: "Ruxsat yo'q yoki xona topilmadi." };
}

export async function actionPortalStartRoom(
  code: string
): Promise<{ ok: boolean; error?: string }> {
  const slot = await roomSlotFromCookie(code);
  if (!slot.ok) return { ok: false, error: slot.error };
  if (slot.slot !== "host") return { ok: false, error: "Faqat xona egasi boshlaydi." };
  const ok = await startRoom(code, slot.slot, slot.secret);
  return ok ? { ok: true } : { ok: false, error: "Boshlab bo'lmadi — do'stingiz hali qo'shilmagan bo'lishi mumkin." };
}

export async function actionPortalCancelRoom(
  code: string
): Promise<{ ok: boolean; error?: string }> {
  const slot = await roomSlotFromCookie(code);
  if (!slot.ok) return { ok: false, error: slot.error };
  const ok = await cancelRoom(code, slot.slot, slot.secret);
  return ok ? { ok: true } : { ok: false, error: "Bekor qilinmadi." };
}

export async function actionPortalRoomState(
  code: string
): Promise<{ ok: true; state: RoomStateView } | { ok: false; error: string }> {
  const slot = await roomSlotFromCookie(code);
  if (!slot.ok) return { ok: false, error: slot.error };
  const state = await roomStateFor(code, slot.slot);
  if (!state) return { ok: false, error: "Xona topilmadi." };
  return { ok: true, state };
}

/** Xona o'yinini boshlashda savollarni olish (ikkalasiga bir xil) */
export async function actionPortalRoomQuestions(
  code: string
): Promise<{ ok: true; questions: PortalQuestion[]; total: number } | { ok: false; error: string }> {
  const slot = await roomSlotFromCookie(code);
  if (!slot.ok) return { ok: false, error: slot.error };
  const room = await getRoom(code);
  if (!room) return { ok: false, error: "Xona topilmadi." };
  if (room.status !== "playing") return { ok: false, error: "O'yin hali boshlanmagan." };
  return {
    ok: true,
    questions: room.questions.map((sq) => sq.q),
    total: room.total,
  };
}

// ---------------------------------------------------------------------------
// Mehmon (guest) oqimi — taklif linki (/o/duo/<kod>)
// ---------------------------------------------------------------------------

export interface JoinRoomResult {
  ok: boolean;
  error?: string;
  slot?: "host" | "guest";
  status?: RoomStateView["status"];
  gameTitle?: string;
  total?: number;
}

const JOIN_ERRORS: Record<RoomJoinError, string> = {
  not_found: "Xona topilmadi — kodni tekshirib, yana urinib ko'ring.",
  expired: "Taklif muddati tugagan. Do'stingizdan yangi taklif linki so'rang.",
  taken: "Bu xonada allaqachon o'yinchi bor — xonaga faqat 2 kishi qo'shiladi.",
  cancelled: "Xona bekor qilingan yoki muddati tugagan.",
};

/** Mehmonning o'quvchi sessiyasi (agar bo'lsa) — natija FAQAT o'z profiliga yoziladi */
async function guestStudentId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(STUDENT_COOKIE)?.value;
  if (!token) return null;
  const student = await resolveStudentByToken(token);
  return student?.id ?? null;
}

export async function actionPortalJoinRoom(
  code: string,
  nickname: string,
  studentToken?: string
): Promise<JoinRoomResult> {
  try {
    const clean = (nickname ?? "").trim().slice(0, 24);
    if (!clean) return { ok: false, error: "Taxallusni kiriting." };

    // Mehmon o'z shaxsiy linkini kiritgan bo'lsa — natija o'z profiliga yoziladi
    let linkedStudentId: string | null = null;
    const explicitToken = (studentToken ?? "").trim();
    if (explicitToken) {
      const student = await resolveStudentByToken(explicitToken);
      if (student) {
        linkedStudentId = student.id;
        await rememberStudentCookie(explicitToken);
      }
      // Noto'g'ri token → mehmon sifatida o'ynaydi (xato ko'rsatilmaydi)
    }
    if (!linkedStudentId) linkedStudentId = await guestStudentId();

    const res = await joinRoom(code, clean, linkedStudentId);
    if (!res.ok) return { ok: false, error: JOIN_ERRORS[res.error] };

    const jar = await cookies();
    jar.set(roomCookieName(code), res.guestSecret, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ROOM_COOKIE_TTL,
    });

    const state = await roomStateFor(code, "guest");
    const room = await getRoom(code);
    return {
      ok: true,
      slot: "guest",
      status: state?.status ?? "waiting",
      gameTitle: room?.game_title,
      total: room?.total,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Xatolik yuz berdi." };
  }
}

export async function actionPortalRoomAnswer(
  code: string,
  qIndex: number,
  choice: number | number[]
): Promise<{ ok: true; feedback: AnswerFeedback } | { ok: false; error: string }> {
  const slot = await roomSlotFromCookie(code);
  if (!slot.ok) return { ok: false, error: slot.error };
  const res = await recordRoomAnswer(code, slot.slot, slot.secret, qIndex, choice);
  if (!res.ok) return { ok: false, error: res.problem ?? "Javobni yozib bo'lmadi." };
  return { ok: true, feedback: { correct: res.correct } };
}

export async function actionPortalRoomFinish(
  code: string,
  timeSec: number,
  attemptId: string
): Promise<{ ok: true; outcome: FinishOutcome } | { ok: false; error: string }> {
  const slot = await roomSlotFromCookie(code);
  if (!slot.ok) return { ok: false, error: slot.error };
  const res = await finishRoomPlayer(code, slot.slot, slot.secret, timeSec, attemptId);
  if (!res.ok || !res.outcome) return { ok: false, error: res.problem ?? "Yakunlab bo'lmadi." };
  if (res.outcome.saved || res.outcome.alreadySaved) revalidatePath("/games/stats");
  return { ok: true, outcome: res.outcome };
}

// ---------------------------------------------------------------------------
// Sahifa renderida ishlatiladigan xona holati (cookie asosida)
// ---------------------------------------------------------------------------

export interface RoomPageState {
  found: boolean;
  reason?: "not_found" | "expired" | "taken" | "cancelled";
  slot?: "host" | "guest";
  status?: RoomStateView["status"];
  gameTitle?: string;
  total?: number;
  guestJoined?: boolean;
}

/** /o/duo/<kod> sahifasi: cookie bo'yicha qayta ulanish yoki qo'shilish formasi */
export async function portalRoomPageState(code: string): Promise<RoomPageState> {
  const room = await getRoom(code);
  if (!room) return { found: false, reason: "not_found" };
  if (room.status === "cancelled") return { found: false, reason: "cancelled" };

  const slot = await roomSlotFromCookie(code);
  if (slot.ok) {
    const state = await roomStateFor(code, slot.slot);
    return {
      found: true,
      slot: slot.slot,
      status: state?.status,
      gameTitle: room.game_title,
      total: room.total,
      guestJoined: Boolean(room.guest_secret_hash),
    };
  }

  return {
    found: true,
    status: room.status,
    gameTitle: room.game_title,
    total: room.total,
    guestJoined: Boolean(room.guest_secret_hash),
  };
}
