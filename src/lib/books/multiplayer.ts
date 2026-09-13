// ============================================================================
// Bir qurilmada 1 / 2 / 3 kishi o'ynash mantiqi
//
// Bu fayl SOF (React'siz, server'siz) — shuning uchun ham brauzerda, ham
// `npm run test:games` tekshiruvida ishlatiladi.
//
// Asosiy qoidalar:
//   • Har o'yinchining O'Z maydoni, O'Z holati va O'Z hisobi bor.
//   • Hamma BIR VAQTDA o'ynaydi (birga boshlanadi), lekin har kimga HAR XIL
//     savol tushadi — bir xil misol ikki o'yinchiga berilmaydi.
//   • Kim o'z savolini tugatsa — keyingisiga o'tadi, boshqalar o'zinikini
//     davom ettiradi.
//   • Yakunlash ikki xil: "savollar soni" (poyga yoki hammasi tugaguncha)
//     va "vaqt bo'yicha" (minut tugaguncha savollar ketma-ket keladi).
// ============================================================================

import {
  MULTIPLAYER_DEFAULT_MINUTES,
  MULTIPLAYER_DEFAULT_QUESTIONS,
  MULTIPLAYER_DEFAULT_ROUNDS,
  MULTIPLAYER_MAX_PLAYERS,
  MULTIPLAYER_MAX_QUESTIONS,
  MULTIPLAYER_MIN_BOARD_ITEMS,
  MULTIPLAYER_MIN_BOARD_ITEMS_FALLBACK,
  MULTIPLAYER_TIMED_ROUND_ITEMS,
} from "../config";
import type { GameType } from "./types";

// --------------------------------- Turlar -----------------------------------

export type PlayerCount = 1 | 2 | 3;

export const PLAYER_COUNTS: PlayerCount[] = [1, 2, 3];

/** "Vaqt bo'yicha" yoki "savollar soni" */
export type MultiMode = "count" | "time";

/**
 * "count" rejimida o'yin qachon tugaydi:
 *   first — birinchi tugatgan o'yinchi poygani yakunlaydi (boshqalar to'xtaydi)
 *   all   — hammasi o'z to'plamini tugatguncha
 */
export type EndRule = "first" | "all";

export interface GameSetup {
  players: PlayerCount;
  /** Har o'yinchi nomi (standart: "1-o'yinchi", "2-o'yinchi", "3-o'yinchi") */
  names: string[];
  /** Ro'yxatdan tanlangan o'quvchi (ixtiyoriy) — natija shu id bilan saqlanadi */
  studentIds: Array<string | null>;
  mode: MultiMode;
  /** count rejimi: savollar soni (taxta o'yinlarida — raundlar soni) */
  perPlayer: number;
  /** time rejimi: nechta minut */
  minutes: number;
  endRule: EndRule;
}

/** Bitta o'yinchining yakuniy ko'rsatkichi */
export interface PlayerOutcome {
  index: number;
  name: string;
  studentId: string | null;
  /** To'g'ri javoblar */
  score: number;
  /** Nechta savol/topshiriq bajarildi */
  answered: number;
  timeSec: number;
  /** Rejadagi hammasini tugatdimi */
  finishedAll: boolean;
}

// ------------------------------ Rang/ko'rinish ------------------------------

export interface PlayerTheme {
  label: string;
  emoji: string;
  /** Maydon romi (tinch holat) */
  pane: string;
  /** Maydon romi (faol holat) */
  paneActive: string;
  /** Maydon foni */
  paneBg: string;
  /** Ism yorlig'i */
  chip: string;
  /** Kichik doira */
  dot: string;
  /** Hisob chizig'i */
  bar: string;
  /** Sarlavha foni */
  head: string;
  /** G'olib kartasi */
  win: string;
}

export const PLAYER_THEMES: PlayerTheme[] = [
  {
    label: "1-o'yinchi",
    emoji: "🦊",
    pane: "border-indigo-200",
    paneActive: "border-indigo-500 ring-2 ring-indigo-200",
    paneBg: "bg-white",
    chip: "bg-indigo-100 text-indigo-700",
    dot: "bg-indigo-500",
    bar: "from-indigo-500 to-violet-500",
    head: "bg-indigo-50",
    win: "border-amber-300 bg-amber-50",
  },
  {
    label: "2-o'yinchi",
    emoji: "🐼",
    pane: "border-emerald-200",
    paneActive: "border-emerald-500 ring-2 ring-emerald-200",
    paneBg: "bg-white",
    chip: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
    bar: "from-emerald-500 to-teal-500",
    head: "bg-emerald-50",
    win: "border-amber-300 bg-amber-50",
  },
  {
    label: "3-o'yinchi",
    emoji: "🦁",
    pane: "border-amber-200",
    paneActive: "border-amber-500 ring-2 ring-amber-200",
    paneBg: "bg-white",
    chip: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
    bar: "from-amber-500 to-orange-500",
    head: "bg-amber-50",
    win: "border-amber-300 bg-amber-50",
  },
];

export function themeFor(index: number): PlayerTheme {
  return PLAYER_THEMES[((index % PLAYER_THEMES.length) + PLAYER_THEMES.length) % PLAYER_THEMES.length];
}

export const DEFAULT_PLAYER_NAMES: string[] = ["1-o'yinchi", "2-o'yinchi", "3-o'yinchi"];

// --------------------------- Aralashtirish (seed) ---------------------------

/**
 * Bir xil seed bilan har doim bir xil tartib — taxtalarda takrorlanadigan
 * natija beradi, lekin har o'yinchiga boshqa seed berilsa tartib boshqacha.
 */
export function shuffleSeeded<T>(arr: readonly T[], seed: number): T[] {
  const out = [...arr];
  let s = (seed + 1) * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function indices(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i);
}

/** Raund uchun seed (bir xil raunddagi barcha o'yinchilar uchun bir xil) */
export function roundSeed(round: number, base = 0): number {
  return base + round * 7919 + 13;
}

// ------------------------------ O'yin turlari -------------------------------

/**
 * "Taxta" o'yinlari — bitta to'plam butunlay o'ynaladi (juftlashtirish,
 * xotira, guruhlash, bingo). Qolganlari ketma-ket savollar beradi.
 */
export const BOARD_GAMES: GameType[] = ["matching", "memory", "grouping", "bingo"];

export function isBoardGame(type: GameType): boolean {
  return BOARD_GAMES.includes(type);
}

// -------------------------------- Sozlamalar --------------------------------

export function clampPlayers(value: unknown): PlayerCount {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  const rounded = Math.round(n);
  if (rounded <= 1) return 1;
  if (rounded >= MULTIPLAYER_MAX_PLAYERS) return MULTIPLAYER_MAX_PLAYERS as PlayerCount;
  return rounded as PlayerCount;
}

export function clampCount(value: unknown, min = 1, max = MULTIPLAYER_MAX_QUESTIONS): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function clampMinutes(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n <= 0) return MULTIPLAYER_DEFAULT_MINUTES;
  return Math.min(60, Math.max(1, n));
}

/** Ismlarni tartibga solish: bo'sh bo'lsa standart nom qaytadi */
export function normalizeNames(names: Array<string | undefined>, players: number): string[] {
  return indices(players).map((i) => {
    const given = (names[i] ?? "").trim();
    return given || DEFAULT_PLAYER_NAMES[i] || `${i + 1}-o'yinchi`;
  });
}

/** O'yin uchun standart sozlama (1 kishi, savollar soni rejimi) */
export function defaultSetup(type: GameType, itemsCount: number): GameSetup {
  return {
    players: 1,
    names: [...DEFAULT_PLAYER_NAMES],
    studentIds: [null, null, null],
    mode: "count",
    perPlayer: defaultPerPlayer(type, itemsCount),
    minutes: MULTIPLAYER_DEFAULT_MINUTES,
    endRule: "first",
  };
}

export function defaultPerPlayer(type: GameType, itemsCount: number): number {
  if (isBoardGame(type)) return Math.min(MULTIPLAYER_DEFAULT_ROUNDS, Math.max(1, itemsCount || 1));
  if (itemsCount > 0) return Math.min(MULTIPLAYER_DEFAULT_QUESTIONS, itemsCount);
  return MULTIPLAYER_DEFAULT_QUESTIONS;
}

/**
 * Foydalanuvchi kiritgan sozlamani chegaralar ichiga olish (xavfsiz holat).
 * O'yin elementlari soni o'zgarganda ham sozlama buzilmaydi.
 */
export function clampSetup(setup: GameSetup, type: GameType, itemsCount: number): GameSetup {
  const players = clampPlayers(setup.players);
  const perPlayer = isBoardGame(type)
    ? clampCount(setup.perPlayer, 1, 10)
    : clampCount(setup.perPlayer, 1, Math.max(MULTIPLAYER_MAX_QUESTIONS, itemsCount));
  return {
    players,
    names: normalizeNames(setup.names, players),
    studentIds: indices(players).map((i) => setup.studentIds[i] ?? null),
    mode: setup.mode === "time" ? "time" : "count",
    perPlayer,
    minutes: clampMinutes(setup.minutes),
    endRule: setup.endRule === "all" ? "all" : "first",
  };
}

/** Har o'yinchiga bir raundda nechta element tushadi */
export function itemsPerRound(type: GameType, itemsCount: number, setup: GameSetup): number {
  if (isBoardGame(type)) return Math.max(1, itemsCount);
  if (setup.mode === "time") {
    return Math.max(1, Math.min(itemsCount || MULTIPLAYER_TIMED_ROUND_ITEMS, MULTIPLAYER_TIMED_ROUND_ITEMS));
  }
  return clampCount(setup.perPlayer, 1, Math.max(1, itemsCount || MULTIPLAYER_MAX_QUESTIONS));
}

/**
 * Rejadagi raundlar soni. "time" rejimida chegarasi yo'q (null) — vaqt
 * tugaguncha savollar yangilanib turadi.
 */
export function plannedRounds(type: GameType, setup: GameSetup): number | null {
  if (setup.mode === "time") return null;
  if (isBoardGame(type)) return clampCount(setup.perPlayer, 1, 10);
  return 1;
}

/** Vaqt rejimidami (cheksiz raundlar) */
export function isUnlimited(setup: GameSetup): boolean {
  return setup.mode === "time";
}

// --------------------------------- Tarqatish --------------------------------

/**
 * Ketma-ket savolli o'yinlar uchun har o'yinchiga alohida to'plam tuzadi.
 *
 * Adolat qoidalari:
 *   • har o'yinchida elementlar soni TENG (perPlayer);
 *   • bir xil savol bir vaqtda ikki o'yinchiga tushmaydi (to'plamda yetarli
 *     element bo'lsa);
 *   • to'plam kichik bo'lsa savollar qayta aralashtirilib takrorlanadi.
 */
export function dealSequence<T>(
  items: readonly T[],
  players: number,
  perPlayer: number,
  seed: number
): T[][] {
  const p = clampPlayers(players);
  const decks: T[][] = indices(p).map(() => []);
  const count = clampCount(perPlayer, 0, MULTIPLAYER_MAX_QUESTIONS * 4);
  if (!items.length || count <= 0) return decks;

  const n = items.length;
  const slots: number[][] = [];
  let block = 0;

  if (n < p) {
    // Elementlar soni o'yinchilardan kam — takrorlanishiga to'g'ri keladi
    while (slots.length < count) {
      const shuffled = shuffleSeeded(indices(n), seed + block * 131);
      slots.push(indices(p).map((i) => shuffled[i % n]!));
      block++;
    }
  } else {
    while (slots.length < count) {
      const perm = shuffleSeeded(indices(n), seed + block * 7919);
      // Bitta aralashma ichidan p talab guruhlar olamiz — ular aniq har xil
      for (let s = 0; s + p <= perm.length; s += p) slots.push(perm.slice(s, s + p));
      block++;
    }
  }

  for (let k = 0; k < count; k++) {
    const slot = slots[k]!;
    for (let i = 0; i < p; i++) decks[i]!.push(items[slot[i]!]!);
  }
  return decks;
}

export interface BoardDeal<T> {
  /** Har o'yinchining taxtasi */
  decks: T[][];
  /** To'plam bo'lindimi (true) yoki hammaga bir xil, faqat tartibi boshqami */
  split: boolean;
}

/**
 * Taxta o'yinlari uchun tarqatish:
 *   • bingo — har kimda O'Z kartasi (bir xil so'zlar, har xil joylashuv),
 *     chunki o'qituvchi so'zlarni hammasiga aytadi;
 *   • matching / memory / grouping — to'plam yetarli bo'lsa har o'yinchiga
 *     teng miqdorda HAR XIL element beriladi, yetarli bo'lmasa bir xil
 *     to'plam har xil tartibda (o'yin juda mayda bo'lib qolmasligi uchun);
 *   • grouping'da bo'laklarda kamida 2 ta guruh qolishi kerak.
 */
export function dealBoards<T>(
  items: readonly T[],
  type: GameType,
  players: number,
  seed: number,
  groupOf?: (item: T) => string
): BoardDeal<T> {
  const p = clampPlayers(players);
  if (!items.length) return { decks: indices(p).map(() => []), split: false };
  if (p <= 1) return { decks: [[...items]], split: false };

  // Har xil tartib — bir xil to'plam
  const permuted = (): T[][] => indices(p).map((i) => shuffleSeeded(items, seed + i * 101));

  if (type === "bingo") return { decks: permuted(), split: false };

  const minPer = MULTIPLAYER_MIN_BOARD_ITEMS[type] ?? MULTIPLAYER_MIN_BOARD_ITEMS_FALLBACK;
  if (items.length < p * minPer) return { decks: permuted(), split: false };

  const perm = shuffleSeeded(indices(items.length), seed);
  const perPlayer = Math.floor(perm.length / p);
  const decks: T[][] = indices(p).map((i) =>
    perm.slice(i * perPlayer, i * perPlayer + perPlayer).map((idx) => items[idx]!)
  );

  if (type === "grouping" && groupOf) {
    const ok = decks.every((deck) => new Set(deck.map(groupOf)).size >= 2);
    if (!ok) return { decks: permuted(), split: false };
  }
  if (decks.some((deck) => deck.length < MULTIPLAYER_MIN_BOARD_ITEMS_FALLBACK)) {
    return { decks: permuted(), split: false };
  }

  return { decks, split: true };
}

/**
 * Bitta raund uchun o'yinchiga tushadigan elementlar.
 *
 * Bir xil `round` qiymatidagi barcha o'yinchilar bir xil seed bilan tarqatiladi —
 * shuning uchun ularning savollari bir-biridan farq qiladi (bir xil misol ikki
 * o'yinchiga tushmaydi), har birida elementlar soni esa teng bo'ladi.
 */
export function dealRound<T>(
  items: readonly T[],
  type: GameType,
  setup: GameSetup,
  playerIndex: number,
  round: number,
  groupOf?: (item: T) => string
): T[] {
  const seed = roundSeed(round);
  if (isBoardGame(type)) {
    const deal = dealBoards(items, type, setup.players, seed, groupOf);
    return deal.decks[playerIndex] ?? [...items];
  }
  const per = itemsPerRound(type, items.length, setup);
  return dealSequence(items, setup.players, per, seed)[playerIndex] ?? [];
}

/** Elementdan guruh nomini olish (grouping taxtasini bo'lishda kerak) */
export function groupOfItem(item: unknown): string {
  return String((item as { right?: unknown } | null)?.right ?? "").trim();
}

// --------------------------------- Natijalar --------------------------------

export function percentOf(score: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.round((Math.max(0, score) / total) * 100);
}

export function starsFor(percent: number): number {
  return percent >= 90 ? 3 : percent >= 70 ? 2 : percent >= 40 ? 1 : 0;
}

export interface StandingRow {
  index: number;
  name: string;
  score: number;
  /** Bajarilgan savollar soni (foiz uchun maxraj) */
  total: number;
}

export interface Standing {
  /** O'rinlar bo'yicha o'yinchi indekslari (1-o'rin birinchi) */
  order: number[];
  /** Eng ko'p ball to'plagan o'yinchilar */
  winners: number[];
  /** Durrangmi (birinchi o'rin birdan ortiq o'yinchida) */
  draw: boolean;
  /** Har o'yinchining o'rni (1, 2, 3) */
  place: Record<number, number>;
}

/** Hisob bo'yicha joylarni aniqlaydi: ball → foiz → ism tartibi */
export function standings(rows: StandingRow[]): Standing {
  const scored = rows.map((r) => ({ ...r, percent: percentOf(r.score, r.total) }));
  const order = [...scored]
    .sort((a, b) => b.score - a.score || b.percent - a.percent || a.index - b.index)
    .map((r) => r.index);
  const top = order.length ? scored.find((r) => r.index === order[0])!.score : 0;
  const winners = scored.filter((r) => r.score === top).map((r) => r.index);
  const place: Record<number, number> = {};
  // Bir xil ball + bir xil foiz → bir xil o'rin
  order.forEach((idx, i) => {
    if (i === 0) place[idx] = 1;
    else {
      const prev = scored.find((r) => r.index === order[i - 1])!;
      const cur = scored.find((r) => r.index === idx)!;
      place[idx] = cur.score === prev.score && cur.percent === prev.percent ? place[order[i - 1]!]! : i + 1;
    }
  });
  return { order, winners, draw: winners.length > 1, place };
}

export function resultMessage(percent: number): string {
  return percent >= 90
    ? "Zo'r! Sen bu mavzuni mukammal bilasan! 🎉"
    : percent >= 70
      ? "Yaxshi natija! Yana ozgina mashq qilsang, a'lo bo'ladi 💪"
      : percent >= 40
        ? "Yomon emas! Mavzuni takrorlab, yana urinib ko'r 📖"
        : "Mavzuni qayta o'qib, yana bir bor sinab ko'r. Sen uddalaysan! 🌟";
}

/** Sekundni "1:05" ko'rinishiga keltiradi */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/** Sozlamaning qisqacha izohi (o'yin tepasida ko'rsatiladi) */
export function describeSetup(setup: GameSetup, type: GameType): string {
  const board = isBoardGame(type);
  if (setup.mode === "time") {
    return `${setup.players} o'yinchi · ${setup.minutes} daqiqa · vaqt tugaguncha savollar keladi`;
  }
  const what = board
    ? `har biriga ${setup.perPlayer} ta taxta`
    : `har biriga ${setup.perPlayer} ta savol`;
  const rule = setup.endRule === "first" ? "birinchi tugatgan yakunlaydi" : "hammasi tugatguncha";
  return `${setup.players} o'yinchi · ${what} · ${rule}`;
}
