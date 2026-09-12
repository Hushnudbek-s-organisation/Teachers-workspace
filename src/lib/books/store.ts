import "server-only";

// ============================================================================
// Kitoblarni saqlash qatlami
//
//   • Supabase sozlangan bo'lsa — `books` / `game_results` jadvallarida
//   • Aks holda (.data papkasi mavjud bo'lsa) — fayllarda: `.data/books/*.json`
//     va `.data/game-results.json`
//
// Diqqat: fayl tizimi serverda saqlanadi (Vercel kabi "read-only" muhitlarda
// Supabase'ga ko'chirish kerak — README'ga qarang).
// ============================================================================

import fs from "node:fs/promises";
import path from "node:path";
import type {
  Book,
  BookMeta,
  BookSource,
  GameResult,
  SubjectKey,
  Topic,
} from "./types";
import { SUBJECTS, guessSubject } from "./types";
import { analyzeTopic, extractAuthorPairs, type BookLevelPair } from "./generate";
import { extractDefinitions } from "./extract";
import { segmentBook, type BookPage, type SegmentReport } from "./segment";
import { cleanExtractedText, keyphrases } from "./text";
import { BOOK_KEYWORD_POOL, MAX_SAVED_RESULTS, UPLOAD_SESSION_TTL_MS } from "../config";
import { isSupabaseConfigured } from "../repo";
import {
  dbDeleteBook,
  dbGetBook,
  dbListBookMetas,
  dbListBooks,
  dbListResults,
  dbSaveBook,
  dbSaveResult,
} from "./db";

const DATA_DIR = path.join(process.cwd(), ".data");
const BOOKS_DIR = path.join(DATA_DIR, "books");
const RESULTS_FILE = path.join(DATA_DIR, "game-results.json");

// ------------------------------- Yordamchilar -------------------------------

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJson(file: string, data: unknown) {
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, JSON.stringify(data), "utf8");
}

function toMeta(book: Book): BookMeta {
  return {
    id: book.id,
    title: book.title,
    grade: book.grade,
    subject: book.subject,
    subjectLabel: book.subjectLabel,
    author: book.author,
    createdAt: book.createdAt,
    source: book.source,
    stats: book.stats,
    topicTitles: book.topics.slice(0, 6).map((t) => t.title),
  };
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ʻʼ‘’`']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

// ------------------------------ Kitoblar ro'yxati ---------------------------

export async function listUploadedBooks(): Promise<Book[]> {
  if (isSupabaseConfigured()) return dbListBooks();
  try {
    await ensureDir(BOOKS_DIR);
    const files = await fs.readdir(BOOKS_DIR);
    const books: Book[] = [];
    for (const f of files.filter((f) => f.endsWith(".json"))) {
      const b = await readJson<Book>(path.join(BOOKS_DIR, f));
      if (b) books.push(b);
    }
    return books.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export async function listBookMetas(): Promise<BookMeta[]> {
  if (isSupabaseConfigured()) return dbListBookMetas();
  const uploaded = await listUploadedBooks();
  return uploaded.map(toMeta);
}

export async function getBook(id: string): Promise<Book | null> {
  if (isSupabaseConfigured()) return dbGetBook(id);
  return readJson<Book>(path.join(BOOKS_DIR, `${slugify(id)}.json`));
}

export async function deleteBook(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) return dbDeleteBook(id);
  const file = path.join(BOOKS_DIR, `${slugify(id)}.json`);
  try {
    await fs.unlink(file);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// INGEST — PDF/matn → mavzular → o'yinlar
// ---------------------------------------------------------------------------

export interface IngestInput {
  title: string;
  grade: number;
  subject?: SubjectKey;
  author?: string;
  fileName: string;
  sizeBytes: number;
  kind: "pdf" | "matn";
  /** 1 dan boshlanadigan sahifalar */
  pages: BookPage[];
}

export interface IngestResult {
  book: Book;
  report: SegmentReport;
}

/**
 * Kitobni to'liq qayta ishlaydi:
 *   1. Matnni tozalash
 *   2. Mavzularga bo'lish (mundarija → sarlavha → fallback)
 *   3. Har bir mavzu uchun misol/qoida/ta'riflarni ajratish
 *   4. Har bir mavzu uchun fan bo'yicha o'yinlar yasash
 */
export function ingestBook(input: IngestInput): IngestResult {
  const pages: BookPage[] = input.pages
    .map((p) => ({ page: p.page, text: cleanExtractedText(p.text ?? "") }))
    .filter((p) => p.text.length > 0);

  const rawTitle = input.title?.trim() || input.fileName.replace(/\.[^.]+$/, "");
  const subject = input.subject && input.subject !== "boshqa" ? input.subject : guessSubject(`${rawTitle} ${input.fileName}`);

  const { topics: rawTopics, report } = segmentBook(pages, rawTitle);
  const id = `${slugify(rawTitle) || "kitob"}-${Date.now().toString(36)}`;

  // Kitob darajasidagi materiallar (barcha mavzular uchun kontekst)
  const fullText = pages.map((p) => p.text).join("\n");
  const authorPairs: BookLevelPair[] = extractAuthorPairs(fullText, 24);
  const allDefs = extractDefinitions(fullText, 40);

  // Kitobning umumiy so'z boyligi — mavzular orasida "chalg'ituvchi" variantlar uchun
  const bookKeywords = keyphrases(fullText, BOOK_KEYWORD_POOL);

  const isReading = subject === "oqish";
  const isForeign = subject === "ingliz-tili" || subject === "rus-tili";

  const topics: Topic[] = rawTopics.map((raw, i) => {
    const topic = analyzeTopic(raw, subject, slugify(rawTitle) || "kitob", {
      otherDefs: allDefs,
      authorPairs,
      poolWords: bookKeywords,
    });
    topic.index = i + 1;

    // Fan uchun mos bo'lmagan o'yinlarni olib tashlaymiz
    topic.games = topic.games.filter((g) => {
      if (g.type === "matching" && isReading && g.title !== "Asar va muallif") return false;
      if (g.type === "order" && isForeign && g.title === "Alifbo tartibi") return false;
      return true;
    });

    // Faqat "avtomatik" nomlangan bo'laklarga matndan qo'shimcha izoh qo'shamiz
    if (/^\d+-mavzu \([\d–-]+-betlar\)$/.test(topic.title)) {
      const firstWords = topic.text
        .split(/\n+/)[0]
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 60);
      if (firstWords.length > 12) topic.title = `${topic.title}: ${firstWords}`;
    }
    return topic;
  });

  const stats = {
    topics: topics.length,
    games: topics.reduce((s, t) => s + t.games.length, 0),
    items: topics.reduce((s, t) => s + t.games.reduce((a, g) => a + g.items.length, 0), 0),
    pages: pages.length || input.pages.length,
    chars: report.chars,
  };

  const source: BookSource = {
    kind: input.kind,
    fileName: input.fileName,
    sizeBytes: input.sizeBytes,
    pages: input.pages.length,
    chars: report.chars,
    scanWarn: report.scannedPdf,
  };

  const book: Book = {
    id,
    title: rawTitle,
    grade: input.grade,
    subject,
    subjectLabel: SUBJECTS[subject].label,
    language: subject === "ingliz-tili" ? "en" : subject === "rus-tili" ? "ru" : "uz",
    author: input.author,
    source,
    createdAt: new Date().toISOString(),
    topics,
    stats,
  };

  return { book, report };
}

export async function saveBook(book: Book): Promise<void> {
  if (isSupabaseConfigured()) return dbSaveBook(book);
  await writeJson(path.join(BOOKS_DIR, `${slugify(book.id)}.json`), book);
}

// ---------------------------------------------------------------------------
// Yuklash sessiyasi (200 betli kitob ham bo'lak-bo'lak yuboriladi)
// ---------------------------------------------------------------------------

interface UploadSession {
  id: string;
  title: string;
  grade: number;
  subject?: SubjectKey;
  fileName: string;
  sizeBytes: number;
  kind: "pdf" | "matn";
  pages: BookPage[];
  createdAt: number;
}

/**
 * Yuklash sessiyalari — global ob'ektda saqlanadi.
 * Sabab: ishlab chiqish rejimida modul qayta yuklansa (HMR), oddiy Map
 * o'chib ketadi va uzoq yuklash "sessiya topilmadi" xatosi bilan tugaydi.
 */
const globalStore = globalThis as unknown as { __bookUploadSessions?: Map<string, UploadSession> };
const sessions: Map<string, UploadSession> =
  globalStore.__bookUploadSessions ?? (globalStore.__bookUploadSessions = new Map());

function gcSessions() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.createdAt > UPLOAD_SESSION_TTL_MS) sessions.delete(id);
  }
}

export function startUpload(input: Omit<UploadSession, "id" | "pages" | "createdAt">): string {
  gcSessions();
  const id = `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  sessions.set(id, { ...input, id, pages: [], createdAt: Date.now() });
  return id;
}

export function appendPages(id: string, pages: BookPage[]): number {
  const s = sessions.get(id);
  if (!s) throw new Error("Yuklash sessiyasi topilmadi (eskirgan bo'lishi mumkin).");
  const byPage = new Map(s.pages.map((p) => [p.page, p]));
  for (const p of pages) {
    if (!p || typeof p.page !== "number") continue;
    byPage.set(p.page, { page: p.page, text: String(p.text ?? "") });
  }
  s.pages = [...byPage.values()].sort((a, b) => a.page - b.page);
  return s.pages.length;
}

export function finishUpload(id: string): { book: Book; report: SegmentReport } {
  const s = sessions.get(id);
  if (!s) throw new Error("Yuklash sessiyasi topilmadi.");
  const result = ingestBook({
    title: s.title,
    grade: s.grade,
    subject: s.subject,
    fileName: s.fileName,
    sizeBytes: s.sizeBytes,
    kind: s.kind,
    pages: s.pages,
  });
  sessions.delete(id);
  return result;
}

// ---------------------------------------------------------------------------
// O'yin natijalari
// ---------------------------------------------------------------------------

export async function listResults(bookId?: string): Promise<GameResult[]> {
  if (isSupabaseConfigured()) return dbListResults(bookId);
  const all = (await readJson<GameResult[]>(RESULTS_FILE)) ?? [];
  const filtered = bookId ? all.filter((r) => r.bookId === bookId) : all;
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveResult(result: Omit<GameResult, "id" | "createdAt">): Promise<GameResult> {
  if (isSupabaseConfigured()) {
    const full: GameResult = {
      ...result,
      id: `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    await dbSaveResult(full);
    return full;
  }
  const all = (await readJson<GameResult[]>(RESULTS_FILE)) ?? [];
  const full: GameResult = {
    ...result,
    id: `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  all.push(full);
  // Fayl cheksiz o'smasligi uchun oxirgi 2000 natijani saqlaymiz
  await writeJson(RESULTS_FILE, all.slice(-MAX_SAVED_RESULTS));
  return full;
}

export interface LeaderRow {
  name: string;
  played: number;
  correct: number;
  total: number;
  percent: number;
  lastAt: string;
}

/** Kitob (yoki butun tizim) bo'yicha eng yaxshi natijalar */
export async function leaderboard(bookId?: string, limit = 10): Promise<LeaderRow[]> {
  const results = await listResults(bookId);
  const byName = new Map<string, LeaderRow>();
  for (const r of results) {
    const name = r.studentName?.trim() || "Mehmon";
    const row = byName.get(name) ?? { name, played: 0, correct: 0, total: 0, percent: 0, lastAt: r.createdAt };
    row.played += 1;
    row.correct += r.score;
    row.total += r.total;
    row.lastAt = row.lastAt > r.createdAt ? row.lastAt : r.createdAt;
    row.percent = row.total ? Math.round((row.correct / row.total) * 100) : 0;
    byName.set(name, row);
  }
  return [...byName.values()].sort((a, b) => b.percent - a.percent || b.played - a.played).slice(0, limit);
}
