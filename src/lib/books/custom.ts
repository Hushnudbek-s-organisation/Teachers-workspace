import "server-only";
import { MAX_CUSTOM_GAMES, MAX_CUSTOM_ITEMS } from "@/lib/config";
import { isSupabaseConfigured } from "@/lib/repo";
import { dbDeleteCustomGame, dbGetCustomGame, dbListCustomGames, dbUpsertCustomGame } from "./db";

// ============================================================================
// O'qituvchi o'zi yasagan o'yinlar
//   Supabase sozlangan bo'lsa — `custom_games` jadvalida,
//   aks holda `.data/custom-games.json` faylida saqlanadi.
//   O'qituvchi o'z so'zlari/misollari bilan istalgan turdagi o'yinni yasay oladi.
// ============================================================================

import fs from "node:fs/promises";
import path from "node:path";
import type { Game, GameItem, GameType, SubjectKey } from "./types";
import { GAME_TYPES } from "./types";
import { normalizeItems, parseCustomItems } from "./custom-parse";

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "custom-games.json");

export interface CustomGame extends Game {
  custom: true;
  grade: number;
  subject: SubjectKey;
  /** Qaysi kitob/mavzuga bog'langan (ixtiyoriy) */
  bookId?: string;
  topicId?: string;
  shareCode?: string;
}

async function readAll(): Promise<CustomGame[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CustomGame[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(games: CustomGame[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(games, null, 0), "utf8");
}

/**
 * "grouping" o'yinida guruhlar ko'rsatilmagan bo'lsa — elementlarning o'ng
 * ustunidan chiqaramiz. Aks holda doskada guruh ustunlari bo'lmay qoladi.
 */
function withDerivedGroups(type: GameType, items: GameItem[], groups?: string[]): string[] | undefined {
  if (type !== "grouping") return groups?.length ? groups : undefined;
  if (groups?.length) return groups;
  const derived = [...new Set(items.map((it) => String((it as { right?: string }).right ?? "").trim()).filter(Boolean))];
  return derived.length >= 2 ? derived : undefined;
}

export async function listCustomGames(bookId?: string): Promise<CustomGame[]> {
  if (isSupabaseConfigured()) return dbListCustomGames(bookId);
  const all = await readAll();
  const filtered = bookId ? all.filter((g) => g.bookId === bookId) : all;
  return filtered.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function getCustomGame(id: string): Promise<CustomGame | null> {
  if (isSupabaseConfigured()) return dbGetCustomGame(id);
  const all = await readAll();
  return all.find((g) => g.id === id) ?? null;
}

export interface CustomGameInput {
  title: string;
  type: GameType;
  subject: SubjectKey;
  grade: number;
  instructions?: string;
  difficulty?: 1 | 2 | 3;
  groups?: string[];
  items: GameItem[];
  bookId?: string;
  topicId?: string;
  /** O'yin manbasi haqida izoh (o'qituvchi kiritadi) */
  note?: string;
}

export async function createCustomGame(input: CustomGameInput): Promise<CustomGame> {
  if (!GAME_TYPES[input.type]) throw new Error(`Noma'lum o'yin turi: ${String(input.type)}`);
  const items = normalizeItems(input.items.filter(Boolean), input.type).slice(0, MAX_CUSTOM_ITEMS);
  if (!items.length) throw new Error("O'yin uchun kamida bitta savol yoki juftlik kerak.");
  const groups = withDerivedGroups(input.type, items, input.groups);

  const game: CustomGame = {
    id: `o-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    type: input.type,
    title: input.title.trim() || "Mening o'yinim",
    instructions: input.instructions?.trim() || GAME_TYPES[input.type].hint,
    difficulty: input.difficulty ?? 2,
    items,
    groups,
    builtFrom: { note: input.note?.trim() || "O'qituvchi tomonidan yaratilgan", pages: [] },
    custom: true,
    createdAt: new Date().toISOString(),
    grade: input.grade,
    subject: input.subject,
    bookId: input.bookId,
    topicId: input.topicId,
  };

  if (isSupabaseConfigured()) {
    await dbUpsertCustomGame(game);
    return game;
  }
  const all = await readAll();
  all.push(game);
  await writeAll(all.slice(-MAX_CUSTOM_GAMES));
  return game;
}

/** Tahrir natijasini hisoblash (saqlashdan alohida — Supabase'da ham ishlaydi) */
function mergeCustom(prev: CustomGame, patch: Partial<CustomGameInput>): CustomGame {
  const type = patch.type ?? prev.type;
  const items = patch.items?.length
    ? normalizeItems(patch.items.filter(Boolean), type).slice(0, MAX_CUSTOM_ITEMS)
    : prev.items;
  const next: CustomGame = {
    ...prev,
    type,
    title: patch.title?.trim() || prev.title,
    instructions: patch.instructions?.trim() || prev.instructions,
    difficulty: patch.difficulty ?? prev.difficulty,
    groups: withDerivedGroups(type, items, patch.groups?.length ? patch.groups : prev.groups),
    subject: patch.subject ?? prev.subject,
    grade: patch.grade ?? prev.grade,
    items,
    bookId: patch.bookId ?? prev.bookId,
    topicId: patch.topicId ?? prev.topicId,
    builtFrom: patch.note ? { ...prev.builtFrom, note: patch.note } : prev.builtFrom,
  };
  return next;
}

/**
 * Mavjud o'yinni tahrirlash (tahrir sahifasi shu funksiyani ishlatadi).
 * Supabase sozlangan bo'lsa ham avval mavjud o'yin o'sha yerdan o'qiladi —
 * aks holda tahrir "topilmadi" bo'lib qolardi.
 */
export async function updateCustomGame(
  id: string,
  patch: Partial<CustomGameInput>
): Promise<CustomGame | null> {
  if (isSupabaseConfigured()) {
    const prev = await dbGetCustomGame(id);
    if (!prev) return null;
    const next = mergeCustom(prev, patch);
    await dbUpsertCustomGame(next);
    return next;
  }
  const all = await readAll();
  const i = all.findIndex((g) => g.id === id);
  if (i < 0) return null;
  const next = mergeCustom(all[i], patch);
  all[i] = next;
  await writeAll(all);
  return next;
}

export async function deleteCustomGame(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) return dbDeleteCustomGame(id);
  const all = await readAll();
  const next = all.filter((g) => g.id !== id);
  if (next.length === all.length) return false;
  await writeAll(next);
  return true;
}

// Parse funksiyalarini qayta eksport qilamiz (server tomonda ishlatish uchun)
export { parseCustomItems, normalizeItems } from "./custom-parse";
