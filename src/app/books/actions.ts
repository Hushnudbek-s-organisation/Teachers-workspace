"use server";

// ============================================================================
// "Kitoblar" moduli server amallari
//   • PDF/matn yuklash (bo'lak-bo'lak) → mavzular → o'yinlar
//   • kitobni o'chirish / o'yinlarini qayta yasash
//   • o'yin natijasini saqlash
// ============================================================================

import { revalidatePath } from "next/cache";
import { normalizeGrade, TEXT_PAGE_CHARS } from "@/lib/config";
import type { BookPage } from "@/lib/books/segment";
import type { GameResult, GameType, SubjectKey } from "@/lib/books/types";
import {
  appendPages,
  deleteBook,
  finishUpload,
  getBook,
  ingestBook,
  saveBook,
  saveResult,
  startUpload,
} from "@/lib/books/store";

export interface UploadMeta {
  title: string;
  grade: number;
  subject?: SubjectKey;
  fileName: string;
  sizeBytes: number;
  kind: "pdf" | "matn";
}

export async function actionStartUpload(meta: UploadMeta): Promise<{ uploadId: string }> {
  const uploadId = startUpload({
    title: meta.title,
    grade: meta.grade,
    subject: meta.subject,
    fileName: meta.fileName,
    sizeBytes: meta.sizeBytes,
    kind: meta.kind,
  });
  return { uploadId };
}

export async function actionAppendPages(
  uploadId: string,
  pages: BookPage[]
): Promise<{ pagesInSession: number }> {
  const pagesInSession = appendPages(uploadId, pages);
  return { pagesInSession };
}

export async function actionFinishUpload(
  uploadId: string
): Promise<{ bookId: string; topics: number; games: number; strategy: string; notes: string[] }> {
  const { book, report } = finishUpload(uploadId);
  await saveBook(book);
  revalidatePath("/books");
  return {
    bookId: book.id,
    topics: book.stats.topics,
    games: book.stats.games,
    strategy: report.strategy,
    notes: report.notes,
  };
}

/** Bir yo'la matn joylash (skanerlangan PDF uchun alternativa) */
export async function actionCreateFromText(input: {
  title: string;
  grade: number;
  subject?: SubjectKey;
  text: string;
  fileName?: string;
}): Promise<{ bookId: string; topics: number; games: number }> {
  const text = input.text.replace(/\r\n?/g, "\n");
  // Matnni bir xil hajmdagi "sahifa"larga bo'lamiz
  const pages: BookPage[] = [];
  let page = 1;
  for (let i = 0; i < text.length; i += TEXT_PAGE_CHARS) {
    const chunk = text.slice(i, i + TEXT_PAGE_CHARS);
    if (chunk.trim().length === 0) continue;
    pages.push({ page, text: chunk });
    page++;
  }
  if (!pages.length) throw new Error("Matn bo'sh.");

  const { book, report } = ingestBook({
    title: input.title,
    grade: normalizeGrade(input.grade),
    subject: input.subject,
    fileName: input.fileName || `${input.title}.txt`,
    sizeBytes: text.length,
    kind: "matn",
    pages,
  });
  await saveBook(book);
  revalidatePath("/books");
  return { bookId: book.id, topics: book.stats.topics, games: report.topics };
}

export async function actionDeleteBook(bookId: string): Promise<{ ok: boolean }> {
  const ok = await deleteBook(bookId);
  revalidatePath("/books");
  return { ok };
}

export async function actionSaveResult(
  result: Omit<GameResult, "id" | "createdAt">
): Promise<{ ok: boolean }> {
  await saveResult(result);
  revalidatePath(`/books/${result.bookId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Bir qurilmada 2–3 kishi o'ynaganda har o'yinchining natijasi ALOHIDA yozuv
// bo'lib saqlanadi. Bu amal hech qachon throw qilmaydi: har yozuv alohida
// uriniladi, xatolar `problems` ro'yxatida qaytadi (ekranda ko'rsatiladi).
// ---------------------------------------------------------------------------

export interface PlayerResultEntry {
  /** Haqiqiy kitob id; o'qituvchi o'yini kitobga bog'lanmagan bo'lsa — null */
  bookId: string | null;
  topicId: string;
  topicTitle: string;
  gameId: string;
  gameTitle: string;
  gameType: GameType;
  studentId: string | null;
  studentName: string | null;
  score: number;
  total: number;
  timeSec: number;
}

export interface SaveResultsOutcome {
  ok: boolean;
  saved: number;
  problems: string[];
}

export async function actionSaveGameResults(
  entries: PlayerResultEntry[]
): Promise<SaveResultsOutcome> {
  const list = Array.isArray(entries) ? entries.filter(Boolean) : [];
  const problems: string[] = [];
  let saved = 0;

  for (const entry of list) {
    try {
      const score = Math.max(0, Math.round(Number(entry.score) || 0));
      const total = Math.max(0, Math.round(Number(entry.total) || 0));
      // `game_results.book_id` — books(id) ga bog'langan ustun. Kitob haqiqiy
      // bo'lmasa (masalan o'qituvchi o'yini) ustun bo'sh (NULL) qoldiriladi:
      // `undefined` qiymat so'rov tanasiga tushmaydi.
      const real = entry.bookId ? await getBook(entry.bookId) : null;
      const bookId = (real ? entry.bookId : undefined) as unknown as string;
      await saveResult({
        bookId,
        topicId: entry.topicId ?? "",
        topicTitle: entry.topicTitle ?? "",
        gameId: entry.gameId,
        gameTitle: entry.gameTitle,
        gameType: entry.gameType,
        studentId: entry.studentId ?? null,
        studentName: (entry.studentName ?? "").trim() || null,
        score,
        total,
        timeSec: Math.max(0, Math.round(Number(entry.timeSec) || 0)),
      });
      saved += 1;
    } catch (err) {
      problems.push(err instanceof Error ? err.message : String(err));
    }
  }

  try {
    revalidatePath("/games/stats");
    revalidatePath("/books");
    const book = list.find((e) => e.bookId)?.bookId;
    if (book) revalidatePath(`/books/${book}`);
  } catch {
    // revalidate muvaffaqiyatsiz bo'lsa natija baribir saqlangan
  }

  return { ok: saved > 0 || list.length === 0, saved, problems };
}
