"use client";

// ============================================================================
// Portal bosh sahifasi — katta kartalar, fan bo'yicha filtr, telefon uchun mos.
// O'quvchi parol YO'Q: faqat o'z shaxsiy linki. O'qituvchi menyusi ko'rinmaydi,
// boshqa bolalar ma'lumotlari ham ko'rinmaydi.
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CatalogEntry } from "@/lib/portal/types";
import { actionPortalVisit } from "@/app/portal/actions";

const SOURCE_BADGE: Record<CatalogEntry["source"], { label: string; cls: string }> = {
  book: { label: "Kitob o'yini", cls: "border-sky-200 bg-sky-50 text-sky-700" },
  custom: { label: "O'qituvchi o'yini", cls: "border-violet-200 bg-violet-50 text-violet-700" },
  practice: { label: "Mashq o'yini", cls: "border-amber-200 bg-amber-50 text-amber-700" },
};

export function PortalHome({
  token,
  student,
  catalog,
}: {
  token: string;
  student: { firstName: string; classLabel: string };
  catalog: CatalogEntry[];
}) {
  // Brauzerga sessiya cookie'si (duo o'yinda mehmon sifatida bog'lanish uchun)
  useEffect(() => {
    actionPortalVisit(token).catch(() => undefined);
  }, [token]);

  const subjects = useMemo(() => {
    const set = new Map<string, string>();
    for (const e of catalog) set.set(e.subjectKey, e.subject);
    return [...set.entries()];
  }, [catalog]);

  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? catalog : catalog.filter((e) => e.subjectKey === filter);

  const practiceCount = catalog.filter((e) => e.practice).length;

  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl px-4 py-6">
      {/* Salomlashuv — faqat ISM (to'liq ism yoki sinf ro'yxati ko'rinmaydi) */}
      <div className="mb-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-5 text-white shadow-md">
        <p className="text-2xl font-bold">
          {student.firstName ? `Salom, ${student.firstName}! 👋` : "Salom! 👋"}
        </p>
        <p className="mt-1 text-sm text-white/85">
          O'yinini tanla va o'yna! {practiceCount ? `· ${practiceCount} ta mashq o'yini har doim mavjud.` : ""}
        </p>
      </div>

      {/* Fan bo'yicha filtr — katta chip tugmalar */}
      {subjects.length > 1 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-full border-2 px-4 py-2 text-sm font-semibold transition-colors",
              filter === "all"
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-600"
            )}
          >
            Hammasi ({catalog.length})
          </button>
          {subjects.map(([key, label]) => {
            const n = catalog.filter((e) => e.subjectKey === key).length;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-full border-2 px-4 py-2 text-sm font-semibold transition-colors",
                  filter === key
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-600"
                )}
              >
                {label} ({n})
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Katalog — katta kartalar */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <Gamepad2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-semibold text-slate-700">Hozircha o'yinlar yo'q</p>
          <p className="mt-1 text-sm text-slate-500">
            O'qituvchingiz yangi o'yin qo'shganda, bu yerda avtomatik paydo bo'ladi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((entry) => (
            <Link
              key={entry.key}
              href={`/o/${token}/g/${encodeURIComponent(entry.key)}`}
              className="group rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-indigo-400 hover:shadow-md active:scale-[0.99]"
            >
              <div className="flex items-start gap-3">
                <span className="text-4xl" aria-hidden>
                  {entry.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-slate-900">{entry.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{entry.instructions}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", SOURCE_BADGE[entry.source].cls)}>
                      {SOURCE_BADGE[entry.source].label}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                      {entry.subject}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                      {entry.savollar} savol
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-slate-400">
        Bu sahifa faqat senga tegishli — linkni boshqalarga bermagin. 🙌
      </p>
    </div>
  );
}
