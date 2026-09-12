"use server";

// ============================================================================
// O'qituvchi o'yinlari uchun server amallari
// ============================================================================

import { revalidatePath } from "next/cache";
import type { GameItem, GameType, SubjectKey } from "@/lib/books/types";
import {
  attachCustomGame,
  createCustomGame,
  deleteCustomGame,
  getCustomGame,
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
}

/** Matnni oldindan ko'rib chiqish (saqlamasdan) */
export async function actionPreviewCustom(raw: string, type: GameType) {
  const preview = parseCustomItems(raw, type);
  const items = normalizeItems(preview.items, type);
  return { items, problems: preview.problems };
}

export async function actionSaveCustomGame(input: SaveCustomInput) {
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
    bookId: input.bookId,
    topicId: input.topicId,
  });

  revalidatePath("/games");
  revalidatePath(`/games/${game.id}`);
  return { id: game.id, items: game.items.length };
}

export async function actionUpdateCustomGame(id: string, patch: SaveCustomInput) {
  let items = patch.items;
  if ((!items || !items.length) && patch.raw) {
    items = normalizeItems(parseCustomItems(patch.raw, patch.type).items, patch.type);
  }
  const game = await updateCustomGame(id, { ...patch, items });
  revalidatePath("/games");
  revalidatePath(`/games/${id}`);
  return { ok: !!game };
}

export async function actionDeleteCustomGame(id: string) {
  const ok = await deleteCustomGame(id);
  revalidatePath("/games");
  return { ok };
}

export async function actionAttachCustomGame(id: string, bookId?: string, topicId?: string) {
  const ok = await attachCustomGame(id, bookId, topicId);
  revalidatePath(`/games/${id}`);
  if (bookId) revalidatePath(`/books/${bookId}`);
  return { ok };
}

export async function actionGetCustomGame(id: string) {
  const game = await getCustomGame(id);
  if (!game) return null;
  return {
    id: game.id,
    title: game.title,
    type: game.type,
    items: game.items,
    groups: game.groups,
    subject: game.subject,
    grade: game.grade,
  };
}
