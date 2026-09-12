"use client";

// ============================================================================
// 🏆 GURUHLAR VIKTORINASI (Kahoot uslubida)
//   Savol doskada katta ko'rinadi, guruhlar javob beradi, o'qituvchi ball qo'yadi.
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import { QUIZ_SECONDS_PER_QUESTION } from "@/lib/config";
import {
  Check,
  Minus,
  Plus,
  RotateCcw,
  Shuffle,
  Timer,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { shuffleStable } from "@/components/books/board-utils";

import type { QuizQuestion } from "@/lib/books/quiz-pool";
export type { QuizQuestion };

interface Team {
  id: number;
  name: string;
  color: string;
  score: number;
}

const TEAM_COLORS = [
  "from-indigo-500 to-blue-600",
  "from-rose-500 to-pink-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
];

export function TeamQuiz({
  pools,
}: {
  pools: { bookId: string; bookTitle: string; questions: QuizQuestion[] }[];
}) {
  const [bookId, setBookId] = useState(pools[0]?.bookId ?? "");
  const pool = useMemo(() => pools.find((p) => p.bookId === bookId)?.questions ?? [], [pools, bookId]);

  const [teams, setTeams] = useState<Team[]>(() =>
    ["1-guruh", "2-guruh"].map((name, i) => ({ id: i, name, color: TEAM_COLORS[i], score: 0 }))
  );
  const [order, setOrder] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [seconds, setSeconds] = useState(QUIZ_SECONDS_PER_QUESTION);
  const [running, setRunning] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);

  // Savollar tartibi
  useEffect(() => {
    setOrder(shuffleStable(pool.map((_, i) => i), 13));
    setIndex(0);
    setRevealed(false);
    setPicked(null);
  }, [pool]);

  const question = pool[order[index] ?? 0];
  const finished = order.length > 0 && index >= order.length;

  // Taymer
  useEffect(() => {
    if (!running || seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [running, seconds]);

  useEffect(() => {
    if (seconds === 0) setRunning(false);
  }, [seconds]);

  const nextQuestion = () => {
    setIndex((v) => v + 1);
    setRevealed(false);
    setPicked(null);
    setSeconds(QUIZ_SECONDS_PER_QUESTION);
    setRunning(false);
  };

  const award = (teamId: number, points: number) => {
    setTeams((prev) => prev.map((t) => (t.id === teamId ? { ...t, score: Math.max(0, t.score + points) } : t)));
  };

  const addTeam = () => {
    if (teams.length >= 4) return;
    const id = teams.length;
    setTeams((prev) => [...prev, { id, name: `${id + 1}-guruh`, color: TEAM_COLORS[id], score: 0 }]);
  };

  const restart = () => {
    setOrder(shuffleStable(pool.map((_, i) => i), Date.now() % 9999));
    setIndex(0);
    setRevealed(false);
    setPicked(null);
    setSeconds(QUIZ_SECONDS_PER_QUESTION);
    setRunning(false);
    setTeams((prev) => prev.map((t) => ({ ...t, score: 0 })));
  };

  return (
    <div className="space-y-4">
      {/* Boshqaruv */}
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[220px] flex-1">
          <Field label="Savollar manbasi (kitob)">
            <Select value={bookId} onChange={(e) => setBookId(e.target.value)}>
              {pools.map((p) => (
                <option key={p.bookId} value={p.bookId}>
                  {p.bookTitle} ({p.questions.length} savol)
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={addTeam} disabled={teams.length >= 4}>
            <Plus className="h-4 w-4" /> Guruh qo'shish
          </Button>
          <Button variant="secondary" onClick={restart}>
            <RotateCcw className="h-4 w-4" /> Qaytadan
          </Button>
        </div>
      </Card>

      {/* Hisob taxtasi */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(teams.length, 4)}, minmax(0,1fr))` }}>
        {teams.map((t) => (
          <Card key={t.id} className="overflow-hidden">
            <div className={cn("bg-gradient-to-r px-4 py-2 text-white", t.color)}>
              <input
                value={t.name}
                onChange={(e) =>
                  setTeams((prev) => prev.map((x) => (x.id === t.id ? { ...x, name: e.target.value } : x)))
                }
                className="w-full bg-transparent text-sm font-bold text-white placeholder:text-white/60 focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-between p-3">
              <span className="text-3xl font-bold text-slate-900">{t.score}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => award(t.id, 1)}
                  className="rounded-lg bg-emerald-50 p-2 text-emerald-600 transition-colors hover:bg-emerald-100"
                  title="+1 ball"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => award(t.id, -1)}
                  className="rounded-lg bg-slate-50 p-2 text-slate-500 transition-colors hover:bg-slate-100"
                  title="−1 ball"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setTeams((prev) => prev.filter((x) => x.id !== t.id))}
                  className="rounded-lg bg-red-50 p-2 text-red-500 transition-colors hover:bg-red-100"
                  title="Guruhni o'chirish"
                  disabled={teams.length <= 2}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Savol */}
      {finished ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <Trophy className="h-14 w-14 text-amber-400" />
          <p className="text-2xl font-bold text-slate-900">Viktorina yakunlandi!</p>
          <div className="mt-2 space-y-1">
            {[...teams]
              .sort((a, b) => b.score - a.score)
              .map((t, i) => (
                <p key={t.id} className="text-sm text-slate-600">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} <b>{t.name}</b> — {t.score} ball
                </p>
              ))}
          </div>
          <Button className="mt-3" onClick={restart}>
            <RotateCcw className="h-4 w-4" /> Yana o'ynash
          </Button>
        </Card>
      ) : !question ? (
        <Card className="p-8 text-center text-sm text-slate-500">
          Bu kitobda test savollari topilmadi. Boshqa kitobni tanlang yoki o'z o'yiningizni yasang.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
            <span className="text-xs font-medium text-slate-500">
              Savol {index + 1} / {order.length} · {question.source}
            </span>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold",
                  seconds > 10 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                )}
              >
                <Timer className="h-4 w-4" /> {seconds}s
              </span>
              <Button
                variant={running ? "secondary" : "success"}
                className="px-3 py-1.5 text-xs"
                onClick={() => setRunning((v) => !v)}
              >
                {running ? "To'xtatish" : "Boshlash"}
              </Button>
            </div>
          </div>

          <div className="px-5 py-8 text-center">
            <p className="text-xl font-bold leading-snug text-slate-900 sm:text-3xl">{question.question}</p>
          </div>

          <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
            {question.options.map((opt, i) => {
              const isAnswer = i === question.answer;
              const chosen = picked === i;
              return (
                <button
                  key={`${opt}-${i}`}
                  onClick={() => {
                    if (revealed) return;
                    setPicked(i);
                    setRevealed(true);
                    setRunning(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border-2 px-4 py-5 text-left text-base font-semibold transition-all sm:text-lg",
                    revealed && isAnswer
                      ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                      : chosen
                        ? "border-red-300 bg-red-50 text-red-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-indigo-400 hover:bg-indigo-50"
                  )}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {revealed && isAnswer ? <Check className="h-6 w-6 text-emerald-500" /> : null}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3">
            <p className="text-xs text-slate-500">
              {revealed
                ? "Javob ko'rsatildi — to'g'ri javob bergan guruhga ball qo'ying"
                : "Guruhlar javob bergach «Javobni ko'rsatish»ni bosing"}
            </p>
            <div className="flex gap-2">
              {!revealed ? (
                <Button variant="secondary" onClick={() => setRevealed(true)}>
                  Javobni ko'rsatish
                </Button>
              ) : null}
              <Button onClick={nextQuestion}>
                Keyingi savol <Shuffle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      <p className="flex items-center gap-1.5 text-xs text-slate-400">
        <Users className="h-3.5 w-3.5" />
        Doskaga chiqarib o'ynang: savol katta shriftda ko'rinadi, guruhlar qo'l ko'tarib javob beradi.
      </p>
    </div>
  );
}

