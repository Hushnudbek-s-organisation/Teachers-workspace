"use client";

// ============================================================================
// Bo'lingan ekran — bir qurilmada 2 yoki 3 o'yinchi
//
// Qoidalar:
//   • Har o'yinchining O'Z maydoni, O'Z holati (round/items) va O'Z hisobi bor.
//   • Hamma BIRGA boshlaydi va BIR VAQTDA o'ynaydi: kim o'z savolini tugatsa,
//     keyingisiga o'tadi — boshqalar o'zinikini davom ettiradi.
//   • Har kimga HAR XIL savol tushadi (dealRound — bir xil raund uchun bitta
//     seed, elementlar o'yinchilar orasida bo'linadi).
//   • Yakun: "savollar soni" (poyga yoki hammasi tugaguncha) yoki "vaqt".
//
// Joylashuv: telefonda (portrait) maydonlar USTMA-UST, keng ekranda
// (landscape) YONMA-YON — orientation media query orqali (tailwind.config.ts).
// Taxtalar duplikatlanmaydi: bitta <PlayArea> har maydonda alohida props bilan
// render bo'ladi va <FitBox> ichida o'z konteyneriga avto-moslashadi.
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Flag, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Game, GameItem } from "@/lib/books/types";
import {
  dealRound,
  describeSetup,
  formatClock,
  groupOfItem,
  isBoardGame,
  isUnlimited,
  itemsPerRound,
  plannedRounds,
  themeFor,
  type GameSetup,
  type PlayerOutcome,
} from "@/lib/books/multiplayer";
import { Button } from "@/components/ui";
import { FitBox, type BoardProgress } from "./board-utils";
import { PlayArea } from "./PlayArea";

interface Runtime {
  index: number;
  name: string;
  studentId: string | null;
  /** Hozirgi raund (0 dan boshlanadi) */
  round: number;
  /** Shu raund uchun o'yinchiga tushgan elementlar */
  items: GameItem[];
  /** Tugagan raundlardan yig'ilgan ball / bajarilgan savollar */
  bankedScore: number;
  bankedTotal: number;
  /** Joriy raundning jonli ko'rsatkichi */
  live: BoardProgress;
  /** Rejadagi hammasini tugatdimi */
  done: boolean;
  /** Oxirgi harakat vaqti (faol o'yinchini ko'rsatish uchun) */
  touchedAt: number;
}

export function playerScore(p: Runtime): number {
  return p.bankedScore + (p.done ? 0 : p.live.score);
}

export function playerAnswered(p: Runtime): number {
  return p.bankedTotal + (p.done ? 0 : p.live.answered);
}

export function MultiplayerArena({
  game,
  setup,
  onDone,
}: {
  game: Game;
  setup: GameSetup;
  onDone: (outcomes: PlayerOutcome[]) => void;
}) {
  const startedAt = useRef(Date.now());
  const endedRef = useRef(false);
  const rounds = plannedRounds(game.type, setup);
  const unlimited = isUnlimited(setup);

  const initial = useMemo<Runtime[]>(
    () =>
      Array.from({ length: setup.players }, (_, i) => ({
        index: i,
        name: setup.names[i] ?? `${i + 1}-o'yinchi`,
        studentId: setup.studentIds[i] ?? null,
        round: 0,
        items: dealRound(game.items, game.type, setup, i, 0, groupOfItem),
        bankedScore: 0,
        bankedTotal: 0,
        live: { answered: 0, score: 0, total: 0 },
        done: false,
        touchedAt: 0,
      })),
    // Arena faqat o'yin boshlanganda quriladi — key orqali qayta ishga tushiriladi
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [players, setPlayers] = useState<Runtime[]>(initial);
  const playersRef = useRef(players);
  playersRef.current = players;

  const [secondsLeft, setSecondsLeft] = useState<number | null>(
    setup.mode === "time" ? Math.max(1, setup.minutes) * 60 : null
  );

  const finish = useCallback(
    (runtimes: Runtime[]) => {
      if (endedRef.current) return;
      endedRef.current = true;
      const elapsed = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
      const outcomes: PlayerOutcome[] = runtimes.map((p) => ({
        index: p.index,
        name: p.name,
        studentId: p.studentId,
        score: playerScore(p),
        answered: playerAnswered(p),
        timeSec: elapsed,
        finishedAll: p.done,
      }));
      onDone(outcomes);
    },
    [onDone]
  );

  const finishRef = useRef(finish);
  finishRef.current = finish;

  // ------------------------------ Hisob (jonli) -----------------------------
  const handleProgress = useCallback((index: number, progress: BoardProgress) => {
    setPlayers((prev) =>
      prev.map((p) => (p.index === index && !p.done ? { ...p, live: progress, touchedAt: Date.now() } : p))
    );
  }, []);

  // --------------------------- Raund yakunlandi ----------------------------
  const handleFinish = useCallback(
    (index: number, score: number, total: number) => {
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.index !== index || p.done) return p;
          const bankedScore = p.bankedScore + score;
          const bankedTotal = p.bankedTotal + total;
          const nextRound = p.round + 1;
          const stop = endedRef.current || (rounds !== null && nextRound >= rounds);
          if (stop) {
            return { ...p, bankedScore, bankedTotal, done: true, live: { answered: 0, score: 0, total: 0 }, touchedAt: Date.now() };
          }
          return {
            ...p,
            bankedScore,
            bankedTotal,
            round: nextRound,
            items: dealRound(game.items, game.type, setup, index, nextRound, groupOfItem),
            live: { answered: 0, score: 0, total: 0 },
            touchedAt: Date.now(),
          };
        })
      );
    },
    [game.items, game.type, rounds, setup]
  );

  // ------------------------------ Yakunlash sharti --------------------------
  useEffect(() => {
    if (endedRef.current || !players.length) return;
    const allDone = players.every((p) => p.done);
    const someoneDone = players.some((p) => p.done);
    if (allDone || (setup.endRule === "first" && someoneDone)) finish(players);
  }, [players, setup.endRule, finish]);

  // --------------------------------- Taymer ---------------------------------
  useEffect(() => {
    if (secondsLeft === null || endedRef.current) return;
    if (secondsLeft <= 0) {
      finishRef.current(playersRef.current);
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  // Faol o'yinchi — oxirgi harakat qilgan (hammasi bir vaqtda o'ynaydi)
  const activeIndex = useMemo(() => {
    const playing = players.filter((p) => !p.done);
    if (!playing.length) return -1;
    return playing.reduce((best, p) => (p.touchedAt >= best.touchedAt ? p : best)).index;
  }, [players]);

  const gridClass = cn(
    "grid grid-cols-1 gap-2.5 sm:gap-3",
    players.length === 2 && "landscape:grid-cols-2",
    players.length >= 3 && "landscape:grid-cols-3"
  );

  const perRound = isBoardGame(game.type)
    ? (players[0]?.items.length ?? game.items.length)
    : itemsPerRound(game.type, game.items.length, setup);

  return (
    <div className="touch-manipulation">
      {/* ------------------------------ Boshqaruv ----------------------------- */}
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-600">
          {describeSetup(setup, game.type)}
        </p>

        {secondsLeft !== null ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
              secondsLeft > 20 ? "bg-white text-slate-700" : "bg-red-50 text-red-600"
            )}
          >
            <Timer className="h-3.5 w-3.5" /> {formatClock(secondsLeft)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500">
            {isBoardGame(game.type)
              ? `Har biriga ${rounds ?? "∞"} taxta · ${perRound} element`
              : `Har biriga ${perRound} savol`}
          </span>
        )}

        <Button
          variant="ghost"
          className="px-2 py-1 text-[11px]"
          onClick={() => finish(playersRef.current)}
          title="O'yinni hozir yakunlab, natijalarni ko'rish"
        >
          <Flag className="h-3.5 w-3.5" /> Yakunlash
        </Button>
      </div>

      {/* ------------------------------- Maydonlar ---------------------------- */}
      <div className={gridClass}>
        {players.map((p) => (
          <PlayerPane
            key={p.index}
            runtime={p}
            active={p.index === activeIndex}
            game={game}
            rounds={rounds}
            unlimited={unlimited}
            onProgress={handleProgress}
            onFinish={handleFinish}
          />
        ))}
      </div>

      <p className="mt-3 text-center text-[11px] text-slate-400 portrait:block landscape:hidden">
        📱 Telefon holati: maydonlar ustma-ust. Ekranni gorizontal qilsangiz — yonma-yon bo'ladi.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bitta o'yinchi maydoni (wrapper) — taxta komponenti ichida ikki/x uch marta
// render bo'ladi, har biriga alohida state va props beriladi.
// ---------------------------------------------------------------------------

function PlayerPane({
  runtime,
  active,
  game,
  rounds,
  unlimited,
  onProgress,
  onFinish,
}: {
  runtime: Runtime;
  active: boolean;
  game: Game;
  rounds: number | null;
  unlimited: boolean;
  onProgress: (index: number, progress: BoardProgress) => void;
  onFinish: (index: number, score: number, total: number) => void;
}) {
  const theme = themeFor(runtime.index);

  const reportProgress = useCallback(
    (progress: BoardProgress) => onProgress(runtime.index, progress),
    [onProgress, runtime.index]
  );
  const reportFinish = useCallback(
    (score: number, total: number) => onFinish(runtime.index, score, total),
    [onFinish, runtime.index]
  );

  const score = playerScore(runtime);
  const answered = playerAnswered(runtime);

  // Taxta o'yinchiga bo'lingan bo'lsa, guruhlar ro'yxatini ham shu to'plamga
  // moslaymiz (bo'sh guruh ustuni chiqib qolmasin).
  const playerGame = useMemo<Game>(() => {
    const groups =
      game.type === "grouping" && game.groups?.length
        ? game.groups.filter((grp) => runtime.items.some((it) => groupOfItem(it) === grp))
        : game.groups;
    return { ...game, items: runtime.items, groups: groups?.length ? groups : game.groups };
  }, [game, runtime.items]);

  return (
    <section
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-2xl border-2 bg-white transition-all",
        runtime.done ? cn(theme.pane, "opacity-80") : active ? theme.paneActive : theme.pane,
        !runtime.done && !active && "opacity-95"
      )}
      aria-label={`${runtime.name} maydoni`}
    >
      <header className={cn("flex flex-wrap items-center gap-1.5 border-b border-slate-200 px-2.5 py-2", theme.head)}>
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", theme.dot)} />
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", theme.chip)}>
          {theme.emoji} {runtime.name}
        </span>

        <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
          ✓ {score}
        </span>
        <span className="text-[11px] font-medium text-slate-500">{answered} ta</span>

        {runtime.done ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            Tugadi ✓
          </span>
        ) : active ? (
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold text-white", theme.dot)}>
            Faol
          </span>
        ) : (
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
            O'ynayapti
          </span>
        )}
      </header>

      <div className="min-w-0 flex-1 touch-manipulation p-2.5 select-none sm:p-3">
        {runtime.done ? (
          <div className="flex flex-col items-center gap-1 py-6 text-center">
            <span className="text-3xl">🎉</span>
            <p className="text-sm font-semibold text-slate-700">{runtime.name} tugatdi!</p>
            <p className="text-xs text-slate-500">
              {score} ball · {answered} ta bajarildi
            </p>
            <p className="text-[11px] text-slate-400">Boshqalar o'ynayotganini kuting…</p>
          </div>
        ) : (
          <FitBox resetKey={runtime.round}>
            <PlayArea
              key={`${runtime.index}-${runtime.round}`}
              game={playerGame}
              compact
              onFinish={reportFinish}
              onProgress={reportProgress}
            />
          </FitBox>
        )}
      </div>

      {!unlimited && rounds !== null && rounds > 1 ? (
        <footer className="border-t border-slate-100 px-2.5 py-1 text-center text-[10px] text-slate-400">
          {Math.min(runtime.round + 1, rounds)} / {rounds}-taxta
        </footer>
      ) : null}
    </section>
  );
}
