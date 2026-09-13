"use client";

// ============================================================================
// Bo'lingan ekran natijalari — har o'yinchining hisobi yonma-yon (telefonda
// ustma-ust), g'olib aniq ajratilgan va har bir natija ALOHIDA yozuv bo'lib
// saqlanadi (o'yinlar statistikasida ko'rinadi).
// ============================================================================

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BarChart3, Check, Clock, RotateCcw, Star, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Game } from "@/lib/books/types";
import { GAME_TYPES } from "@/lib/books/types";
import {
  formatClock,
  percentOf,
  resultMessage,
  standings,
  starsFor,
  themeFor,
  type GameSetup,
  type PlayerOutcome,
} from "@/lib/books/multiplayer";
import { actionSaveGameResults } from "@/app/books/actions";
import { Button, Select } from "@/components/ui";
import type { StudentOption } from "./MultiplayerSetup";

const MEDALS = ["🥇", "🥈", "🥉"];

export function MultiplayerDone({
  game,
  outcomes,
  setup,
  students,
  bookId,
  saveBookId,
  topicId,
  topicTitle,
  onRestart,
}: {
  game: Game;
  outcomes: PlayerOutcome[];
  setup: GameSetup;
  students: StudentOption[];
  /** Havolalar uchun (kitob yoki "custom-..." manzili) */
  bookId: string;
  /** Natija yozuvi uchun haqiqiy kitob id (bog'lanmagan bo'lsa null) */
  saveBookId: string | null;
  topicId: string;
  topicTitle: string;
  onRestart: () => void;
}) {
  const router = useRouter();
  const [picks, setPicks] = useState<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    outcomes.forEach((o) => {
      map[o.index] = o.studentId ?? setup.studentIds[o.index] ?? "";
    });
    return map;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);

  const standing = useMemo(
    () =>
      standings(
        outcomes.map((o) => ({ index: o.index, name: o.name, score: o.score, total: o.answered }))
      ),
    [outcomes]
  );

  const ranked = standing.order
    .map((index) => outcomes.find((o) => o.index === index))
    .filter((o): o is PlayerOutcome => Boolean(o));

  const winnerNames = standing.winners
    .map((i) => outcomes.find((o) => o.index === i)?.name ?? "")
    .filter(Boolean);

  const savable = outcomes.filter((o) => o.answered > 0);

  const save = async () => {
    if (!savable.length || saving) return;
    setSaving(true);
    setProblems([]);
    try {
      const res = await actionSaveGameResults(
        savable.map((o) => {
          const id = picks[o.index] ?? "";
          const student = students.find((s) => s.id === id);
          return {
            bookId: saveBookId,
            topicId,
            topicTitle,
            gameId: game.id,
            gameTitle: game.title,
            gameType: game.type,
            studentId: student?.id ?? o.studentId ?? null,
            studentName: student?.full_name?.trim() || o.name,
            score: o.score,
            total: o.answered,
            timeSec: o.timeSec,
          };
        })
      );
      setSaved(res.saved > 0);
      setProblems(res.problems ?? []);
      if (res.saved > 0) router.refresh();
    } catch (err) {
      setProblems([err instanceof Error ? err.message : String(err)]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      {/* ------------------------------- G'olib ------------------------------- */}
      <div className="flex flex-col items-center gap-1 text-center">
        <Trophy className="h-12 w-12 text-amber-400" />
        {standing.draw ? (
          <p className="text-2xl font-bold text-slate-900">Durrang! 🤝</p>
        ) : (
          <p className="text-2xl font-bold text-slate-900">G'olib: {winnerNames[0]} 🏆</p>
        )}
        <p className="text-xs text-slate-500">
          {standing.draw
            ? `${winnerNames.join(" va ")} — bir xil ball (${ranked[0]?.score ?? 0})`
            : `${GAME_TYPES[game.type].emoji} ${game.title} · ${outcomes.length} o'yinchi`}
        </p>
      </div>

      {/* ------------------------------- Hisoblar ------------------------------ */}
      <div
        className={cn(
          "grid w-full grid-cols-1 gap-2.5",
          outcomes.length === 2 && "landscape:grid-cols-2",
          outcomes.length >= 3 && "landscape:grid-cols-3"
        )}
      >
        {ranked.map((o, i) => {
          const theme = themeFor(o.index);
          const percent = percentOf(o.score, o.answered);
          const stars = starsFor(percent);
          const isWinner = standing.winners.includes(o.index);
          return (
            <div
              key={o.index}
              className={cn(
                "rounded-2xl border-2 p-3 text-center transition-all",
                isWinner ? cn(theme.win, "shadow-sm") : "border-slate-200 bg-white"
              )}
            >
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-xl">{MEDALS[i] ?? `${standing.place[o.index] ?? i + 1}.`}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", theme.chip)}>
                  {theme.emoji} {o.name}
                </span>
              </div>

              <p className="mt-1.5 text-3xl font-bold text-slate-900">
                {o.score}
                <span className="text-base font-semibold text-slate-400"> / {o.answered}</span>
              </p>
              <p className="text-xs font-medium text-slate-500">{percent}% to'g'ri</p>

              <div className="mt-1 flex justify-center gap-0.5">
                {[0, 1, 2].map((s) => (
                  <Star
                    key={s}
                    className={cn("h-4 w-4", s < stars ? "fill-amber-400 text-amber-400" : "text-slate-200")}
                  />
                ))}
              </div>

              <p className="mt-1 flex items-center justify-center gap-1 text-[11px] text-slate-400">
                <Clock className="h-3 w-3" /> {formatClock(o.timeSec)}
                {o.finishedAll ? " · hammasini tugatdi" : " · yarim qoldi"}
              </p>
            </div>
          );
        })}
      </div>

      <p className="max-w-md text-center text-sm text-slate-600">
        {resultMessage(percentOf(ranked[0]?.score ?? 0, ranked[0]?.answered ?? 0))}
      </p>

      {/* ------------------------------ Amallar ------------------------------- */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="secondary" onClick={onRestart}>
          <RotateCcw className="h-4 w-4" /> Yana o'ynash
        </Button>
        <Link href={bookId.startsWith("custom-") ? "/games" : `/books/${bookId}`}>
          <Button variant="primary">
            <ArrowLeft className="h-4 w-4" /> Boshqa o'yinlar
          </Button>
        </Link>
        <Link href="/games/stats">
          <Button variant="ghost">
            <BarChart3 className="h-4 w-4" /> Statistika
          </Button>
        </Link>
      </div>

      {/* ------------------------------ Saqlash ------------------------------- */}
      <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <p className="mb-1 text-xs font-semibold text-slate-700">
          Natijalarni saqlash — har o'yinchi alohida yozuv bo'ladi
        </p>
        <p className="mb-2.5 text-[11px] text-slate-500">
          O'quvchini ro'yxatdan tanlang (yoki kiritilgan ism bilan saqlanadi). Saqlangan natijalar{" "}
          <Link href="/games/stats" className="font-medium text-indigo-600 underline">
            o'yinlar statistikasi
          </Link>
          da ko'rinadi.
        </p>

        {saved ? (
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-600">
            <Check className="h-4 w-4" /> {savable.length} ta natija saqlandi
          </p>
        ) : savable.length === 0 ? (
          <p className="text-xs text-slate-500">
            Hech kim savol bajarmadi — saqlanadigan natija yo'q.
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              {outcomes.map((o) => {
                const theme = themeFor(o.index);
                return (
                  <div key={o.index} className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", theme.dot)} />
                    <span className="w-28 shrink-0 truncate text-xs font-medium text-slate-700 sm:w-36">
                      {o.name} · {o.score}/{o.answered}
                    </span>
                    <Select
                      value={picks[o.index] ?? ""}
                      onChange={(e) => setPicks((prev) => ({ ...prev, [o.index]: e.target.value }))}
                      className="flex-1 py-1.5 text-xs"
                      aria-label={`${o.name} uchun o'quvchi tanlash`}
                    >
                      <option value="">— ism bilan saqlansin ({o.name}) —</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name}
                        </option>
                      ))}
                    </Select>
                  </div>
                );
              })}
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <Button onClick={save} disabled={saving} variant="success" className="px-3 py-1.5 text-xs">
                {saving ? "Saqlanmoqda…" : `Saqlash (${savable.length} ta)`}
              </Button>
              {outcomes.length - savable.length > 0 ? (
                <span className="text-[11px] text-slate-400">
                  {outcomes.length - savable.length} ta o'yinchi hech narsa bajarmadi — saqlanmaydi
                </span>
              ) : null}
            </div>
          </>
        )}

        {problems.length ? (
          <p className="mt-2 text-[11px] text-red-600">
            Saqlashda xato: {problems[0]}
            {problems.length > 1 ? ` (+${problems.length - 1} ta)` : ""}
          </p>
        ) : null}
      </div>
    </div>
  );
}
