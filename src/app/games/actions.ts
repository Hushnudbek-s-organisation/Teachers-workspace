"use server";

// ============================================================================
// O'qituvchi o'yinlari uchun server amallari
// Har biri safeAction() orqali ActionResult qaytaradi — throw yo'q, 500 yo'q.
// ============================================================================

import { revalidatePath } from "next/cache";
import type { GameItem, GameType, SubjectKey } from "@/lib/books/types";
import {
  createCustomGame,
  deleteCustomGame,
  normalizeItems,
  parseCustomItems,
  updateCustomGame,
} from "@/lib/books/custom";
import { safeAction, ValidationError, type ActionResult } from "@/lib/action-result";

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

export async function actionSaveCustomGame(
  input: SaveCustomInput
): Promise<ActionResult<{ id: string; items: number }>> {
  return safeAction(async () => {
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
  }, "actionSaveCustomGame");
}

export async function actionUpdateCustomGame(
  id: string,
  patch: SaveCustomInput
): Promise<ActionResult<{ id: string; items: number }>> {
  return safeAction(async () => {
    let items = patch.items ?? [];
    if (!items.length && patch.raw) {
      items = normalizeItems(parseCustomItems(patch.raw, patch.type).items, patch.type);
    }
    const game = await updateCustomGame(id, { ...patch, items });
    if (!game) throw new ValidationError("O'yin topilmadi.");
    revalidatePath("/games");
    revalidatePath(`/games/${id}`);
    return { id: game.id, items: game.items.length };
  }, "actionUpdateCustomGame");
}

export async function actionDeleteCustomGame(id: string): Promise<ActionResult<{ deleted: boolean }>> {
  return safeAction(async () => {
    const deleted = await deleteCustomGame(id);
    revalidatePath("/games");
    return { deleted };
  }, "actionDeleteCustomGame");
}
