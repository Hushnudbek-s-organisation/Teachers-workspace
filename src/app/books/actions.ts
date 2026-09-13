"use server";

// ============================================================================
// "Kitoblar" moduli server amallari
//   • PDF/matn yuklash (bo'lak-bo'lak) → mavzular → o'yinlar
//   • kitobni o'chirish / o'yinlarini qayta yasash
//   • o'yin natijasini saqlash
//
// Har bir amal safeAction() orqali ActionResult qaytaradi — hech qachon
// throw qilinmaydi (500 yo'q), xato client'ga aniq matn + hint boradi.
// ============================================================================

import { revalidatePath } from "next/cache";
import { normalizeGrade, TEXT_PAGE_CHARS } from "@/lib/config";
import type { BookPage } from "@/lib/books/segment";
import type { GameResult, SubjectKey } from "@/lib/books/types";
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
import { safeAction, ValidationError, type ActionResult } from "@/lib/action-result";

export interface UploadMeta {
  title: string;
  grade: number;
  subject?: SubjectKey;
  fileName: string;
  sizeBytes: number;
  kind: "pdf" | "matn";
}

export async function actionStartUpload(meta: UploadMeta): Promise<ActionResult<{ uploadId: string }>> {
  return safeAction(async () => {
    const uploadId = startUpload({
      title: meta.title,
      grade: meta.grade,
      subject: meta.subject,
      fileName: meta.fileName,
      sizeBytes: meta.sizeBytes,
      kind: meta.kind,
    });
    return { uploadId };
  }, "actionStartUpload");
}

export async function actionAppendPages(
  uploadId: string,
  pages: BookPage[]
): Promise<ActionResult<{ pagesInSession: number }>> {
  return safeAction(async () => {
    const pagesInSession = appendPages(uploadId, pages);
    return { pagesInSession };
  }, "actionAppendPages");
}

export async function actionFinishUpload(
  uploadId: string
): Promise<ActionResult<{ bookId: string; topics: number; games: number; strategy: string; notes: string[] }>> {
  return safeAction(async () => {
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
  }, "actionFinishUpload");
}

/** Bir yo'la matn joylash (skanerlangan PDF uchun alternativa) */
export async function actionCreateFromText(input: {
  title: string;
  grade: number;
  subject?: SubjectKey;
  text: string;
  fileName?: string;
}): Promise<ActionResult<{ bookId: string; topics: number; games: number }>> {
  return safeAction(async () => {
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
    if (!pages.length) throw new ValidationError("Matn bo'sh.");

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
  }, "actionCreateFromText");
}

export async function actionDeleteBook(bookId: string): Promise<ActionResult<{ deleted: boolean }>> {
  return safeAction(async () => {
    const deleted = await deleteBook(bookId);
    revalidatePath("/books");
    return { deleted };
  }, "actionDeleteBook");
}

export async function actionSaveResult(
  result: Omit<GameResult, "id" | "createdAt">
): Promise<ActionResult> {
  return safeAction(async () => {
    await saveResult(result);
    revalidatePath(`/books/${result.bookId}`);
  }, "actionSaveResult");
}
