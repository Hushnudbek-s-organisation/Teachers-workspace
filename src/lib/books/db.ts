import "server-only";

// ============================================================================
// Kitob → O'yin moduli uchun Supabase saqlash qatlami
//
// `.data/*.json` fayllari o'rniga ishlatiladi — Supabase sozlanganda
// (NEXT_PUBLIC_SUPABASE_URL + kalit) avtomatik yoqiladi.
// Jadvallar: books · custom_games · game_results  (supabase/schema.sql)
//
// Vercel kabi "read-only" muhitda fayl tizimi ishlamaydi — shuning uchun
// kitoblarni saqlash uchun bu qatlam kerak.
// ============================================================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Book, BookMeta, GameResult } from "./types";
import type { CustomGame } from "./custom";
import { guardWrite, safeRead, safeReadOne } from "../db-status";
import { supabaseFetch } from "../supabase-fetch";

let cached: SupabaseClient | null = null;

function client(): SupabaseClient {
  if (cached) return cached;
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  ).trim();
  if (!url || !key) {
    throw new Error(
      "Supabase sozlanmagan: .env.local faylida NEXT_PUBLIC_SUPABASE_URL va kalitni to'ldiring."
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: supabaseFetch },
  });
  return cached;
}

function assertOk(result: { error: { message?: string } | null }) {
  if (result.error) throw new Error(`Supabase: ${result.error.message ?? "noma'lum xato"}`);
}

/** Jadval hali yaratilmagan bo'lsa tushunarli xabar beramiz */
function assertSchema(error: { message?: string } | null, table: string) {
  if (!error) return;
  const msg = error.message ?? "";
  if (/does not exist|schema cache/i.test(msg)) {
    throw new Error(
      `Supabase'da "${table}" jadvali topilmadi. supabase/schema.sql faylini SQL Editor'da ishga tushiring.`
    );
  }
  throw new Error(`Supabase: ${msg}`);
}

// ---------------------------------------------------------------------------
// books
// ---------------------------------------------------------------------------

interface BookRow {
  id: string;
  title: string;
  grade: number;
  subject: string;
  subject_label: string;
  language: string;
  author: string | null;
  source: Book["source"];
  stats: Book["stats"];
  topic_titles: string[];
  topics: Book["topics"];
  created_at: string;
}

function rowToBook(row: BookRow): Book {
  return {
    id: row.id,
    title: row.title,
    grade: row.grade,
    subject: row.subject as Book["subject"],
    subjectLabel: row.subject_label || row.subject,
    language: (row.language as Book["language"]) || "uz",
    author: row.author ?? undefined,
    source: row.source,
    stats: row.stats,
    topics: row.topics ?? [],
    createdAt: row.created_at,
  };
}

function rowToMeta(row: BookRow): BookMeta {
  return {
    id: row.id,
    title: row.title,
    grade: row.grade,
    subject: row.subject as BookMeta["subject"],
    subjectLabel: row.subject_label || row.subject,
    author: row.author ?? undefined,
    createdAt: row.created_at,
    source: row.source,
    stats: row.stats,
    topicTitles: row.topic_titles ?? [],
  };
}

export async function dbListBooks(): Promise<Book[]> {
  return safeRead("dbListBooks", async () => {
    const res = await client().from("books").select("*").order("created_at", { ascending: false });
    assertSchema(res.error, "books");
    return ((res.data ?? []) as BookRow[]).map(rowToBook);
  });
}

/** Ro'yxat sahifasi: og'ir `topics` maydonisiz */
export async function dbListBookMetas(): Promise<BookMeta[]> {
  return safeRead("dbListBookMetas", async () => {
    const res = await client()
      .from("books")
      .select("id,title,grade,subject,subject_label,language,author,source,stats,topic_titles,created_at")
      .order("created_at", { ascending: false });
    assertSchema(res.error, "books");
    return ((res.data ?? []) as unknown as BookRow[]).map(rowToMeta);
  });
}

export async function dbGetBook(id: string): Promise<Book | null> {
  return safeReadOne("dbGetBook", async () => {
    const res = await client().from("books").select("*").eq("id", id).maybeSingle();
    assertSchema(res.error, "books");
    return res.data ? rowToBook(res.data as BookRow) : null;
  });
}

export async function dbSaveBook(book: Book): Promise<void> {
  await guardWrite("dbSaveBook", async () => {
  const row: BookRow = {
    id: book.id,
    title: book.title,
    grade: book.grade,
    subject: book.subject,
    subject_label: book.subjectLabel,
    language: book.language,
    author: book.author ?? null,
    source: book.source,
    stats: book.stats,
    topic_titles: book.topics.slice(0, 6).map((t) => t.title),
    topics: book.topics,
    created_at: book.createdAt ?? new Date().toISOString(),
  };
  const res = await client().from("books").upsert(row, { onConflict: "id" });
  assertSchema(res.error, "books");
  });
}

export async function dbDeleteBook(id: string): Promise<boolean> {
  return guardWrite("dbDeleteBook", async () => {
    const res = await client().from("books").delete().eq("id", id).select("id");
    assertSchema(res.error, "books");
    return (res.data?.length ?? 0) > 0;
  });
}

// ---------------------------------------------------------------------------
// game_results
// ---------------------------------------------------------------------------

interface ResultRow {
  id: string;
  book_id: string;
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
  created_at: string;
}

function rowToResult(row: ResultRow): GameResult {
  return {
    id: row.id,
    bookId: row.book_id,
    topicId: row.topic_id ?? "",
    topicTitle: row.topic_title ?? "",
    gameId: row.game_id,
    gameTitle: row.game_title,
    gameType: row.game_type as GameResult["gameType"],
    studentId: row.student_id,
    studentName: row.student_name,
    score: row.score,
    total: row.total,
    timeSec: row.time_sec,
    createdAt: row.created_at,
  };
}

export async function dbListResults(bookId?: string): Promise<GameResult[]> {
  return safeRead("dbListResults", async () => {
    let query = client().from("game_results").select("*").order("created_at", { ascending: false });
    if (bookId) query = query.eq("book_id", bookId);
    const res = await query;
    assertSchema(res.error, "game_results");
    return ((res.data ?? []) as ResultRow[]).map(rowToResult);
  });
}

export async function dbSaveResult(result: GameResult): Promise<void> {
  await guardWrite("dbSaveResult", async () => {
  const res = await client().from("game_results").insert({
    id: result.id,
    book_id: result.bookId,
    topic_id: result.topicId || null,
    topic_title: result.topicTitle || null,
    game_id: result.gameId,
    game_title: result.gameTitle,
    game_type: result.gameType,
    student_id: result.studentId ?? null,
    student_name: result.studentName ?? null,
    score: result.score,
    total: result.total,
    time_sec: result.timeSec,
    created_at: result.createdAt,
  });
  assertSchema(res.error, "game_results");
  });
}

// ---------------------------------------------------------------------------
// custom_games
// ---------------------------------------------------------------------------

interface CustomRow {
  id: string;
  title: string;
  type: string;
  subject: string;
  grade: number;
  instructions: string | null;
  difficulty: number;
  groups: string[] | null;
  items: CustomGame["items"];
  built_from: CustomGame["builtFrom"];
  note: string | null;
  book_id: string | null;
  topic_id: string | null;
  created_at: string;
}

function rowToCustom(row: CustomRow): CustomGame {
  return {
    id: row.id,
    type: row.type as CustomGame["type"],
    title: row.title,
    instructions: row.instructions ?? "",
    difficulty: (row.difficulty as CustomGame["difficulty"]) ?? 2,
    items: row.items ?? [],
    groups: row.groups ?? undefined,
    builtFrom: row.built_from ?? { note: "", pages: [] },
    custom: true,
    createdAt: row.created_at,
    grade: row.grade,
    subject: row.subject as CustomGame["subject"],
    bookId: row.book_id ?? undefined,
    topicId: row.topic_id ?? undefined,
  };
}

export async function dbListCustomGames(bookId?: string): Promise<CustomGame[]> {
  return safeRead("dbListCustomGames", async () => {
    let query = client().from("custom_games").select("*").order("created_at", { ascending: false });
    if (bookId) query = query.eq("book_id", bookId);
    const res = await query;
    assertSchema(res.error, "custom_games");
    return ((res.data ?? []) as CustomRow[]).map(rowToCustom);
  });
}

export async function dbGetCustomGame(id: string): Promise<CustomGame | null> {
  return safeReadOne("dbGetCustomGame", async () => {
    const res = await client().from("custom_games").select("*").eq("id", id).maybeSingle();
    assertSchema(res.error, "custom_games");
    return res.data ? rowToCustom(res.data as CustomRow) : null;
  });
}

export async function dbUpsertCustomGame(game: CustomGame): Promise<void> {
  await guardWrite("dbUpsertCustomGame", async () => {
  const res = await client()
    .from("custom_games")
    .upsert(
      {
        id: game.id,
        title: game.title,
        type: game.type,
        subject: game.subject,
        grade: game.grade,
        instructions: game.instructions ?? null,
        difficulty: game.difficulty ?? 2,
        groups: game.groups ?? null,
        items: game.items,
        built_from: game.builtFrom,
        note: game.builtFrom?.note ?? null,
        book_id: game.bookId ?? null,
        topic_id: game.topicId ?? null,
        created_at: game.createdAt ?? new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  assertSchema(res.error, "custom_games");
  });
}

export async function dbDeleteCustomGame(id: string): Promise<boolean> {
  return guardWrite("dbDeleteCustomGame", async () => {
    const res = await client().from("custom_games").delete().eq("id", id).select("id");
    assertSchema(res.error, "custom_games");
    return (res.data?.length ?? 0) > 0;
  });
}
