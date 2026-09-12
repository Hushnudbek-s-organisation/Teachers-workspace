"use client";

// ============================================================================
// 🎡 CHARXPALAK — navbat bilan o'quvchi chaqirish yoki savol tanlash
// ============================================================================

import { useMemo, useRef, useState } from "react";
import { RotateCw, Settings2, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, Card, Field, Select, Textarea } from "@/components/ui";

const PALETTE = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b",
  "#10b981", "#14b8a6", "#0ea5e9", "#84cc16", "#a855f7",
];

export function Wheel({
  studentNames,
  bookWords,
}: {
  studentNames: string[];
  bookWords: { book: string; words: string[] }[];
}) {
  const [mode, setMode] = useState<"oquvchi" | "savol">("oquvchi");
  const [raw, setRaw] = useState(studentNames.join("\n"));
  const [bookId, setBookId] = useState(bookWords[0]?.book ?? "");
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [used, setUsed] = useState<string[]>([]);
  const [removeUsed, setRemoveUsed] = useState(true);
  const spinRef = useRef(0);

  // Savol rejimida tanlangan kitob so'zlari
  const words = useMemo(() => {
    if (mode === "oquvchi") {
      return raw
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return bookWords.find((b) => b.book === bookId)?.words ?? [];
  }, [mode, raw, bookId, bookWords]);

  const available = removeUsed ? words.filter((w) => !used.includes(w)) : words;

  const segments = useMemo(() => {
    const list = available.length ? available : ["—"];
    const per = 360 / list.length;
    return list.map((label, i) => ({ label, start: i * per, end: (i + 1) * per }));
  }, [available]);

  const gradient = useMemo(() => {
    if (!segments.length) return "conic-gradient(#e2e8f0 0deg 360deg)";
    const stops = segments.map((s, i) => `${PALETTE[i % PALETTE.length]} ${s.start}deg ${s.end}deg`);
    return `conic-gradient(${stops.join(", ")})`;
  }, [segments]);

  const spin = () => {
    if (spinning || !available.length) return;
    setSpinning(true);
    setWinner(null);

    const idx = Math.floor(Math.random() * available.length);
    const per = 360 / available.length;
    // segment markazi tepaga (12 soat) to'g'ri kelishi uchun
    const target = 360 * 6 + (360 - (idx * per + per / 2));
    const next = spinRef.current + target;
    spinRef.current = next;
    setRotation(next);

    setTimeout(() => {
      const w = available[idx];
      setWinner(w);
      setUsed((prev) => (prev.includes(w) ? prev : [...prev, w]));
      setSpinning(false);
    }, 4200);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      {/* Charxpalak */}
      <Card className="flex flex-col items-center justify-center p-6">
        <div className="relative">
          {/* Ko'rsatkich */}
          <div className="absolute left-1/2 top-[-10px] z-10 -translate-x-1/2">
            <div className="h-0 w-0 border-x-[13px] border-t-[22px] border-x-transparent border-t-slate-800 drop-shadow" />
          </div>

          <div
            className="relative h-[300px] w-[300px] rounded-full border-[10px] border-white shadow-xl sm:h-[380px] sm:w-[380px]"
            style={{
              background: gradient,
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
            }}
          >
            {segments.length <= 14
              ? segments.map((s, i) => {
                  const mid = (s.start + s.end) / 2;
                  const label = s.label.length > 16 ? s.label.slice(0, 15) + "…" : s.label;
                  return (
                    <div
                      key={`${s.label}-${i}`}
                      className="absolute left-1/2 top-1/2 origin-left text-[11px] font-semibold text-white drop-shadow sm:text-xs"
                      style={{ transform: `rotate(${mid - 90}deg) translate(-50%, -50%)` }}
                    >
                      <span className="whitespace-nowrap">{label}</span>
                    </div>
                  );
                })
              : null}
          </div>

          {/* Markaz */}
          <button
            onClick={spin}
            disabled={spinning || !available.length}
            className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-slate-900 text-xs font-bold text-white shadow-lg transition-transform hover:scale-105 disabled:opacity-60"
          >
            {spinning ? "..." : "AYLANTIR"}
          </button>
        </div>

        <div className="mt-6 flex min-h-[64px] flex-col items-center justify-center">
          {winner ? (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {mode === "oquvchi" ? "Navbat" : "Savol / so'z"}
              </p>
              <p className="animate-[pop_0.4s_ease-out] text-center text-2xl font-bold text-indigo-600 sm:text-3xl">
                {winner}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-400">
              {spinning ? "Aylanmoqda…" : "«AYLANTIR» tugmasini bosing"}
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button variant="secondary" onClick={() => setUsed([])} disabled={!used.length}>
            <RotateCw className="h-4 w-4" /> Ro'yxatni tiklash ({used.length})
          </Button>
        </div>
      </Card>

      {/* Sozlamalar */}
      <Card className="p-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Settings2 className="h-4 w-4 text-indigo-600" /> Sozlamalar
        </p>

        <div className="mb-4 flex rounded-lg border border-slate-200 p-0.5">
          {(
            [
              { key: "oquvchi", label: "O'quvchilar", icon: Users },
              { key: "savol", label: "So'z / savol", icon: Sparkles },
            ] as const
          ).map((m) => (
            <button
              key={m.key}
              onClick={() => {
                setMode(m.key);
                setWinner(null);
              }}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                mode === m.key ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <m.icon className="h-3.5 w-3.5" /> {m.label}
            </button>
          ))}
        </div>

        {mode === "oquvchi" ? (
          <Field label="Ro'yxat (har bir ism yangi qatorda)" hint="Sinf ro'yxatidan avtomatik to'ldirildi">
            <Textarea
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value);
                setUsed([]);
              }}
              className="min-h-[220px] text-xs"
            />
          </Field>
        ) : (
          <>
            <Field label="Kitob">
              <Select value={bookId} onChange={(e) => setBookId(e.target.value)}>
                {bookWords.map((b) => (
                  <option key={b.book} value={b.book}>
                    {b.book}
                  </option>
                ))}
              </Select>
            </Field>
            <p className="mt-2 text-xs text-slate-500">
              Tanlangan kitobning mavzularidan {words.length} ta so'z/atama olindi.
            </p>
          </>
        )}

        <label className="mt-4 flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={removeUsed}
            onChange={(e) => setRemoveUsed(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Chiqqanlarni ro'yxatdan olib tashlash (takrorlanmasin)
        </label>

        {used.length ? (
          <div className="mt-4">
            <p className="mb-1.5 text-xs font-medium text-slate-500">Chiqib bo'lganlar:</p>
            <div className="flex flex-wrap gap-1">
              {used.map((u) => (
                <span key={u} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 line-through">
                  {u}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
