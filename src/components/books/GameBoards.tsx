"use client";

// ============================================================================
// Yangi o'yin taxtalari
//   🎈 Balonni ot · 🧩 Puzzle · 🔤 Tushib qolgan harf
//   🗂 Guruhlarga ajrat · 🎟 Bingo kartasi
// ============================================================================

import { useEffect, useMemo, useState } from "react";
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
import { Progress, shuffleStable, useCountdown, type BoardProps } from "./board-utils";

// ---------------------------------------------------------------------------
// 🎈 BALONNI OT — to'g'ri javob yozilgan balonni yorish (vaqt bilan)
// ---------------------------------------------------------------------------

export function PopBoard({
  items,
  onFinish,
  secondsPerItem = 15,
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
      <Progress index={index} total={items.length} score={score} />
      <div className="mb-3 flex items-center justify-between">
        <p className="text-lg font-bold text-slate-800">{item.expression}</p>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
            timeLeft > 7 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
          )}
        >
          <Timer className="h-3.5 w-3.5" /> {timeLeft}s
        </span>
      </div>

      <div className="relative h-[300px] overflow-hidden rounded-2xl bg-gradient-to-b from-sky-100 via-sky-50 to-white">
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
                "balloon-float absolute flex h-20 w-20 -translate-x-1/2 flex-col items-center justify-center rounded-full bg-gradient-to-br text-lg font-bold text-white shadow-lg transition-all duration-300",
                colors[i % colors.length],
                isPopped && "scale-0 opacity-0",
                isRight && "ring-4 ring-emerald-300"
              )}
            >
              <span className="drop-shadow">{opt}</span>
              <span className="absolute -bottom-1 left-1/2 h-3 w-0.5 -translate-x-1/2 bg-slate-400/60" />
            </button>
          );
        })}

        {wrong != null ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80">
            <div className="rounded-xl bg-white px-5 py-3 text-center shadow-lg">
              <p className="text-sm font-semibold text-red-600">
                <X className="mr-1 inline h-4 w-4" />
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

export function PuzzleBoard({ items, onFinish }: BoardProps & { items: PuzzleItem[] }) {
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
      <Progress index={index} total={items.length} score={score} />
      <p className="mb-3 text-center text-sm font-medium text-slate-600">{item.prompt}</p>

      <div
        className={cn(
          "mb-4 flex min-h-[70px] items-center justify-center gap-1 rounded-2xl border-2 border-dashed p-3 text-2xl font-bold tracking-wide",
          checked === true
            ? "border-emerald-400 bg-emerald-50 text-emerald-700"
            : checked === false
              ? "border-red-300 bg-red-50 text-red-600"
              : "border-slate-300 bg-slate-50"
        )}
      >
        {picked.length === 0 ? (
          <span className="text-xs font-normal text-slate-400">Bo'laklarni bosib, so'zni yig'ing</span>
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

      {item.pieces.length > 1 ? (
        <div className="mb-4 flex flex-wrap justify-center gap-2">
          {available.map((p, i) => (
            <button
              key={`${p}-${i}`}
              onClick={() => setPicked((prev) => [...prev, p])}
              disabled={checked != null}
              className="rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2 text-lg font-semibold text-slate-700 transition-all hover:border-teal-300 hover:bg-teal-50 disabled:opacity-40"
            >
              {p}
            </button>
          ))}
        </div>
      ) : null}

      {checked === false ? (
        <p className="mb-3 text-center text-xs text-red-600">To'g'ri javob: {item.answer}</p>
      ) : null}

      {hint ? (
        <p className="mb-3 text-center text-xs text-amber-600">
          <Lightbulb className="mr-1 inline h-3.5 w-3.5" />
          So'z {item.pieces.length} bo'lakdan iborat, {item.answer.length} harfdan iborat. Birinchi bo'lak:{" "}
          <b>{item.pieces[0]}</b>
        </p>
      ) : null}

      <div className="flex justify-center gap-2">
        <Button variant="ghost" onClick={() => setHint(true)} disabled={hint || checked != null}>
          <Lightbulb className="h-4 w-4" /> Yordam
        </Button>
        <Button variant="secondary" onClick={() => setPicked([])} disabled={checked != null || !picked.length}>
          <RotateCcw className="h-4 w-4" /> Tozalash
        </Button>
        <Button onClick={check} disabled={picked.length !== item.pieces.length || checked != null}>
          <Check className="h-4 w-4" /> Tekshirish
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 🔤 TUSHIB QOLGAN HARF (k_tob → kitob)
// ---------------------------------------------------------------------------

export function MissingLetterBoard({ items, onFinish }: BoardProps & { items: MissingLetterItem[] }) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const item = items[index];
  useEffect(() => {
    setPicked(null);
  }, [index]);

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
      <Progress index={index} total={items.length} score={score} />

      <div className="mb-6 flex items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-8">
        {[...item.display].map((ch, i) => (
          <span
            key={i}
            className={cn(
              "flex h-14 w-11 items-center justify-center rounded-xl border-2 text-3xl font-bold",
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

      <div className="grid grid-cols-4 gap-2.5">
        {item.options.map((opt, i) => {
          const isAnswer = opt === item.answer;
          const chosen = picked === opt;
          return (
            <button
              key={`${opt}-${i}`}
              onClick={() => pick(opt)}
              disabled={picked != null}
              className={cn(
                "rounded-xl border-2 py-4 text-2xl font-bold uppercase transition-all",
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
        <p className="mt-3 text-center text-sm text-red-600">
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
}: BoardProps & { items: MatchingItem[]; groups: string[] }) {
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);

  const tray = items.map((it) => it.left).filter((word) => !(word in placed));

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
      <div className="mb-4 flex items-center justify-between text-xs font-medium text-slate-500">
        <span>
          Joylashtirildi: {items.length - tray.length} / {items.length}
        </span>
        <span className="text-slate-400">Sudrab tashlang yoki so'zni bosib, guruhni tanlang</span>
      </div>

      {/* So'zlar savati */}
      <div className="mb-4 flex min-h-[70px] flex-wrap items-start gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-3">
        {tray.length === 0 ? (
          <span className="text-xs text-slate-400">Barcha so'zlar joylashtirildi ✓</span>
        ) : (
          tray.map((word) => (
            <button
              key={word}
              draggable
              onDragStart={() => setDragging(word)}
              onDragEnd={() => setDragging(null)}
              onClick={() => setSelected(selected === word ? null : word)}
              className={cn(
                "cursor-grab rounded-xl border-2 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-all active:cursor-grabbing",
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
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(groups.length, 3)}, minmax(0, 1fr))` }}>
        {groups.map((group) => {
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
                "min-h-[130px] rounded-2xl border-2 p-3 transition-colors",
                selected ? "border-indigo-400 bg-indigo-50/50" : "border-slate-200 bg-white"
              )}
            >
              <p className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                {group}
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
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
                        "rounded-lg border px-2 py-1 text-xs font-medium",
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
        <p className="mt-4 text-center text-sm font-semibold text-slate-700">
          Natija: {correctCount} / {items.length} to'g'ri
        </p>
      ) : (
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => setPlaced({})} disabled={!Object.keys(placed).length}>
            <RotateCcw className="h-4 w-4" /> Tozalash
          </Button>
          <Button onClick={check} disabled={!allPlaced}>
            <Check className="h-4 w-4" /> Tekshirish
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700">🎟 {title}</p>
        <div className="flex gap-2">
          <Button variant="secondary" className="px-2.5 py-1.5 text-xs" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" /> Chop etish
          </Button>
          <Button
            variant={showCaller ? "primary" : "secondary"}
            className="px-2.5 py-1.5 text-xs"
            onClick={() => setShowCaller((v) => !v)}
          >
            {showCaller ? "Kartaga qaytish" : "O'qituvchi paneli"}
          </Button>
        </div>
      </div>

      {bingo ? (
        <div className="mb-4 flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-4 text-white">
          <Trophy className="h-9 w-9" />
          <p className="text-xl font-bold">BINGO!</p>
          <p className="text-xs text-white/90">Siz barcha qatorni to'ldirdingiz</p>
          {!finished ? (
            <Button variant="secondary" className="mt-1" onClick={finish}>
              Yakunlash
            </Button>
          ) : null}
        </div>
      ) : null}

      {showCaller ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 text-xs font-semibold text-slate-600">
            O'qituvchi paneli — so'zlarni navbat bilan aytib turing ({called.length}/{callList.length}):
          </p>
          <div className="flex flex-wrap gap-2">
            {callList.map((w) => (
              <button
                key={w}
                onClick={() => setCalled((prev) => (prev.includes(w) ? prev : [...prev, w]))}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-all",
                  called.includes(w)
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 line-through"
                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"
                )}
              >
                {w}
              </button>
            ))}
          </div>
          <Button variant="ghost" className="mt-3 text-xs" onClick={() => setCalled([])}>
            <RotateCcw className="h-3.5 w-3.5" /> Navbatni tozalash
          </Button>
        </div>
      ) : (
        <div
          className="mx-auto grid gap-2"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, maxWidth: size === 3 ? 380 : 460 }}
        >
          {cells.map((text, i) => {
            const isMarked = marked.includes(i);
            return (
              <button
                key={`${text}-${i}`}
                onClick={() => toggle(i)}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-xl border-2 p-1.5 text-center text-xs font-semibold transition-all sm:text-sm",
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

      <p className="mt-4 text-center text-xs text-slate-400">
        O'qituvchi so'z aytadi — o'quvchi kartadagi katakchani bosib belgilaydi. To'liq qator yig'ilsa — BINGO!
      </p>
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
