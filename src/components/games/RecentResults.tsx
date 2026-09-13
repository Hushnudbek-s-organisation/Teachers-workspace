"use client";

// ============================================================================
// O'yinlar statistikasi — oxirgi natijalar (qidiruv va tur bo'yicha filtr)
// Bir qurilmada 2–3 kishi o'ynaganda har o'yinchi alohida qator bo'lib tushadi.
// ============================================================================

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, Card, EmptyState, Input, Select } from "@/components/ui";

export interface RecentResultRow {
  id: string;
  when: string;
  playerName: string;
  studentId: string | null;
  gameTitle: string;
  typeLabel: string;
  emoji: string;
  score: number;
  total: number;
  percent: number;
  timeLabel: string;
}

export function RecentResults({ rows }: { rows: RecentResultRow[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");

  const types = useMemo(
    () => [...new Set(rows.map((r) => r.typeLabel))].sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (type && r.typeLabel !== type) return false;
      if (!q) return true;
      return (
        r.playerName.toLowerCase().includes(q) ||
        r.gameTitle.toLowerCase().includes(q) ||
        r.typeLabel.toLowerCase().includes(q)
      );
    });
  }, [rows, query, type]);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
        <h3 className="mr-auto text-sm font-semibold text-slate-900">
          Oxirgi natijalar <span className="text-xs font-normal text-slate-400">({filtered.length})</span>
        </h3>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ism yoki o'yin nomi…"
            className="w-44 py-1.5 pl-8 text-xs"
          />
        </div>
        <Select value={type} onChange={(e) => setType(e.target.value)} className="w-40 py-1.5 text-xs">
          <option value="">Barcha turlar</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Natija topilmadi"
          description="Filtrni o'zgartiring yoki o'yinni o'ynab, natijani saqlang."
        />
      ) : (
        <div className="max-h-[26rem] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">O'yinchi</th>
                <th className="px-4 py-2 font-medium">O'yin</th>
                <th className="px-4 py-2 text-right font-medium">Ball</th>
                <th className="px-4 py-2 text-right font-medium">%</th>
                <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">Vaqt</th>
                <th className="hidden px-4 py-2 text-right font-medium md:table-cell">Sana</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-2">
                    <span className="font-medium text-slate-800">{r.playerName}</span>
                    {!r.studentId ? (
                      <span className="ml-1.5 text-[10px] text-slate-400">(ism bilan)</span>
                    ) : null}
                  </td>
                  <td className="max-w-[14rem] px-4 py-2">
                    <span className="block truncate text-slate-700">
                      {r.emoji} {r.gameTitle}
                    </span>
                    <span className="text-[11px] text-slate-400">{r.typeLabel}</span>
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-slate-800">
                    {r.score} / {r.total}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Badge
                      className={cn(
                        r.percent >= 70
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : r.percent >= 40
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                      )}
                    >
                      {r.percent}%
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-2 text-right text-xs text-slate-500 sm:table-cell">
                    {r.timeLabel}
                  </td>
                  <td className="hidden px-4 py-2 text-right text-xs text-slate-400 md:table-cell">{r.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
