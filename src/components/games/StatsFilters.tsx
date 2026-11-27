"use client";

// ============================================================================
// O'yin statistikasi filtrlari — sinf, o'quvchi, o'yin va sana bo'yicha.
// Filtr URL orqali (searchParams) beriladi — sahifa SERVERDA filtrlanadi.
// ============================================================================

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Filter, X } from "lucide-react";

export interface StatsFilterOption {
  value: string;
  label: string;
}

export function StatsFilters({
  classes,
  students,
  games,
}: {
  classes: StatsFilterOption[];
  students: StatsFilterOption[];
  games: StatsFilterOption[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.replace(`/games/stats${next.toString() ? `?${next.toString()}` : ""}`);
    },
    [params, router]
  );

  const current = (key: string) => params.get(key) ?? "";
  const hasAny = ["class", "student", "game", "from", "to"].some((k) => current(k));

  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          <Filter className="h-3.5 w-3.5" /> Filtrlar
        </span>

        <select
          value={current("class")}
          onChange={(e) => setParam("class", e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700"
          aria-label="Sinf bo'yicha filtr"
        >
          <option value="">Hamma sinflar</option>
          {classes.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <select
          value={current("student")}
          onChange={(e) => setParam("student", e.target.value)}
          className="max-w-[14rem] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700"
          aria-label="O'quvchi bo'yicha filtr"
        >
          <option value="">Hamma o'quvchilar</option>
          {students.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          value={current("game")}
          onChange={(e) => setParam("game", e.target.value)}
          className="max-w-[14rem] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700"
          aria-label="O'yin bo'yicha filtr"
        >
          <option value="">Hamma o'yinlar</option>
          {games.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>

        <span className="ml-1 flex items-center gap-1 text-xs text-slate-500">
          <input
            type="date"
            value={current("from")}
            onChange={(e) => setParam("from", e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
            aria-label="Sanadan"
          />
          <span>—</span>
          <input
            type="date"
            value={current("to")}
            onChange={(e) => setParam("to", e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
            aria-label="Sanagacha"
          />
        </span>

        {hasAny ? (
          <button
            onClick={() => router.replace("/games/stats")}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <X className="h-3 w-3" /> Tozalash
          </button>
        ) : null}
      </div>
    </div>
  );
}
