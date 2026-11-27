"use server";

// ============================================================================
// O'qituvchi o'yinlari uchun server amallari
// ============================================================================

import { revalidatePath } from "next/cache";
import { requireTeacherAction } from "@/lib/auth";
import type { GameItem, GameType, SubjectKey } from "@/lib/books/types";
import {
  createCustomGame,
  deleteCustomGame,
  normalizeItems,
  parseCustomItems,
  updateCustomGame,
} from "@/lib/books/custom";

export interface SaveCustomInput {
  title: string;
  type: GameType;
  subject: SubjectKey;
  grade: number;
  instructions?: string;
  difficulty?: 1 | 2 | 3;
  groups?: string[];
  raw?: string;
  items?: GameItem[];
  note?: string;
  bookId?: string;
  topicId?: string;
  /** O'quvchi portali ga chiqarish (default true) */
  forStudents?: boolean;
}

export async function actionSaveCustomGame(input: SaveCustomInput) {
  await requireTeacherAction();
  let items: GameItem[] = input.items ?? [];
  if (!items.length && input.raw) {
    items = normalizeItems(parseCustomItems(input.raw, input.type).items, input.type);
  }

  const game = await createCustomGame({
    title: input.title,
    type: input.type,
    subject: input.subject,
    grade: input.grade,
    instructions: input.instructions,
    difficulty: input.difficulty,
    groups: input.groups,
    items,
    note: input.note,
    forStudents: input.forStudents,
    bookId: input.bookId,
    topicId: input.topicId,
  });

  revalidatePath("/games");
  revalidatePath(`/games/${game.id}`);
  return { id: game.id, items: game.items.length };
}

export async function actionUpdateCustomGame(id: string, patch: SaveCustomInput) {
  await requireTeacherAction();
  let items = patch.items ?? [];
  if (!items.length && patch.raw) {
    items = normalizeItems(parseCustomItems(patch.raw, patch.type).items, patch.type);
  }
  const game = await updateCustomGame(id, { ...patch, items });
  if (!game) throw new Error("O'yin topilmadi.");
  revalidatePath("/games");
  revalidatePath(`/games/${id}`);
  return { id: game.id, items: game.items.length };
}

export async function actionDeleteCustomGame(id: string) {
  await requireTeacherAction();
  const ok = await deleteCustomGame(id);
  revalidatePath("/games");
  return { ok };
}
