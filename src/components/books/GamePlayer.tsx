"use client";

// ============================================================================
// O'yin maydoni — 7 xil o'yin turini o'ynaydigan interfeys
//   quiz · math · fill · truefalse  → savol-javob taxtasi
//   matching                        → juftlarni ulash
//   memory                          → xotira kartalari
//   order                           → tartiblash
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  RotateCcw,
  Star,
  Trophy,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GAME_TYPES } from "@/lib/books/types";
import type {
  FillItem,
  Game,
  GameItem,
  MatchingItem,
  MathItem,
  MissingLetterItem,
  OrderItem,
  PuzzleItem,
  QuizItem,
  TextItem,
  TrueFalseItem,
} from "@/lib/books/types";
import { Button, Card, Select } from "@/components/ui";
import { actionSaveResult } from "@/app/books/actions";
import {
  BingoBoard,
  GroupingBoard,
  MissingLetterBoard,
  PopBoard,
  PuzzleBoard,
  textsFromItems,
} from "./GameBoards";
import { Progress, shuffleStable } from "./board-utils";

interface StudentOption {
  id: string;
  full_name: string;
}

export function GamePlayer({
  game,
  bookId,
  bookTitle,
  topicId,
  topicTitle,
  students,
}: {
  game: Game;
  bookId: string;
  bookTitle: string;
  topicId: string;
  topicTitle: string;
  students: StudentOption[];
}) {
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(game.items.length);
  const [startedAt, setStartedAt] = useState<number>(0);
  const meta = GAME_TYPES[game.type];

  const restart = () => {
    setScore(0);
    setTotal(game.items.length);
    setPhase("play");
    setStartedAt(Date.now());
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={`/books/${bookId}`}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Kitobga qaytish
        </Link>
      </div>

      <Card className="overflow-hidden">
        <div className={cn("bg-gradient-to-r px-5 py-4 text-white", gradientFor(game.type))}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{meta.emoji}</span>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold">{game.title}</p>
              <p className="truncate text-xs text-white/80">
                {bookTitle} · {topicTitle} · {game.builtFrom.pages.join(", ")}-betlar
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          {phase === "intro" ? (
            <IntroScreen game={game} onStart={restart} />
          ) : phase === "play" ? (
            <PlayArea
              game={game}
              onFinish={(s, t) => {
                setScore(s);
                setTotal(t);
                setPhase("done");
              }}
            />
          ) : (
            <DoneScreen
              score={score}
              total={total}
              game={game}
              bookId={bookId}
              topicId={topicId}
              topicTitle={topicTitle}
              students={students}
              elapsedSec={Math.max(1, Math.round((Date.now() - startedAt) / 1000))}
              onRestart={restart}
            />
          )}
        </div>
      </Card>

      {phase !== "play" ? (
        <p className="mt-4 text-center text-xs text-slate-400">
          Bu o'yin kitobning {game.builtFrom.pages.join(", ")}-betlaridagi materiallar asosida yasaldi.
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

function IntroScreen({ game, onStart }: { game: Game; onStart: () => void }) {
  const meta = GAME_TYPES[game.type];
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
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
      <Button onClick={onStart} className="mt-2 px-8 py-3 text-base">
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

  const message =
    percent >= 90
      ? "Zo'r! Sen bu mavzuni mukammal bilasan! 🎉"
      : percent >= 70
        ? "Yaxshi natija! Yana ozgina mashq qilsang, a'lo bo'ladi 💪"
        : percent >= 40
          ? "Yomon emas! Mavzuni takrorlab, yana urinib ko'r 📖"
          : "Mavzuni qayta o'qib, yana bir bor sinab ko'r. Sen uddalaysan! 🌟";

  const save = async () => {
    setSaving(true);
    try {
      const student = students.find((s) => s.id === studentId);
      await actionSaveResult({
        bookId,
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
      });
      setSaved(true);
      router.refresh();
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
        <Link href={`/books/${bookId}`}>
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
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// O'yin maydonlari
// ---------------------------------------------------------------------------

function PlayArea({ game, onFinish }: { game: Game; onFinish: (score: number, total: number) => void }) {
  switch (game.type) {
    case "matching":
      return <MatchingBoard items={game.items as MatchingItem[]} onFinish={onFinish} />;
    case "memory":
      return <MemoryBoard items={game.items as MatchingItem[]} onFinish={onFinish} />;
    case "order":
      return <OrderBoard items={game.items as OrderItem[]} onFinish={onFinish} />;
    case "pop":
      return <PopBoard items={game.items as MathItem[]} onFinish={onFinish} />;
    case "puzzle":
      return <PuzzleBoard items={game.items as PuzzleItem[]} onFinish={onFinish} />;
    case "missingletter":
      return <MissingLetterBoard items={game.items as MissingLetterItem[]} onFinish={onFinish} />;
    case "grouping":
      return (
        <GroupingBoard
          items={game.items as MatchingItem[]}
          groups={game.groups ?? []}
          onFinish={onFinish}
        />
      );
    case "bingo": {
      const texts = game.items.every((i) => "text" in i) ? (game.items as TextItem[]) : textsFromItems(game.items);
      return <BingoBoard items={texts} title={game.title} onFinish={onFinish} />;
    }
    default:
      return <QuestionBoard game={game} onFinish={onFinish} />;
  }
}

// ------------------------------ Savol taxtasi ------------------------------

function QuestionBoard({ game, onFinish }: { game: Game; onFinish: (s: number, t: number) => void }) {
  const items = game.items;
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const item = items[index];
  const view = useMemo(() => itemView(item), [item]);

  useEffect(() => {
    setSelected(null);
    setRevealed(false);
  }, [index]);

  const pick = (i: number) => {
    if (revealed) return;
    setSelected(i);
    const correct = i === view.correctIndex;
    if (correct) setScore((s) => s + 1);
    setRevealed(true);
    setTimeout(() => {
      if (index + 1 >= items.length) onFinish(score + (correct ? 1 : 0), items.length);
      else setIndex((v) => v + 1);
    }, correct ? 700 : 1200);
  };

  return (
    <div>
      <Progress index={index} total={items.length} score={score} />

      <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center">
        {game.type === "math" ? (
          <p className="text-3xl font-bold tracking-wide text-slate-900 sm:text-4xl">
            {(item as MathItem).expression}
          </p>
        ) : (
          <p className="text-lg font-semibold leading-relaxed text-slate-900 sm:text-xl">{view.question}</p>
        )}
        {view.hint ? <p className="mt-2 text-xs text-slate-400">{view.hint}</p> : null}
      </div>

      {game.type === "truefalse" ? (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "To'g'ri", emoji: "✅", value: true },
            { label: "Noto'g'ri", emoji: "❌", value: false },
          ].map((opt) => {
            const isAnswer = view.correctIndex === (opt.value ? 0 : 1);
            const chosen = selected != null && selected === (opt.value ? 0 : 1);
            return (
              <button
                key={opt.label}
                onClick={() => pick(opt.value ? 0 : 1)}
                disabled={revealed}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl border-2 px-4 py-6 text-lg font-bold transition-all",
                  revealed && isAnswer
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                    : chosen
                      ? "border-red-300 bg-red-50 text-red-600"
                      : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                )}
              >
                <span className="text-3xl">{opt.emoji}</span>
                {opt.label}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {view.options.map((opt, i) => {
            const isAnswer = i === view.correctIndex;
            const chosen = selected === i;
            return (
              <button
                key={`${opt}-${i}`}
                onClick={() => pick(i)}
                disabled={revealed}
                className={cn(
                  "flex min-h-[56px] items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-base font-medium transition-all",
                  revealed && isAnswer
                    ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                    : chosen
                      ? "border-red-300 bg-red-50 text-red-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                )}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt}</span>
                {revealed && isAnswer ? <Check className="h-5 w-5 text-emerald-500" /> : null}
                {revealed && chosen && !isAnswer ? <X className="h-5 w-5 text-red-500" /> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface ItemView {
  question: string;
  options: string[];
  correctIndex: number;
  hint?: string;
}

/** Har xil turdagi elementni yagona ko'rinishga keltiradi */
function itemView(item: GameItem): ItemView {
  if ("options" in item) {
    const anyItem = item as QuizItem | FillItem | MathItem;
    const options = (anyItem.options as Array<string | number>).map(String);
    if ("expression" in item) {
      return { question: (item as MathItem).expression, options, correctIndex: options.indexOf(String((item as MathItem).answer)) };
    }
    if ("sentence" in item) {
      return {
        question: (item as FillItem).sentence.replace(/_{2,}/g, "______"),
        options,
        correctIndex: options.indexOf((item as FillItem).answer),
      };
    }
    const q = item as QuizItem;
    return { question: q.question, options, correctIndex: q.answer, hint: q.hint };
  }
  const tf = item as TrueFalseItem;
  return { question: tf.statement, options: ["To'g'ri", "Noto'g'ri"], correctIndex: tf.isTrue ? 0 : 1 };
}

// ------------------------------ Juftlarni ulash ----------------------------

function MatchingBoard({ items, onFinish }: { items: MatchingItem[]; onFinish: (s: number, t: number) => void }) {
  const leftCards = useMemo(() => shuffleStable(items.map((it, i) => ({ i, text: it.left })), 5), [items]);
  const rightCards = useMemo(() => shuffleStable(items.map((it, i) => ({ i, text: it.right })), 11), [items]);

  const [matched, setMatched] = useState<number[]>([]);
  const [leftSel, setLeftSel] = useState<number | null>(null);
  const [rightWrong, setRightWrong] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const tryMatch = (leftIndex: number, rightIndex: number, rightText: string) => {
    if (matched.includes(leftIndex) || matched.includes(rightIndex)) return;
    const correct = items[leftIndex].right === rightText && leftIndex === rightIndex;
    if (correct) {
      const next = [...matched, leftIndex];
      setMatched(next);
      setLeftSel(null);
      setDragging(null);
      if (next.length === items.length) {
        const score = Math.max(0, items.length - mistakes);
        setTimeout(() => onFinish(score, items.length), 700);
      }
    } else {
      setMistakes((m) => m + 1);
      setRightWrong(rightIndex);
      setTimeout(() => {
        setRightWrong(null);
        setLeftSel(null);
        setDragging(null);
      }, 650);
    }
  };

  const done = matched.length === items.length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-xs font-medium text-slate-500">
        <span>Xato urinishlar: {mistakes}</span>
        <span className="text-emerald-600">
          ✓ {matched.length} / {items.length} juftlik
        </span>
      </div>
      <p className="mb-4 text-center text-sm text-slate-500">
        Chapdagi kartani <b>sudrab</b> o'ngdagi mos javobga tashlang (yoki avval chapni, keyin o'ngni bosing)
      </p>

      <div className="flex items-stretch gap-3">
        {/* Chap ustun */}
        <div className="flex flex-1 flex-col gap-2">
          {leftCards.map((c) => {
            const isMatched = matched.includes(c.i);
            return (
              <div
                key={`l${c.i}`}
                draggable={!isMatched && !done}
                onDragStart={() => setDragging(c.i)}
                onDragEnd={() => setDragging(null)}
                onClick={() => !isMatched && setLeftSel(c.i)}
                className={cn(
                  "select-none rounded-xl border-2 px-3 py-3 text-sm font-medium transition-all",
                  isMatched
                    ? "border-emerald-300 bg-emerald-50 text-emerald-600 opacity-70"
                    : leftSel === c.i
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200"
                      : "cursor-grab border-slate-200 bg-white text-slate-700 hover:border-indigo-300 active:cursor-grabbing",
                  dragging === c.i && "opacity-40"
                )}
              >
                {c.text}
              </div>
            );
          })}
        </div>

        {/* Ulash chizig'i */}
        <div className="flex flex-col items-center justify-center px-1 text-slate-300">
          <span className="text-xs">⇒</span>
        </div>

        {/* O'ng ustun (tashlash maydonlari) */}
        <div className="flex flex-1 flex-col gap-2">
          {rightCards.map((c) => {
            const isMatched = matched.includes(c.i);
            return (
              <div
                key={`r${c.i}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(c.i);
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(null);
                  if (dragging == null) return;
                  tryMatch(dragging, c.i, c.text);
                }}
                onClick={() => leftSel != null && tryMatch(leftSel, c.i, c.text)}
                className={cn(
                  "rounded-xl border-2 px-3 py-3 text-sm font-medium transition-all",
                  isMatched
                    ? "border-emerald-300 bg-emerald-50 text-emerald-600 opacity-70"
                    : rightWrong === c.i
                      ? "border-red-400 bg-red-50 text-red-600"
                      : dragOver === c.i
                        ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200"
                        : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300",
                  leftSel == null && !isMatched && dragging == null && "opacity-70"
                )}
              >
                {c.text}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ------------------------------ Xotira kartalari ---------------------------

interface MemoryCard {
  id: number;
  text: string;
  pairId: number;
  flipped: boolean;
  done: boolean;
}

function MemoryBoard({ items, onFinish }: { items: MatchingItem[]; onFinish: (s: number, t: number) => void }) {
  const deck = useMemo<MemoryCard[]>(() => {
    const cards: MemoryCard[] = [];
    items.forEach((p, i) => {
      cards.push({ id: i * 2, text: p.left, pairId: i, flipped: false, done: false });
      cards.push({ id: i * 2 + 1, text: p.right, pairId: i, flipped: false, done: false });
    });
    return shuffleStable(cards, items.length);
  }, [items]);

  const [cards, setCards] = useState<MemoryCard[]>(deck);
  const [open, setOpen] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [tries, setTries] = useState(0);

  useEffect(() => {
    setCards(deck);
    setOpen([]);
    setScore(0);
    setTries(0);
  }, [deck]);

  const flip = (card: MemoryCard) => {
    if (card.flipped || card.done || open.length >= 2) return;
    const nextCards = cards.map((c) => (c.id === card.id ? { ...c, flipped: true } : c));
    const nextOpen = [...open, card.id];
    setCards(nextCards);
    setOpen(nextOpen);

    if (nextOpen.length === 2) {
      setTries((t) => t + 1);
      const [a, b] = nextOpen.map((id) => nextCards.find((c) => c.id === id)!);
      const isPair = a.pairId === b.pairId;
      setTimeout(() => {
        setCards((prev) =>
          prev.map((c) =>
            c.id === a.id || c.id === b.id ? { ...c, done: isPair, flipped: isPair } : c
          )
        );
        if (isPair) setScore((s) => s + 1);
        setOpen([]);
      }, isPair ? 350 : 850);
    }
  };

  const allDone = cards.length > 0 && cards.every((c) => c.done);

  useEffect(() => {
    if (allDone) {
      const t = setTimeout(() => onFinish(score, items.length), 700);
      return () => clearTimeout(t);
    }
  }, [allDone, onFinish, score, items.length]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-xs font-medium text-slate-500">
        <span>Urinishlar: {tries}</span>
        <span className="text-emerald-600">
          ✓ {score} / {items.length} juftlik
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {cards.map((c) => (
          <button
            key={c.id}
            onClick={() => flip(c)}
            className={cn(
              "flex min-h-[86px] items-center justify-center rounded-xl border-2 p-2 text-center text-sm font-semibold transition-all",
              c.done
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : c.flipped
                  ? "border-indigo-300 bg-white text-slate-800"
                  : "border-transparent bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white hover:brightness-110"
            )}
          >
            {c.flipped || c.done ? c.text : "?"}
          </button>
        ))}
      </div>
    </div>
  );
}

// --------------------------------- Tartiblash ------------------------------

function OrderBoard({ items, onFinish }: { items: OrderItem[]; onFinish: (s: number, t: number) => void }) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const item = items[index];
  const shuffled = useMemo(() => (item ? shuffleStable(item.tokens, index * 13 + 3) : []), [item, index]);
  const [picked, setPicked] = useState<string[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);

  useEffect(() => {
    setPicked([]);
    setChecked(null);
  }, [index]);

  if (!item) return null;

  const available = [...shuffled];
  picked.forEach((p) => {
    const i = available.indexOf(p);
    if (i >= 0) available.splice(i, 1);
  });

  const check = () => {
    const correct = picked.every((p, i) => p === item.tokens[i]);
    setChecked(correct);
    if (correct) setScore((s) => s + 1);
    setTimeout(() => {
      if (index + 1 >= items.length) onFinish(score + (correct ? 1 : 0), items.length);
      else setIndex((v) => v + 1);
    }, correct ? 700 : 1400);
  };

  const reset = () => {
    setPicked([]);
    setChecked(null);
  };

  return (
    <div>
      <Progress index={index} total={items.length} score={score} />
      <p className="mb-3 text-center text-sm font-medium text-slate-600">{item.prompt}</p>

      <div
        className={cn(
          "mb-4 min-h-[76px] rounded-xl border-2 border-dashed p-3",
          checked === true
            ? "border-emerald-400 bg-emerald-50"
            : checked === false
              ? "border-red-300 bg-red-50"
              : "border-slate-300 bg-slate-50"
        )}
      >
        {picked.length === 0 ? (
          <p className="py-3 text-center text-xs text-slate-400">Quyidagi so'zlarni bosib shu yerga joylashtiring</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {picked.map((p, i) => (
              <button
                key={`${p}-${i}`}
                onClick={() => !checked && setPicked(picked.filter((_, j) => j !== i))}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 hover:border-red-300 hover:text-red-600"
              >
                {i + 1}. {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {checked === false ? (
        <p className="mb-3 text-center text-xs text-red-600">
          To'g'ri tartib: {item.tokens.map((t, i) => `${i + 1}) ${t}`).join("  ")}
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {available.map((t, i) => (
          <button
            key={`${t}-${i}`}
            onClick={() => setPicked((p) => [...p, t])}
            disabled={checked != null}
            className="rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-all hover:border-violet-300 hover:bg-violet-50 disabled:opacity-40"
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-2">
        <Button variant="secondary" onClick={reset} disabled={checked != null || !picked.length}>
          <RotateCcw className="h-4 w-4" /> Tozalash
        </Button>
        <Button onClick={check} disabled={picked.length !== item.tokens.length || checked != null}>
          <Check className="h-4 w-4" /> Tekshirish
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

