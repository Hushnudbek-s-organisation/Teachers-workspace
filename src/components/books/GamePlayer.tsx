"use client";

// ============================================================================
// O'yin oqimi: boshlash ekrani → o'yin maydoni → natija ekrani
//
//   1 kishi  → to'liq ekran (avvalgi oqim, o'zgarmagan)
//   2–3 kishi → bo'lingan ekran: har o'yinchining o'z maydoni, o'z hisobi
//               (MultiplayerArena), natijalar yonma-yon (MultiplayerDone)
//
// Rejim tanlash SHU YERDA (GamePlayer darajasida) — barcha o'yin turlari va
// o'qituvchi yasagan o'yinlar uchun bir xil ishlaydi, taxtalar esa qayta
// yozilmagan: bitta komponent har maydonda alohida props bilan render bo'ladi.
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, RotateCcw, Star, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { GAME_TYPES } from "@/lib/books/types";
import type { Game } from "@/lib/books/types";
import {
  clampSetup,
  defaultSetup,
  describeSetup,
  resultMessage,
  type GameSetup,
  type PlayerOutcome,
} from "@/lib/books/multiplayer";
import { Button, Card, Select } from "@/components/ui";
import { actionSaveGameResults } from "@/app/books/actions";
import { PlayArea } from "./PlayArea";
import { MultiplayerSetup, type StudentOption } from "./MultiplayerSetup";
import { MultiplayerArena } from "./MultiplayerArena";
import { MultiplayerDone } from "./MultiplayerDone";

function freshSetup(game: Game): GameSetup {
  return clampSetup(defaultSetup(game.type, game.items.length), game.type, game.items.length);
}

export function GamePlayer({
  game,
  bookId,
  bookTitle,
  topicId,
  topicTitle,
  students,
  saveBookId = null,
}: {
  game: Game;
  bookId: string;
  bookTitle: string;
  topicId: string;
  topicTitle: string;
  students: StudentOption[];
  /** Natija yoziladigan haqiqiy kitob id (o'qituvchi o'yinida null bo'lishi mumkin) */
  saveBookId?: string | null;
}) {
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [setup, setSetup] = useState<GameSetup>(() => freshSetup(game));
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(game.items.length);
  const [outcomes, setOutcomes] = useState<PlayerOutcome[] | null>(null);
  const [startedAt, setStartedAt] = useState<number>(0);
  const [runId, setRunId] = useState(0);
  const meta = GAME_TYPES[game.type];

  // Boshqa o'yinga o'tilganda (client navigatsiya) holatni tozalaymiz
  useEffect(() => {
    setPhase("intro");
    setScore(0);
    setTotal(game.items.length);
    setOutcomes(null);
    setSetup(freshSetup(game));
  }, [game.id, game.type, game.items.length]);

  const multi = setup.players > 1;

  // Chegaralar (savollar soni, ismlar, minut) shu yerda qo'llanadi —
  // yozib bo'lgach, shuning uchun maydonlarni tozalab qayta yozish mumkin.
  const start = () => {
    setSetup((prev) => clampSetup(prev, game.type, game.items.length));
    setScore(0);
    setTotal(game.items.length);
    setOutcomes(null);
    setStartedAt(Date.now());
    setRunId((r) => r + 1);
    setPhase("play");
  };

  const elapsedSec = useMemo(
    () => (startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : 1),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startedAt, phase]
  );

  const containerClass = cn(
    "mx-auto",
    phase === "play" && multi ? "max-w-7xl" : multi ? "max-w-4xl" : "max-w-3xl"
  );

  return (
    <div className={containerClass}>
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={bookId.startsWith("custom-") ? "/games" : `/books/${bookId}`}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Kitobga qaytish
        </Link>
      </div>

      <Card className="overflow-hidden">
        <div className={cn("bg-gradient-to-r px-5 py-4 text-white", gradientFor(game.type))}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{meta.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold">{game.title}</p>
              <p className="truncate text-xs text-white/80">
                {bookTitle} · {topicTitle}
                {game.builtFrom.pages.length ? ` · ${game.builtFrom.pages.join(", ")}-betlar` : ""}
              </p>
            </div>
            {multi ? (
              <span className="hidden shrink-0 items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white sm:inline-flex">
                <Users className="h-3.5 w-3.5" /> {setup.players} kishi
              </span>
            ) : null}
          </div>
        </div>

        <div className={phase === "play" && multi ? "p-2.5 sm:p-4" : "p-3 sm:p-5"}>
          {phase === "intro" ? (
            <IntroScreen
              game={game}
              setup={setup}
              students={students}
              onSetup={setSetup}
              onStart={start}
            />
          ) : phase === "play" ? (
            multi ? (
              <MultiplayerArena
                key={runId}
                game={game}
                setup={setup}
                onDone={(results) => {
                  setOutcomes(results);
                  setPhase("done");
                }}
              />
            ) : (
              <PlayArea
                key={runId}
                game={game}
                onFinish={(s, t) => {
                  setScore(s);
                  setTotal(t);
                  setPhase("done");
                }}
              />
            )
          ) : multi && outcomes ? (
            <MultiplayerDone
              game={game}
              outcomes={outcomes}
              setup={setup}
              students={students}
              bookId={bookId}
              saveBookId={saveBookId}
              topicId={topicId}
              topicTitle={topicTitle}
              onRestart={start}
            />
          ) : (
            <DoneScreen
              score={score}
              total={total}
              game={game}
              bookId={bookId}
              saveBookId={saveBookId}
              topicId={topicId}
              topicTitle={topicTitle}
              students={students}
              elapsedSec={elapsedSec}
              onRestart={start}
            />
          )}
        </div>
      </Card>

      {phase === "play" && multi ? (
        <p className="mt-3 text-center text-xs text-slate-400">{describeSetup(setup, game.type)}</p>
      ) : phase !== "play" ? (
        <p className="mt-4 text-center text-xs text-slate-400">
          {game.builtFrom.pages.length
            ? `Bu o'yin kitobning ${game.builtFrom.pages.join(", ")}-betlaridagi materiallar asosida yasaldi.`
            : game.builtFrom.note}
        </p>
      ) : null}
    </div>
  );
}

function gradientFor(type: Game["type"]): string {
  switch (type) {
    case "quiz":
      return "from-indigo-500 to-violet-500";
    case "math":
      return "from-orange-500 to-amber-500";
    case "fill":
      return "from-amber-500 to-yellow-500";
    case "truefalse":
      return "from-sky-500 to-cyan-500";
    case "matching":
      return "from-emerald-500 to-teal-500";
    case "memory":
      return "from-fuchsia-500 to-pink-500";
    case "order":
      return "from-violet-500 to-purple-600";
    case "pop":
      return "from-rose-500 to-orange-500";
    case "puzzle":
      return "from-teal-500 to-emerald-600";
    case "missingletter":
      return "from-cyan-500 to-blue-600";
    case "findmistake":
      return "from-yellow-500 to-amber-600";
    case "grouping":
      return "from-blue-500 to-indigo-600";
    case "bingo":
      return "from-pink-500 to-rose-600";
    default:
      return "from-slate-500 to-slate-700";
  }
}

// ---------------------------------------------------------------------------

function IntroScreen({
  game,
  setup,
  students,
  onSetup,
  onStart,
}: {
  game: Game;
  setup: GameSetup;
  students: StudentOption[];
  onSetup: (next: GameSetup) => void;
  onStart: () => void;
}) {
  const meta = GAME_TYPES[game.type];
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center sm:py-6">
      <div className="text-6xl">{meta.emoji}</div>
      <p className="text-lg font-semibold text-slate-800">{meta.hint}</p>
      <div className="flex flex-wrap justify-center gap-2 text-xs">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
          {game.items.length} ta savol
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
          Qiyinlik: {"⭐".repeat(game.difficulty)}
        </span>
        {game.groups?.length ? (
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700">
            Guruhlar: {game.groups.join(" · ")}
          </span>
        ) : null}
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
          {game.builtFrom.note}
        </span>
      </div>

      <MultiplayerSetup
        gameType={game.type}
        itemsCount={game.items.length}
        setup={setup}
        students={students}
        onChange={onSetup}
      />

      <Button onClick={onStart} className="mt-1 px-8 py-3 text-base">
        Boshlash ▶
      </Button>
    </div>
  );
}

function DoneScreen({
  score,
  total,
  game,
  bookId,
  saveBookId,
  topicId,
  topicTitle,
  students,
  elapsedSec,
  onRestart,
}: {
  score: number;
  total: number;
  game: Game;
  bookId: string;
  saveBookId: string | null;
  topicId: string;
  topicTitle: string;
  students: StudentOption[];
  elapsedSec: number;
  onRestart: () => void;
}) {
  const router = useRouter();
  const percent = total ? Math.round((score / total) * 100) : 0;
  const stars = percent >= 90 ? 3 : percent >= 70 ? 2 : percent >= 40 ? 1 : 0;
  const [studentId, setStudentId] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const message = resultMessage(percent);

  const save = async () => {
    setSaving(true);
    setProblem(null);
    try {
      const student = students.find((s) => s.id === studentId);
      const res = await actionSaveGameResults([
        {
          bookId: saveBookId,
          topicId,
          topicTitle,
          gameId: game.id,
          gameTitle: game.title,
          gameType: game.type,
          studentId: student?.id ?? null,
          studentName: student?.full_name ?? null,
          score,
          total,
          timeSec: elapsedSec,
        },
      ]);
      if (res.saved > 0) {
        setSaved(true);
        router.refresh();
      } else {
        setProblem(res.problems[0] ?? "Natijani saqlab bo'lmadi");
      }
    } catch (err) {
      setProblem(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <Trophy className={cn("h-14 w-14", percent >= 70 ? "text-amber-400" : "text-slate-300")} />
      <div>
        <p className="text-3xl font-bold text-slate-900">
          {score} / {total}
        </p>
        <p className="mt-1 text-sm font-medium text-slate-500">{percent}% to'g'ri javob</p>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <Star
            key={i}
            className={cn("h-7 w-7", i < stars ? "fill-amber-400 text-amber-400" : "text-slate-200")}
          />
        ))}
      </div>
      <p className="max-w-sm text-sm text-slate-600">{message}</p>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Button variant="secondary" onClick={onRestart}>
          <RotateCcw className="h-4 w-4" /> Yana o'ynash
        </Button>
        <Link href={bookId.startsWith("custom-") ? "/games" : `/books/${bookId}`}>
          <Button variant="primary">
            <ArrowLeft className="h-4 w-4" /> Boshqa o'yinlar
          </Button>
        </Link>
      </div>

      <div className="mt-4 w-full max-w-md rounded-xl border border-slate-200 bg-slate-50 p-3 text-left">
        <p className="mb-2 text-xs font-medium text-slate-600">
          Natijani o'quvchiga yozib qo'yish (ixtiyoriy)
        </p>
        {saved ? (
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-600">
            <Check className="h-4 w-4" /> Natija saqlandi
          </p>
        ) : (
          <>
            <div className="flex gap-2">
              <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="flex-1">
                <option value="">— o'quvchini tanlang —</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </Select>
              <Button onClick={save} disabled={!studentId || saving} variant="success">
                {saving ? "..." : "Saqlash"}
              </Button>
            </div>
            {problem ? <p className="mt-2 text-[11px] text-red-600">{problem}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
