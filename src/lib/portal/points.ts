// ============================================================================
// BALLAR TIZIMI (foydalanuvchi talabi)
//
//   • Ona tili o'yinlari  → har to'g'ri yakunlangan o'yin uchun 4 ball
//   • Matematika o'yinlari → 2 ball
//   • Boshqa fanlar       → 2 ball
//
// Fan o'yin kalitidan (`practice:...`, `custom:<id>`, `book:<bookId>:...`)
// yoki xona/session subyektidan aniqlanadi.
// ============================================================================

import "server-only";
import { getBook, listBookMetas } from "@/lib/books/store";
import { listCustomGames } from "@/lib/books/custom";

export const SUBJECT_POINTS: Record<string, number> = {
  "ona-tili": 4,
  oqish: 4,
  matematika: 2,
  "tabiiy-fanlar": 2,
  "ingliz-tili": 2,
  "rus-tili": 2,
  boshqa: 2,
};

/** Mashq o'yinlari subyekti (fan) */
const PRACTICE_SUBJECT: Record<string, string> = {
  "kopaytirish-zinasi": "matematika",
  "soatni-top": "matematika",
  "soz-yasash": "ona-tili",
};

export function pointsForSubject(subjectKey?: string | null): number {
  if (!subjectKey) return 2;
  return SUBJECT_POINTS[subjectKey] ?? 2;
}

/** O'yin kalitidan fan kalitini aniqlash (maksimal harakat, topilmasa null) */
export async function subjectForGameKey(gameKey: string): Promise<string | null> {
  const parts = (gameKey ?? "").split(":");

  if (parts[0] === "practice" && parts[1]) return PRACTICE_SUBJECT[parts[1]] ?? null;

  if (parts[0] === "custom" && parts[1]) {
    try {
      const games = await listCustomGames();
      const g = games.find((x) => x.id === parts[1]);
      return g?.subject ?? null;
    } catch {
      return null;
    }
  }

  if (parts[0] === "book" && parts[1]) {
    try {
      const books = await listBookMetas();
      const b = books.find((x) => x.id === parts[1]);
      if (b) return b.subject;
      const full = await getBook(parts[1]);
      return full?.subject ?? null;
    } catch {
      return null;
    }
  }

  return null;
}
