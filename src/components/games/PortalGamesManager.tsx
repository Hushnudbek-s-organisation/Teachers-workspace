"use client";

// ============================================================================
// PORTAL O'YINLARI BOSHQARUVI (foydalanuvchi talabi)
//
// O'qituvchi qaysi o'yin bolalar portalida ko'rinishini TANLAYDI:
// tugmani bosganda o'yin bolalardan "berkilib" qoladi (portalda umuman
// chiqmaydi) — faqat o'qituvchi bu yerdan qayta ochadi.
// ============================================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Smartphone } from "lucide-react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import { actionTogglePortalGame } from "@/app/(dashboard)/games/actions";

export interface PortalGameRow {
  key: string;
  title: string;
  origin: string;
  subjectLabel: string;
  points: number;
  closed: boolean;
  fixedOpen?: boolean; // mashq o'yinlari — doim ochiq (yopib bo'lmaydi)
}

export function PortalGamesManager({ items }: { items: PortalGameRow[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = (row: PortalGameRow) => {
    setError(null);
    setPending(row.key);
    startTransition(async () => {
      try {
        const res = await actionTogglePortalGame(row.key, row.closed); // closed=true → ochish
        if (!res.ok) setError(res.error ?? "Amal bajarilmadi.");
        else router.refresh();
      } finally {
        setPending(null);
      }
    });
  };

  return (
    <Card className="mb-6 overflow-hidden">
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Smartphone className="h-4 w-4 text-indigo-600" /> Bolalar portalidagi o'yinlar
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Tugmani bosib o'yinni bolalardan yopishingiz (🔒) yoki qayta ochishingiz mumkin — o'zgarish darhol portalga ta'sir qiladi.
        </p>
      </div>
      {error ? <p className="px-4 pt-2 text-xs font-semibold text-red-600">{error}</p> : null}
      <div className="divide-y divide-slate-100">
        {items.map((row) => (
          <div key={row.key} className="flex items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{row.title}</p>
              <p className="text-[11px] text-slate-400">
                {row.origin} · {row.subjectLabel}
                {row.points ? (
                  <span className="ml-1 font-semibold text-amber-600">+{row.points} ball</span>
                ) : null}
              </p>
            </div>
            {row.fixedOpen ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                <Lock className="h-3 w-3" /> Doim ochiq
              </span>
            ) : (
              <button
                onClick={() => toggle(row)}
                disabled={pending === row.key}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors disabled:opacity-50",
                  row.closed
                    ? "border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200"
                    : "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                )}
              >
                {row.closed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {row.closed ? "YOPILGAN — ochish" : "Ochiq — yopish"}
              </button>
            )}
          </div>
        ))}
        {items.length === 0 ? (
          <p className="px-4 py-4 text-xs text-slate-500">
            Hozircha o'yin yo'q. O'yin yasaganda yoki kitob yuklaganda shu yerda ko'rinadi.
          </p>
        ) : null}
      </div>
    </Card>
  );
}
