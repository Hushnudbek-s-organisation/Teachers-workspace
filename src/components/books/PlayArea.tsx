"use client";

// ============================================================================
// O'yin maydoni tanlagich (dispatcher) va savol-javob taxtalari
//
// Bu fayl BIR xil taxta komponentlarini ham 1 kishilik, ham 2–3 kishilik
// bo'lingan ekran uchun ishlatadi: har o'yinchi maydoniga `items` (o'ziga
// tushgan savollar), `compact` (ixcham ko'rinish) va `onProgress` (jonli hisob)
// alohida beriladi — taxtalar duplikatlanmaydi.
//
//   quiz · math · fill · truefalse · findmistake → QuestionBoard
//   matching · memory · order                    → shu faylda
//   pop · puzzle · missingletter · grouping · bingo → GameBoards.tsx
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { Button } from "@/components/ui";
import {
  BingoBoard,
  GroupingBoard,
  MissingLetterBoard,
  PopBoard,
  PuzzleBoard,
  textsFromItems,
} from "./GameBoards";
import { Progress, shuffleStable, useBoardProgress, type BoardProps } from "./board-utils";

export interface PlayAreaProps extends BoardProps {
  game: Game;
}

/** O'yin turiga mos taxtani tanlaydi */
export function PlayArea({ game, onFinish, onProgress, compact }: PlayAreaProps) {
  switch (game.type) {
    case "matching":
      return (
        <MatchingBoard
          items={game.items as MatchingItem[]}
          onFinish={onFinish}
          onProgress={onProgress}
          compact={compact}
        />
      );
    case "memory":
      return (
        <MemoryBoard
          items={game.items as MatchingItem[]}
          onFinish={onFinish}
          onProgress={onProgress}
          compact={compact}
        />
      );
    case "order":
      return (
        <OrderBoard items={game.items as OrderItem[]} onFinish={onFinish} onProgress={onProgress} compact={compact} />
      );
    case "pop":
      return (
        <PopBoard items={game.items as MathItem[]} onFinish={onFinish} onProgress={onProgress} compact={compact} />
      );
    case "puzzle":
      return (
        <PuzzleBoard items={game.items as PuzzleItem[]} onFinish={onFinish} onProgress={onProgress} compact={compact} />
      );
    case "missingletter":
      return (
        <MissingLetterBoard
          items={game.items as MissingLetterItem[]}
          onFinish={onFinish}
          onProgress={onProgress}
          compact={compact}
        />
      );
    case "grouping":
      return (
        <GroupingBoard
          items={game.items as MatchingItem[]}
          groups={game.groups ?? []}
          onFinish={onFinish}
          onProgress={onProgress}
          compact={compact}
        />
      );
    case "bingo": {
      const texts = game.items.every((i) => "text" in i) ? (game.items as TextItem[]) : textsFromItems(game.items);
      return (
        <BingoBoard
          items={texts}
          title={game.title}
          onFinish={onFinish}
          onProgress={onProgress}
          compact={compact}
        />
      );
    }
    default:
      return <QuestionBoard game={game} onFinish={onFinish} onProgress={onProgress} compact={compact} />;
  }
}

// ------------------------------ Savol taxtasi ------------------------------

function QuestionBoard({
  game,
  onFinish,
  onProgress,
  compact,
}: PlayAreaProps) {
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

  useBoardProgress(onProgress, revealed ? index + 1 : index, score, items.length);

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

  if (!item) return null;

  return (
    <div>
      <Progress index={index} total={items.length} score={score} compact={compact} />

      <div
        className={cn(
          "mb-5 rounded-2xl border border-slate-200 bg-slate-50 text-center",
          compact ? "mb-3 px-2.5 py-3" : "px-4 py-6"
        )}
      >
        {game.type === "math" ? (
          <p
            className={cn(
              "font-bold tracking-wide text-slate-900",
              compact ? "text-xl" : "text-3xl sm:text-4xl"
            )}
          >
            {(item as MathItem).expression}
          </p>
        ) : (
          <p
            className={cn(
              "font-semibold leading-relaxed text-slate-900",
              compact ? "text-sm" : "text-lg sm:text-xl"
            )}
          >
            {view.question}
          </p>
        )}
        {view.hint && !compact ? <p className="mt-2 text-xs text-slate-400">{view.hint}</p> : null}
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
                  "flex flex-col items-center gap-1 rounded-2xl border-2 font-bold transition-all",
                  compact ? "px-2 py-3 text-sm" : "px-4 py-6 text-lg",
                  revealed && isAnswer
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                    : chosen
                      ? "border-red-300 bg-red-50 text-red-600"
                      : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                )}
              >
                <span className={compact ? "text-xl" : "text-3xl"}>{opt.emoji}</span>
                {opt.label}
              </button>
            );
          })}
        </div>
      ) : (
        <div className={cn("grid gap-2.5", compact ? "gap-1.5" : "sm:grid-cols-2")}>
          {view.options.map((opt, i) => {
            const isAnswer = i === view.correctIndex;
            const chosen = selected === i;
            return (
              <button
                key={`${opt}-${i}`}
                onClick={() => pick(i)}
                disabled={revealed}
                className={cn(
                  "flex items-center gap-2 rounded-xl border-2 text-left font-medium transition-all",
                  compact ? "min-h-[38px] px-2 py-1.5 text-xs" : "min-h-[56px] gap-3 px-4 py-3 text-base",
                  revealed && isAnswer
                    ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                    : chosen
                      ? "border-red-300 bg-red-50 text-red-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                )}
              >
                <span
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-500",
                    compact ? "h-5 w-5 text-[10px]" : "h-7 w-7 text-xs"
                  )}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="min-w-0 flex-1 break-words">{opt}</span>
                {revealed && isAnswer ? (
                  <Check className={cn("shrink-0 text-emerald-500", compact ? "h-4 w-4" : "h-5 w-5")} />
                ) : null}
                {revealed && chosen && !isAnswer ? (
                  <X className={cn("shrink-0 text-red-500", compact ? "h-4 w-4" : "h-5 w-5")} />
                ) : null}
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
      return {
        question: (item as MathItem).expression,
        options,
        correctIndex: options.indexOf(String((item as MathItem).answer)),
      };
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

function MatchingBoard({
  items,
  onFinish,
  onProgress,
  compact,
}: BoardProps & { items: MatchingItem[] }) {
  const leftCards = useMemo(() => shuffleStable(items.map((it, i) => ({ i, text: it.left })), 5), [items]);
  const rightCards = useMemo(() => shuffleStable(items.map((it, i) => ({ i, text: it.right })), 11), [items]);

  const [matched, setMatched] = useState<number[]>([]);
  const [leftSel, setLeftSel] = useState<number | null>(null);
  const [rightWrong, setRightWrong] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  useBoardProgress(
    onProgress,
    matched.length,
    Math.max(0, matched.length - mistakes),
    items.length
  );

  const tryMatch = (leftIndex: number, rightIndex: number, rightText: string) => {
    if (matched.includes(leftIndex) || matched.includes(rightIndex)) return;
    // Ko'rinib turgan matn bo'yicha tekshiramiz: bir xil javobli kartalar
    // bo'lsa ham o'quvchi to'g'ri ko'rgan variantni tanlagan bo'ladi
    const correct = items[leftIndex].right === rightText;
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
      <div
        className={cn(
          "mb-4 flex items-center justify-between font-medium text-slate-500",
          compact ? "mb-2 text-[11px]" : "text-xs"
        )}
      >
        <span>Xato urinishlar: {mistakes}</span>
        <span className="text-emerald-600">
          ✓ {matched.length} / {items.length} juftlik
        </span>
      </div>
      {!compact ? (
        <p className="mb-4 text-center text-sm text-slate-500">
          Chapdagi kartani <b>sudrab</b> o'ngdagi mos javobga tashlang (yoki avval chapni, keyin o'ngni bosing)
        </p>
      ) : (
        <p className="mb-2 text-center text-[10px] text-slate-400">Kartani bosib, mos javobni tanlang</p>
      )}

      <div className={cn("flex items-stretch", compact ? "gap-1.5" : "gap-3")}>
        {/* Chap ustun */}
        <div className={cn("flex flex-1 flex-col", compact ? "gap-1" : "gap-2")}>
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
                  "select-none rounded-xl border-2 font-medium transition-all",
                  compact ? "px-1.5 py-1.5 text-[11px] leading-tight" : "px-3 py-3 text-sm",
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
          <span className={compact ? "text-[10px]" : "text-xs"}>⇒</span>
        </div>

        {/* O'ng ustun (tashlash maydonlari) */}
        <div className={cn("flex flex-1 flex-col", compact ? "gap-1" : "gap-2")}>
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
                  "rounded-xl border-2 font-medium transition-all",
                  compact ? "px-1.5 py-1.5 text-[11px] leading-tight" : "px-3 py-3 text-sm",
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

function MemoryBoard({
  items,
  onFinish,
  onProgress,
  compact,
}: BoardProps & { items: MatchingItem[] }) {
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

  const allDone = cards.length > 0 && cards.every((c) => c.done);
  // Qo'shimcha urinishlar ballni kamaytiradi (a'lo o'yin — to'liq ball)
  const finalScore = Math.max(0, items.length - Math.max(0, tries - items.length));

  useBoardProgress(onProgress, tries, score, items.length);

  useEffect(() => {
    if (allDone) {
      const t = setTimeout(() => onFinish(finalScore, items.length), 700);
      return () => clearTimeout(t);
    }
  }, [allDone, onFinish, finalScore, items.length]);

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
          prev.map((c) => (c.id === a.id || c.id === b.id ? { ...c, done: isPair, flipped: isPair } : c))
        );
        if (isPair) setScore((s) => s + 1);
        setOpen([]);
      }, isPair ? 350 : 850);
    }
  };

  return (
    <div>
      <div
        className={cn(
          "mb-4 flex items-center justify-between font-medium text-slate-500",
          compact ? "mb-2 text-[11px]" : "text-xs"
        )}
      >
        <span>Urinishlar: {tries}</span>
        <span className="text-emerald-600">
          ✓ {score} / {items.length} juftlik
        </span>
      </div>
      <div className={cn("grid gap-2.5", compact ? "grid-cols-3 gap-1.5 sm:grid-cols-4" : "grid-cols-3 sm:grid-cols-4")}>
        {cards.map((c) => (
          <button
            key={c.id}
            onClick={() => flip(c)}
            className={cn(
              "flex items-center justify-center rounded-xl border-2 text-center font-semibold transition-all",
              compact ? "min-h-[46px] p-1 text-[10px]" : "min-h-[86px] p-2 text-sm",
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

function OrderBoard({
  items,
  onFinish,
  onProgress,
  compact,
}: BoardProps & { items: OrderItem[] }) {
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

  useBoardProgress(onProgress, checked != null ? index + 1 : index, score, items.length);

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
      <Progress index={index} total={items.length} score={score} compact={compact} />
      <p
        className={cn(
          "mb-3 text-center font-medium text-slate-600",
          compact ? "mb-2 text-xs" : "text-sm"
        )}
      >
        {item.prompt}
      </p>

      <div
        className={cn(
          "mb-4 rounded-xl border-2 border-dashed",
          compact ? "mb-2.5 min-h-[46px] p-2" : "min-h-[76px] p-3",
          checked === true
            ? "border-emerald-400 bg-emerald-50"
            : checked === false
              ? "border-red-300 bg-red-50"
              : "border-slate-300 bg-slate-50"
        )}
      >
        {picked.length === 0 ? (
          <p className={cn("text-center text-slate-400", compact ? "py-2 text-[10px]" : "py-3 text-xs")}>
            Quyidagi so'zlarni bosib shu yerga joylashtiring
          </p>
        ) : (
          <div className={cn("flex flex-wrap", compact ? "gap-1" : "gap-2")}>
            {picked.map((p, i) => (
              <button
                key={`${p}-${i}`}
                onClick={() => !checked && setPicked(picked.filter((_, j) => j !== i))}
                className={cn(
                  "rounded-lg border border-slate-300 bg-white text-slate-700 hover:border-red-300 hover:text-red-600",
                  compact ? "px-1.5 py-0.5 text-[11px]" : "px-2.5 py-1.5 text-sm"
                )}
              >
                {i + 1}. {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {checked === false ? (
        <p className={cn("mb-3 text-center text-red-600", compact ? "mb-2 text-[10px]" : "text-xs")}>
          To'g'ri tartib: {item.tokens.map((t, i) => `${i + 1}) ${t}`).join("  ")}
        </p>
      ) : null}

      <div className={cn("mb-4 flex flex-wrap justify-center", compact ? "mb-2.5 gap-1.5" : "gap-2")}>
        {available.map((t, i) => (
          <button
            key={`${t}-${i}`}
            onClick={() => setPicked((p) => [...p, t])}
            disabled={checked != null}
            className={cn(
              "rounded-lg border-2 border-slate-200 bg-white font-medium text-slate-700 transition-all hover:border-violet-300 hover:bg-violet-50 disabled:opacity-40",
              compact ? "px-2 py-1 text-[11px]" : "px-3 py-2 text-sm"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className={cn("flex justify-center gap-2", compact && "gap-1.5")}>
        <Button
          variant="secondary"
          className={compact ? "px-2 py-1 text-[11px]" : undefined}
          onClick={reset}
          disabled={checked != null || !picked.length}
        >
          <RotateCcw className={compact ? "h-3 w-3" : "h-4 w-4"} /> Tozalash
        </Button>
        <Button
          className={compact ? "px-2 py-1 text-[11px]" : undefined}
          onClick={check}
          disabled={picked.length !== item.tokens.length || checked != null}
        >
          <Check className={compact ? "h-3 w-3" : "h-4 w-4"} /> Tekshirish
        </Button>
      </div>
    </div>
  );
}
