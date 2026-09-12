"use client";

// ============================================================================
// 🎟 BINGO KARTALARI GENERATORI
//   - so'zlar ro'yxatidan (yoki kitob mavzusidan) bir nechta unikal karta yasaydi
//   - har bir karta chop etish mumkin (o'quvchilarga tarqatish uchun)
//   - doska uchun katta karta rejimi
// ============================================================================

import { useMemo, useState } from "react";
import { Download, Grid3x3, Printer, Shuffle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { shuffleStable } from "@/components/books/board-utils";

export function BingoGenerator({
  bookWords,
}: {
  bookWords: { book: string; words: string[] }[];
}) {
  const [source, setSource] = useState<"royxat" | "kitob">("royxat");
  const [raw, setRaw] = useState(
    "olma\nuzum\nanor\nnok\nbehi\nshaftoli\nanjir\nolcha\nxurmo\nqovun\ntarvuz\nlimon"
  );
  const [bookId, setBookId] = useState(bookWords[0]?.book ?? "");
  const [size, setSize] = useState(3);
  const [count, setCount] = useState(4);
  const [seed, setSeed] = useState(1);
  const [title, setTitle] = useState("");

  const words = useMemo(() => {
    const list =
      source === "royxat"
        ? raw.split("\n").map((s) => s.trim()).filter(Boolean)
        : bookWords.find((b) => b.book === bookId)?.words ?? [];
    return [...new Set(list)];
  }, [source, raw, bookId, bookWords]);

  const cellCount = size * size;
  const enough = words.length >= cellCount;

  const cards = useMemo(() => {
    if (!enough) return [];
    return Array.from({ length: count }, (_, c) =>
      shuffleStable(words, seed * 977 + c * 31).slice(0, cellCount)
    );
  }, [words, cellCount, count, seed, enough]);

  const printableTitle = title.trim() || "BINGO";

  return (
    <div className="space-y-4">
      {/* Sozlamalar */}
      <Card className="p-4 print:hidden">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="So'zlar manbasi">
            <Select value={source} onChange={(e) => setSource(e.target.value as "royxat" | "kitob")}>
              <option value="royxat">O'zim yozaman</option>
              <option value="kitob">Kitob mavzusidan</option>
            </Select>
          </Field>

          {source === "kitob" ? (
            <Field label="Kitob">
              <Select value={bookId} onChange={(e) => setBookId(e.target.value)}>
                {bookWords.map((b) => (
                  <option key={b.book} value={b.book}>
                    {b.book} ({b.words.length} so'z)
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <Field label="Karta o'lchami">
            <Select value={size} onChange={(e) => setSize(Number(e.target.value))}>
              <option value={3}>3 × 3 (9 katak)</option>
              <option value={4}>4 × 4 (16 katak)</option>
              <option value={5}>5 × 5 (25 katak)</option>
            </Select>
          </Field>

          <Field label="Karta soni" hint="Har bir o'quvchiga alohida karta">
            <Select value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[1, 2, 4, 6, 8, 10, 12, 20].map((n) => (
                <option key={n} value={n}>
                  {n} ta karta
                </option>
              ))}
            </Select>
          </Field>

          <div className="lg:col-span-2">
            <Field label="Karta sarlavhasi (ixtiyoriy)">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masalan: Ona tili — 3-sinf" />
            </Field>
          </div>

          <div className="flex items-end gap-2 lg:col-span-2">
            <Button variant="secondary" onClick={() => setSeed((s) => s + 1)} className="flex-1">
              <Shuffle className="h-4 w-4" /> Qayta aralashtirish
            </Button>
            <Button variant="secondary" onClick={() => window.print()} className="flex-1">
              <Printer className="h-4 w-4" /> Chop etish
            </Button>
          </div>
        </div>

        {source === "royxat" ? (
          <div className="mt-3">
            <Field
              label="So'zlar / raqamlar (har biri yangi qatorga)"
              hint={`${words.length} ta so'z kiritildi · kamida ${cellCount} ta kerak`}
            >
              <Textarea value={raw} onChange={(e) => setRaw(e.target.value)} className="min-h-[120px] font-mono text-xs" />
            </Field>
          </div>
        ) : null}

        {!enough ? (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            ⚠️ Kamida {cellCount} ta so'z kerak (hozir {words.length} ta).
          </p>
        ) : null}
      </Card>

      {/* Kartalar */}
      {enough ? (
        <div className="grid gap-6 sm:grid-cols-2 print:grid-cols-2 print:gap-8">
          {cards.map((cells, ci) => (
            <div
              key={ci}
              className="break-inside-avoid rounded-2xl border-2 border-slate-300 bg-white p-4 print:border-slate-400"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold uppercase tracking-wide text-slate-800">{printableTitle}</p>
                <p className="text-xs text-slate-400">Karta #{ci + 1}</p>
              </div>
              <div
                className="grid gap-1.5"
                style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
              >
                {cells.map((w, i) => (
                  <div
                    key={`${w}-${i}`}
                    className={cn(
                      "flex items-center justify-center rounded-lg border border-slate-300 bg-slate-50 p-1 text-center font-semibold text-slate-800",
                      size === 3 ? "aspect-square text-xs" : size === 4 ? "aspect-square text-[11px]" : "aspect-square text-[10px]"
                    )}
                  >
                    {w}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-center text-[10px] text-slate-400">
                O'qituvchi so'z aytadi — mos katakni belgilang. To'liq qator = BINGO!
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Doska rejimi uchun bitta katta karta ko'rsatmasi */}
      {enough ? (
        <Card className="p-4 print:hidden">
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            Maslahat: doskaga chiqarish uchun «Kitoblar & O'yinlar» bo'limidagi mavzularda <b>🎟 Bingo kartasi</b>{" "}
            o'yini ham bor — u yerda o'qituvchi paneli va avtomatik BINGO aniqlash mavjud.
          </p>
        </Card>
      ) : null}

      <div className="hidden print:block">
        <p className="mt-6 text-center text-xs text-slate-400">
          Teachers Workspace — {printableTitle} bingo kartalari
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400 print:hidden">
        <Grid3x3 className="h-3.5 w-3.5" />
        <span>
          {cards.length} ta karta · {size}×{size} · jami {words.length} so'zdan
        </span>
        <Download className="ml-2 h-3.5 w-3.5" />
        <span>Chop etish uchun Ctrl+P (brauzer orqali PDF qilib saqlash ham mumkin)</span>
      </div>
    </div>
  );
}
