// ============================================================================
// O'yinlar statistikasi — saqlangan natijalardan hisobot yig'ish
//
// Sof funksiya (React/Supabase'siz): `npm run test:games` da tekshiriladi,
// `/games/stats` sahifasida ishlatiladi. Bir qurilmada 2–3 kishi o'ynaganda
// har o'yinchining natijasi ALOHIDA yozuv bo'lib saqlanadi, shuning uchun
// bu yerda ham har biri o'z ismi bilan ko'rinadi.
// ============================================================================

import type { GameResult, GameType } from "./types";

export interface GameStatRow {
  gameId: string;
  title: string;
  type: GameType;
  played: number;
  /** Nechta xil o'yinchi (ism bo'yicha) o'ynagan */
  players: number;
  score: number;
  total: number;
  percent: number;
  /** Eng yaxshi yakuniy foiz */
  best: number;
  lastAt: string;
}

export interface PlayerStatRow {
  name: string;
  studentId: string | null;
  played: number;
  score: number;
  total: number;
  percent: number;
  lastAt: string;
}

export interface TypeStatRow {
  type: GameType;
  played: number;
  score: number;
  total: number;
  percent: number;
}

export interface GameStatsSummary {
  plays: number;
  players: number;
  games: number;
  score: number;
  total: number;
  percent: number;
  /** Ro'yxatdan tanlangan o'quvchiga bog'langan yozuvlar */
  withStudent: number;
  /** Ism bilan, lekin o'quvchi tanlanmagan (ko'p kishilik rejimda kiritilgan) */
  guest: number;
  byGame: GameStatRow[];
  byPlayer: PlayerStatRow[];
  byType: TypeStatRow[];
  recent: GameResult[];
}

export function percentOf(score: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.round((Math.max(0, score) / total) * 100);
}

function safeNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Ism bo'sh bo'lsa — "Mehmon" deb ko'rsatamiz */
export function playerName(result: GameResult): string {
  const name = (result.studentName ?? "").trim();
  return name || "Mehmon";
}

/**
 * Natijalarni jamlash: umumiy ko'rsatkichlar + o'yin/o'quvchi/tur kesimi.
 * `limit` — oxirgi natijalar ro'yxatining uzunligi.
 */
export function summarizeGameResults(results: readonly GameResult[], limit = 15): GameStatsSummary {
  const rows = [...results].sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));

  const byGame = new Map<string, GameStatRow & { names: Set<string> }>();
  const byPlayer = new Map<string, PlayerStatRow>();
  const byType = new Map<GameType, TypeStatRow>();

  let score = 0;
  let total = 0;
  let withStudent = 0;
  let guest = 0;

  for (const r of rows) {
    const s = safeNum(r.score);
    const t = safeNum(r.total);
    score += s;
    total += t;
    if (r.studentId) withStudent++;
    else guest++;

    const name = playerName(r);
    const type = r.gameType;

    const g =
      byGame.get(r.gameId) ??
      ({
        gameId: r.gameId,
        title: r.gameTitle || "O'yin",
        type,
        played: 0,
        players: 0,
        score: 0,
        total: 0,
        percent: 0,
        best: 0,
        lastAt: r.createdAt ?? "",
        names: new Set<string>(),
      } as GameStatRow & { names: Set<string> });
    g.played += 1;
    g.score += s;
    g.total += t;
    g.names.add(name);
    g.best = Math.max(g.best, percentOf(s, t));
    g.lastAt = g.lastAt > (r.createdAt ?? "") ? g.lastAt : (r.createdAt ?? "");
    byGame.set(r.gameId, g);

    const p =
      byPlayer.get(name) ??
      { name, studentId: r.studentId ?? null, played: 0, score: 0, total: 0, percent: 0, lastAt: "" };
    p.played += 1;
    p.score += s;
    p.total += t;
    p.lastAt = p.lastAt > (r.createdAt ?? "") ? p.lastAt : (r.createdAt ?? "");
    if (!p.studentId && r.studentId) p.studentId = r.studentId;
    byPlayer.set(name, p);

    const ty = byType.get(type) ?? { type, played: 0, score: 0, total: 0, percent: 0 };
    ty.played += 1;
    ty.score += s;
    ty.total += t;
    byType.set(type, ty);
  }

  const games: GameStatRow[] = [...byGame.values()]
    .map(({ names, ...row }) => ({ ...row, players: names.size, percent: percentOf(row.score, row.total) }))
    .sort((a, b) => b.played - a.played || b.percent - a.percent || a.title.localeCompare(b.title));

  const players: PlayerStatRow[] = [...byPlayer.values()]
    .map((row) => ({ ...row, percent: percentOf(row.score, row.total) }))
    .sort((a, b) => b.percent - a.percent || b.played - a.played || a.name.localeCompare(b.name));

  const types: TypeStatRow[] = [...byType.values()]
    .map((row) => ({ ...row, percent: percentOf(row.score, row.total) }))
    .sort((a, b) => b.played - a.played);

  return {
    plays: rows.length,
    players: players.length,
    games: games.length,
    score,
    total,
    percent: percentOf(score, total),
    withStudent,
    guest,
    byGame: games,
    byPlayer: players,
    byType: types,
    recent: rows.slice(0, Math.max(0, limit)),
  };
}

/** Sana matnini qisqacha ko'rsatish: "2026-09-13T10:20:00Z" → "13.09.2026 10:20" */
export function formatWhen(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Vaqtni o'zbekcha ko'rinishda: 125 → "2 daq 5 s" */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest ? `${m} daq ${rest} s` : `${m} daq`;
}
