"use client";

// ============================================================================
// Yangi o'yin taxtalari
//   🎈 Balonni ot · 🧩 Puzzle · 🔤 Tushib qolgan harf
//   🗂 Guruhlarga ajrat · 🎟 Bingo kartasi
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import { POP_SECONDS_PER_ITEM, QUIZ_SECONDS_PER_QUESTION } from "@/lib/config";
import { Check, Lightbulb, Printer, RotateCcw, Timer, Trophy, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  GameItem,
  MatchingItem,
  MathItem,
  MissingLetterItem,
  PuzzleItem,
  QuizItem,
  TextItem,
} from "@/lib/books/types";
import { Button } from "@/components/ui";
import { Progress, shuffleStable, useBoardProgress, useCountdown, type BoardProps } from "./board-utils";

// ---------------------------------------------------------------------------
// 🎈 BALONNI OT — to'g'ri javob yozilgan balonni yorish (vaqt bilan)
// ---------------------------------------------------------------------------

export function PopBoard({
  items,
  onFinish,
  onProgress,
  compact,
  secondsPerItem = POP_SECONDS_PER_ITEM,
}: BoardProps & { items: MathItem[]; secondsPerItem?: number }) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [popped, setPopped] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  /** Joriy savol yakunlandimi (taymer takror ishlamasligi uchun) */
  const [resolved, setResolved] = useState(false);

  const item = items[index];
  const positions = useMemo(() => balloonLayout(item ? item.options.length : 4, index), [index, item]);

  useBoardProgress(onProgress, resolved ? index + 1 : index, score, items.length);

  const next = (gained: boolean) => {
    const s = score + (gained ? 1 : 0);
    if (gained) setScore(s);
    setTimeout(() => {
      if (index + 1 >= items.length) {
        setFinished(true);
        onFinish(s, items.length);
      } else {
        setIndex((v) => v + 1);
        setPopped([]);
        setWrong(null);
        setResolved(false);
      }
    }, 650);
  };

  const timeLeft = useCountdown(
    secondsPerItem,
    !finished && !resolved && popped.length === 0,
    () => {
      if (finished || resolved || popped.length > 0) return;
      setResolved(true);
      next(false);
    },
    index
  );

  if (!item) return null;

  const hit = (optIndex: number) => {
    if (popped.length || resolved) return;
    setResolved(true);
    const isCorrect = String(item.options[optIndex]) === String(item.answer);
    setPopped([optIndex]);
    if (!isCorrect) setWrong(optIndex);
    next(isCorrect);
  };

  return (
    <div>
      <Progress index={index} total={items.length} score={score} compact={compact} />
      <div className={cn("mb-3 flex items-center justify-between gap-2", compact && "mb-2")}>
        <p className={cn("font-bold text-slate-800", compact ? "text-sm" : "text-lg")}>{item.expression}</p>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full font-bold",
            compact ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
            timeLeft > 7 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
          )}
        >
          <Timer className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} /> {timeLeft}s
        </span>
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-2xl bg-gradient-to-b from-sky-100 via-sky-50 to-white",
          compact ? "h-[180px]" : "h-[300px]"
        )}
      >
        {item.options.map((opt, i) => {
          const pos = positions[i];
          const isPopped = popped.includes(i);
          const isWrong = wrong === i;
          const isRight = isPopped && !isWrong;
          const colors = [
            "from-rose-400 to-rose-500",
            "from-amber-400 to-orange-500",
            "from-emerald-400 to-teal-500",
            "from-violet-400 to-fuchsia-500",
            "from-sky-400 to-indigo-500",
          ];
          return (
            <button
              key={`${opt}-${i}`}
              onClick={() => hit(i)}
              disabled={popped.length > 0}
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, animationDelay: `${i * 260}ms` }}
              className={cn(
                "balloon-float absolute flex -translate-x-1/2 flex-col items-center justify-center rounded-full bg-gradient-to-br font-bold text-white shadow-lg transition-all duration-300",
                compact ? "h-14 w-14 text-xs" : "h-20 w-20 text-lg",
                colors[i % colors.length],
                isPopped && "scale-0 opacity-0",
                isRight && (compact ? "ring-2 ring-emerald-300" : "ring-4 ring-emerald-300")
              )}
            >
              <span className="drop-shadow">{opt}</span>
              <span className="absolute -bottom-1 left-1/2 h-3 w-0.5 -translate-x-1/2 bg-slate-400/60" />
            </button>
          );
        })}

        {wrong != null ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80">
            <div className={cn("rounded-xl bg-white text-center shadow-lg", compact ? "px-2.5 py-1.5" : "px-5 py-3")}>
              <p className={cn("font-semibold text-red-600", compact ? "text-[11px]" : "text-sm")}>
                <X className={cn("mr-1 inline", compact ? "h-3 w-3" : "h-4 w-4")} />
                Xato! To'g'ri javob: {item.answer}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Balonlarni ekranda tarqatib joylashtirish */
function balloonLayout(count: number, seed: number): Array<{ x: number; y: number }> {
  const slots = [
    { x: 18, y: 12 },
    { x: 50, y: 6 },
    { x: 82, y: 14 },
    { x: 30, y: 50 },
    { x: 68, y: 52 },
  ];
  const rotated = [...slots.slice(0, count)];
  const shift = seed % Math.max(1, rotated.length);
  return [...rotated.slice(shift), ...rotated.slice(0, shift)];
}

// ---------------------------------------------------------------------------
// 🧩 PUZZLE — bo'laklardan so'z/gap yig'ish
// ---------------------------------------------------------------------------

export function PuzzleBoard({ items, onFinish, onProgress, compact }: BoardProps & { items: PuzzleItem[] }) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);
  const [hint, setHint] = useState(false);

  const item = items[index];
  const pieces = useMemo(
    () => (item ? shuffleStable(item.pieces, index * 31 + item.answer.length) : []),
    [item, index]
  );

  useBoardProgress(onProgress, checked != null ? index + 1 : index, score, items.length);

  useEffect(() => {
    setPicked([]);
    setChecked(null);
    setHint(false);
  }, [index]);

  if (!item) return null;

  const available = [...pieces];
  picked.forEach((p) => {
    const i = available.indexOf(p);
    if (i >= 0) available.splice(i, 1);
  });

  const check = () => {
    const correct = picked.join("") === item.answer;
    setChecked(correct);
    if (correct) setScore((s) => s + 1);
    setTimeout(() => {
      if (index + 1 >= items.length) onFinish(score + (correct ? 1 : 0), items.length);
      else setIndex((v) => v + 1);
    }, correct ? 700 : 1500);
  };

  return (
    <div>
      <Progress index={index} total={items.length} score={score} compact={compact} />
      <p className={cn("mb-3 text-center font-medium text-slate-600", compact ? "mb-2 text-xs" : "text-sm")}>
        {item.prompt}
      </p>

      <div
        className={cn(
          "mb-4 flex items-center justify-center gap-1 rounded-2xl border-2 border-dashed font-bold tracking-wide",
          compact ? "mb-2.5 min-h-[44px] p-2 text-base" : "min-h-[70px] p-3 text-2xl",
          checked === true
            ? "border-emerald-400 bg-emerald-50 text-emerald-700"
            : checked === false
              ? "border-red-300 bg-red-50 text-red-600"
              : "border-slate-300 bg-slate-50"
        )}
      >
        {picked.length === 0 ? (
          <span className={cn("font-normal text-slate-400", compact ? "text-[10px]" : "text-xs")}>
            Bo'laklarni bosib, so'zni yig'ing
          </span>
        ) : (
          <span>
            {picked.map((p, i) => (
              <button
                key={`${p}-${i}`}
                onClick={() => !checked && setPicked(picked.filter((_, j) => j !== i))}
                className="rounded-lg px-1 hover:bg-white"
              >
                {p}
              </button>
            ))}
          </span>
        )}
      </div>

      {item.pieces.length >= 1 ? (
        <div className={cn("mb-4 flex flex-wrap justify-center gap-2", compact && "mb-2.5 gap-1.5")}>
          {available.map((p, i) => (
            <button
              key={`${p}-${i}`}
              onClick={() => setPicked((prev) => [...prev, p])}
              disabled={checked != null}
              className={cn(
                "rounded-xl border-2 border-slate-200 bg-white font-semibold text-slate-700 transition-all hover:border-teal-300 hover:bg-teal-50 disabled:opacity-40",
                compact ? "px-2 py-1 text-sm" : "px-3.5 py-2 text-lg"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      ) : null}

      {checked === false ? (
        <p className={cn("mb-3 text-center text-red-600", compact ? "mb-2 text-[10px]" : "text-xs")}>
          To'g'ri javob: {item.answer}
        </p>
      ) : null}

      {hint ? (
        <p className={cn("mb-3 text-center text-amber-600", compact ? "mb-2 text-[10px]" : "text-xs")}>
          <Lightbulb className="mr-1 inline h-3.5 w-3.5" />
          So'z {item.pieces.length} bo'lakdan iborat, {item.answer.length} harfdan iborat. Birinchi bo'lak:{" "}
          <b>{item.pieces[0]}</b>
        </p>
      ) : null}

      <div className={cn("flex flex-wrap justify-center gap-2", compact && "gap-1.5")}>
        <Button
          variant="ghost"
          className={compact ? "px-2 py-1 text-[11px]" : undefined}
          onClick={() => setHint(true)}
          disabled={hint || checked != null}
        >
          <Lightbulb className={compact ? "h-3 w-3" : "h-4 w-4"} /> Yordam
        </Button>
        <Button
          variant="secondary"
          className={compact ? "px-2 py-1 text-[11px]" : undefined}
          onClick={() => setPicked([])}
          disabled={checked != null || !picked.length}
        >
          <RotateCcw className={compact ? "h-3 w-3" : "h-4 w-4"} /> Tozalash
        </Button>
        <Button
          className={compact ? "px-2 py-1 text-[11px]" : undefined}
          onClick={check}
          disabled={picked.length !== item.pieces.length || checked != null}
        >
          <Check className={compact ? "h-3 w-3" : "h-4 w-4"} /> Tekshirish
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 🔤 TUSHIB QOLGAN HARF (k_tob → kitob)
// ---------------------------------------------------------------------------

export function MissingLetterBoard({ items, onFinish, onProgress, compact }: BoardProps & { items: MissingLetterItem[] }) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const item = items[index];
  useEffect(() => {
    setPicked(null);
  }, [index]);

  useBoardProgress(onProgress, picked ? index + 1 : index, score, items.length);

  if (!item) return null;

  const pick = (letter: string) => {
    if (picked) return;
    setPicked(letter);
    const correct = letter === item.answer;
    if (correct) setScore((s) => s + 1);
    setTimeout(() => {
      if (index + 1 >= items.length) onFinish(score + (correct ? 1 : 0), items.length);
      else setIndex((v) => v + 1);
    }, correct ? 600 : 1200);
  };

  return (
    <div>
      <Progress index={index} total={items.length} score={score} compact={compact} />

      <div
        className={cn(
          "mb-6 flex flex-wrap items-center justify-center rounded-2xl border border-slate-200 bg-slate-50",
          compact ? "mb-3 gap-0.5 px-2 py-3" : "gap-1 px-6 py-8"
        )}
      >
        {[...item.display].map((ch, i) => (
          <span
            key={i}
            className={cn(
              "flex items-center justify-center rounded-xl border-2 font-bold",
              compact ? "h-8 w-6 text-base" : "h-14 w-11 text-3xl",
              ch === "_"
                ? picked
                  ? picked === item.answer
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                    : "border-red-300 bg-red-50 text-red-600"
                  : "animate-pulse border-indigo-400 bg-indigo-50 text-indigo-400"
                : "border-slate-200 bg-white text-slate-800"
            )}
          >
            {ch === "_" ? (picked ?? "?") : ch}
          </span>
        ))}
      </div>

      <div className={cn("grid grid-cols-4 gap-2.5", compact && "gap-1.5")}>
        {item.options.map((opt, i) => {
          const isAnswer = opt === item.answer;
          const chosen = picked === opt;
          return (
            <button
              key={`${opt}-${i}`}
              onClick={() => pick(opt)}
              disabled={picked != null}
              className={cn(
                "rounded-xl border-2 font-bold uppercase transition-all",
                compact ? "py-2 text-base" : "py-4 text-2xl",
                picked && isAnswer
                  ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                  : chosen
                    ? "border-red-300 bg-red-50 text-red-600"
                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {picked && picked !== item.answer ? (
        <p className={cn("mt-3 text-center text-red-600", compact ? "mt-2 text-[10px]" : "text-sm")}>
          To'g'ri javob: <b>{item.answer}</b> → {item.display.replace("_", item.answer)}
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 🗂 GURUHLARGA AJRAT — sudrab tashlash (mobil uchun bosish ham ishlaydi)
// ---------------------------------------------------------------------------

export function GroupingBoard({
  items,
  groups,
  onFinish,
  onProgress,
  compact,
}: BoardProps & { items: MatchingItem[]; groups: string[] }) {
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);

  // Guruhlar berilmagan bo'lsa — elementlarning o'zidan chiqaramiz (doska bo'sh qolmasin)
  const groupList = useMemo(
    () => (groups.length ? groups : [...new Set(items.map((it) => it.right).filter(Boolean))]),
    [groups, items]
  );

  const tray = items.map((it) => it.left).filter((word) => !(word in placed));
  const liveCorrect = items.filter((it) => placed[it.left] === it.right).length;

  useBoardProgress(onProgress, items.length - tray.length, liveCorrect, items.length);

  const put = (word: string, group: string) => {
    setPlaced((prev) => ({ ...prev, [word]: group }));
    setSelected(null);
  };

  const take = (word: string) => {
    setPlaced((prev) => {
      const next = { ...prev };
      delete next[word];
      return next;
    });
  };

  const check = () => {
    setChecked(true);
    const correct = items.filter((it) => placed[it.left] === it.right).length;
    setTimeout(() => onFinish(correct, items.length), 1600);
  };

  const allPlaced = tray.length === 0;
  const correctCount = items.filter((it) => placed[it.left] === it.right).length;

  return (
    <div>
      <div
        className={cn(
          "mb-4 flex items-center justify-between gap-2 font-medium text-slate-500",
          compact ? "mb-2.5 text-[11px]" : "text-xs"
        )}
      >
        <span>
          Joylashtirildi: {items.length - tray.length} / {items.length}
        </span>
        {!compact ? (
          <span className="text-slate-400">Sudrab tashlang yoki so'zni bosib, guruhni tanlang</span>
        ) : null}
      </div>

      {/* So'zlar savati */}
      <div
        className={cn(
          "mb-4 flex flex-wrap items-start rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50",
          compact ? "mb-2.5 min-h-[42px] gap-1.5 p-2" : "min-h-[70px] gap-2 p-3"
        )}
      >
        {tray.length === 0 ? (
          <span className={cn("text-slate-400", compact ? "text-[10px]" : "text-xs")}>
            Barcha so'zlar joylashtirildi ✓
          </span>
        ) : (
          tray.map((word) => (
            <button
              key={word}
              draggable
              onDragStart={() => setDragging(word)}
              onDragEnd={() => setDragging(null)}
              onClick={() => setSelected(selected === word ? null : word)}
              className={cn(
                "cursor-grab rounded-xl border-2 bg-white font-medium text-slate-700 transition-all active:cursor-grabbing",
                compact ? "px-2 py-1 text-[11px]" : "px-3 py-2 text-sm",
                selected === word
                  ? "border-indigo-500 ring-2 ring-indigo-200"
                  : "border-slate-200 hover:border-indigo-300",
                dragging === word && "opacity-40"
              )}
            >
              {word}
            </button>
          ))
        )}
      </div>

      {/* Guruhlar */}
      <div
        className={cn("grid", compact ? "gap-2" : "gap-3")}
        style={{
          gridTemplateColumns: `repeat(${Math.min(Math.max(groupList.length, 1), compact ? 2 : 3)}, minmax(0, 1fr))`,
        }}
      >
        {groupList.map((group) => {
          const groupWords = Object.entries(placed)
            .filter(([, g]) => g === group)
            .map(([w]) => w);
          return (
            <div
              key={group}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragging) put(dragging, group);
              }}
              onClick={() => selected && put(selected, group)}
              className={cn(
                "rounded-2xl border-2 transition-colors",
                compact ? "min-h-[72px] p-2" : "min-h-[130px] p-3",
                selected ? "border-indigo-400 bg-indigo-50/50" : "border-slate-200 bg-white"
              )}
            >
              <p
                className={cn(
                  "mb-2 text-center font-bold uppercase tracking-wide text-slate-500",
                  compact ? "mb-1 text-[10px]" : "text-xs"
                )}
              >
                {group}
              </p>
              <div className={cn("flex flex-wrap justify-center", compact ? "gap-1" : "gap-1.5")}>
                {groupWords.map((w) => {
                  const isRight = items.find((it) => it.left === w)?.right === group;
                  return (
                    <button
                      key={w}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!checked) take(w);
                      }}
                      className={cn(
                        "rounded-lg border font-medium",
                        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
                        checked
                          ? isRight
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-red-300 bg-red-50 text-red-600"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-red-300"
                      )}
                    >
                      {w}
                      {checked ? (isRight ? " ✓" : " ✗") : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {checked ? (
        <p
          className={cn(
            "mt-4 text-center font-semibold text-slate-700",
            compact ? "mt-2 text-[11px]" : "text-sm"
          )}
        >
          Natija: {correctCount} / {items.length} to'g'ri
        </p>
      ) : (
        <div className={cn("mt-4 flex justify-center gap-2", compact && "mt-2.5 gap-1.5")}>
          <Button
            variant="secondary"
            className={compact ? "px-2 py-1 text-[11px]" : undefined}
            onClick={() => setPlaced({})}
            disabled={!Object.keys(placed).length}
          >
            <RotateCcw className={compact ? "h-3 w-3" : "h-4 w-4"} /> Tozalash
          </Button>
          <Button className={compact ? "px-2 py-1 text-[11px]" : undefined} onClick={check} disabled={!allPlaced}>
            <Check className={compact ? "h-3 w-3" : "h-4 w-4"} /> Tekshirish
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 🎟 BINGO KARTASI — sinf bilan o'ynaladi
// ---------------------------------------------------------------------------

export function BingoBoard({
  items,
  title,
  onFinish,
  onProgress,
  compact,
}: BoardProps & { items: TextItem[]; title: string }) {
  const size = items.length >= 16 ? 4 : 3;
  const cellCount = size * size;
  const cells = useMemo(
    () => shuffleStable(items.map((i) => i.text), 7).slice(0, cellCount),
    [items, cellCount]
  );

  const [marked, setMarked] = useState<number[]>([]);
  const [called, setCalled] = useState<string[]>([]);
  const [showCaller, setShowCaller] = useState(false);
  const [bingo, setBingo] = useState(false);
  const [finished, setFinished] = useState(false);

  // Chaqiriladigan so'zlar navbati (o'qituvchi uchun)
  const callList = useMemo(() => shuffleStable(items.map((i) => i.text), 21), [items]);

  const isBingo = useMemo(() => {
    const set = new Set(marked);
    // qatorlar va ustunlar
    for (let r = 0; r < size; r++) {
      if ([...Array(size).keys()].every((c) => set.has(r * size + c))) return true;
      if ([...Array(size).keys()].every((c) => set.has(c * size + r))) return true;
    }
    // diagonallar
    if ([...Array(size).keys()].every((i) => set.has(i * size + i))) return true;
    if ([...Array(size).keys()].every((i) => set.has(i * size + (size - 1 - i)))) return true;
    return false;
  }, [marked, size]);

  useEffect(() => {
    if (isBingo && !bingo) setBingo(true);
  }, [isBingo, bingo]);

  useBoardProgress(onProgress, marked.length, marked.length, cellCount);

  const toggle = (i: number) => {
    if (showCaller) return;
    setMarked((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  };

  const finish = () => {
    setFinished(true);
    onFinish(size * size, size * size);
  };

  return (
    <div>
      <div className={cn("mb-4 flex flex-wrap items-center justify-between gap-2", compact && "mb-2")}>
        {!compact ? <p className="text-sm font-semibold text-slate-700">🎟 {title}</p> : <span />}
        <div className={cn("flex gap-2", compact && "gap-1")}>
          {!compact ? (
            <Button variant="secondary" className="px-2.5 py-1.5 text-xs" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" /> Chop etish
            </Button>
          ) : null}
          <Button
            variant={showCaller ? "primary" : "secondary"}
            className={compact ? "px-1.5 py-1 text-[10px]" : "px-2.5 py-1.5 text-xs"}
            onClick={() => setShowCaller((v) => !v)}
          >
            {showCaller ? "Kartaga qaytish" : "O'qituvchi paneli"}
          </Button>
        </div>
      </div>

      {bingo ? (
        <div
          className={cn(
            "mb-4 flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-white",
            compact ? "mb-2 gap-1 px-3 py-2" : "px-4 py-4"
          )}
        >
          <Trophy className={compact ? "h-6 w-6" : "h-9 w-9"} />
          <p className={cn("font-bold", compact ? "text-base" : "text-xl")}>BINGO!</p>
          <p className={cn("text-white/90", compact ? "text-[10px]" : "text-xs")}>
            Siz barcha qatorni to'ldirdingiz
          </p>
          {!finished ? (
            <Button variant="secondary" className={cn("mt-1", compact && "px-2 py-1 text-[11px]")} onClick={finish}>
              Yakunlash
            </Button>
          ) : null}
        </div>
      ) : null}

      {showCaller ? (
        <div className={cn("rounded-2xl border border-slate-200 bg-slate-50", compact ? "p-2" : "p-4")}>
          <p className={cn("mb-3 font-semibold text-slate-600", compact ? "mb-2 text-[10px]" : "text-xs")}>
            O'qituvchi paneli — so'zlarni navbat bilan aytib turing ({called.length}/{callList.length}):
          </p>
          <div className={cn("flex flex-wrap", compact ? "gap-1" : "gap-2")}>
            {callList.map((w) => (
              <button
                key={w}
                onClick={() => setCalled((prev) => (prev.includes(w) ? prev : [...prev, w]))}
                className={cn(
                  "rounded-lg border font-medium transition-all",
                  compact ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1.5 text-sm",
                  called.includes(w)
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 line-through"
                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"
                )}
              >
                {w}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            className={cn("mt-3 text-xs", compact && "mt-2 px-1.5 py-1 text-[10px]")}
            onClick={() => setCalled([])}
          >
            <RotateCcw className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} /> Navbatni tozalash
          </Button>
        </div>
      ) : (
        <div
          className={cn("mx-auto grid", compact ? "gap-1" : "gap-2")}
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, maxWidth: compact ? undefined : size === 3 ? 380 : 460 }}
        >
          {cells.map((text, i) => {
            const isMarked = marked.includes(i);
            return (
              <button
                key={`${text}-${i}`}
                onClick={() => toggle(i)}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-xl border-2 text-center font-semibold transition-all",
                  compact ? "p-1 text-[9px]" : "p-1.5 text-xs sm:text-sm",
                  isMarked
                    ? "border-pink-400 bg-pink-50 text-pink-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-pink-300"
                )}
              >
                {text}
              </button>
            );
          })}
        </div>
      )}

      {!compact ? (
        <p className="mt-4 text-center text-xs text-slate-400">
          O'qituvchi so'z aytadi — o'quvchi kartadagi katakchani bosib belgilaydi. To'liq qator yig'ilsa — BINGO!
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Yordamchi: elementdan matnli ro'yxat olish (bingo uchun)
// ---------------------------------------------------------------------------

export function textsFromItems(items: GameItem[]): TextItem[] {
  return items
    .map((it) => {
      if ("text" in it) return { text: String((it as TextItem).text) };
      if ("answer" in it) {
        const a = (it as QuizItem | PuzzleItem | MissingLetterItem).answer;
        return { text: String(a) };
      }
      if ("isTrue" in it) return null;
      if ("tokens" in it) return null;
      const m = it as MatchingItem;
      return m.left ? { text: m.left } : null;
    })
    .filter((x): x is TextItem => x != null);
}
