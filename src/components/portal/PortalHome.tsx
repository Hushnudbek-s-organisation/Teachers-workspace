"use client";

// ============================================================================
// Portal bosh sahifasi — katta kartalar, fan bo'yicha filtr, telefon uchun mos.
// O'quvchi parol YO'Q: faqat o'z shaxsiy linki. O'qituvchi menyusi ko'rinmaydi,
// boshqa bolalar ma'lumotlari ham ko'rinmaydi.
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CatalogEntry } from "@/lib/portal/types";
import { actionPortalVisit } from "@/app/portal/actions";

const SOURCE_BADGE: Record<CatalogEntry["source"], { label: string; cls: string }> = {
  book: { label: "Kitob o'yini", cls: "border-sky-200 bg-sky-50 text-sky-700" },
  custom: { label: "O'qituvchi o'yini", cls: "border-violet-200 bg-violet-50 text-violet-700" },
  practice: { label: "Mashq o'yini", cls: "border-amber-200 bg-amber-50 text-amber-700" },
};

export interface DailyGameInfo {
  key: string;
  title: string;
  emoji: string;
  points: number;
  done: boolean;
}

export function PortalHome({
  token,
  student,
  catalog,
  daily,
  lockedKeys,
}: {
  token: string;
  student: { firstName: string; classLabel: string };
  catalog: CatalogEntry[];
  daily?: DailyGameInfo | null;
  lockedKeys?: string[];
}) {
  const locked = new Set(lockedKeys ?? []);
  const isLocked = (key: string) => locked.has(key);
  const isDaily = (key: string) => daily?.key === key;
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
  const router = useRouter();
  const [duoCode, setDuoCode] = useState("");
  const [duoErr, setDuoErr] = useState<string | null>(null);

  const joinDuo = () => {
    const c = duoCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,10}$/.test(c)) {
      setDuoErr("Kod 4-6 ta harf/raqam. Do'stingizdan kodni oling.");
      return;
    }
    router.push(`/o/duo/${c}`);
  };

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

      {/* ⭐ Bugungi majburiy o'yin — bajarilmaguncha boshqalar yopiq */}
      {daily && !daily.done ? (
        <div className="mb-5 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 px-5 py-4">
          <p className="text-sm font-bold text-amber-900">
            ⭐ Bugungi majburiy o'yin: {daily.emoji} {daily.title} (+{daily.points} ball)
          </p>
          <p className="mt-0.5 text-xs text-amber-800">
            Bu o'yinni tugatmaguncha boshqa o'yinlar 🔒 yopiq. Mashq o'yinlari har doim ochiq.
          </p>
          <Link
            href={`/o/${token}/g/${encodeURIComponent(daily.key)}`}
            className="mt-2.5 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white hover:bg-amber-600 min-h-[48px]"
          >
            ▶ Hozir o'ynash
          </Link>
        </div>
      ) : daily?.done ? (
        <div className="mb-5 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-5 py-3">
          <p className="text-sm font-semibold text-emerald-800">
            ✅ Bugungi majburiy o'yin bajarildi (+{daily.points} ball) — hamma o'yinlar ochiq!
          </p>
        </div>
      ) : null}

      {/* Do'stim bilan o'ynash — do'st xonasining KODini kiriting */}
      <div className="mb-5 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-5 py-4">
        <p className="text-sm font-bold text-emerald-900">🤝 Do'stim bilan o'ynash</p>
        <p className="mt-0.5 text-xs text-emerald-800">
          Do'stingiz sizga xona kodini berdi? Shu yerga kiriting — O'Z akkauntingiz bilan kirish chiqadi:
        </p>
        <div className="mt-2.5 flex gap-2">
          <input
            value={duoCode}
            onChange={(e) => {
              setDuoCode(e.target.value.toUpperCase());
              setDuoErr(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && joinDuo()}
            placeholder="KOD, masalan: YGJJFE"
            maxLength={10}
            className="w-40 rounded-xl border-2 border-emerald-300 bg-white px-3 py-3 font-mono text-lg font-black tracking-[0.2em] text-slate-800 uppercase focus:border-emerald-500 focus:outline-none"
            aria-label="Do'st xona kodi"
          />
          <button
            onClick={joinDuo}
            className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 min-h-[50px]"
          >
            Do'stimning o'yiniga kirish ▶
          </button>
        </div>
        {duoErr ? <p className="mt-1.5 text-xs font-semibold text-red-600">{duoErr}</p> : null}
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
          {filtered.map((entry) => {
            const isDailyCard = isDaily(entry.key);
            const cardLocked = isLocked(entry.key);
            if (cardLocked) {
              return (
                <div
                  key={entry.key}
                  className="relative rounded-2xl border-2 border-slate-200 bg-slate-100 p-4 opacity-80"
                  title="Bugungi majburiy o'yinni tugatganingizdan keyin ochiladi"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-4xl grayscale" aria-hidden>
                      {entry.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold text-slate-500">{entry.title}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        🔒 Yopiq — avval bugungi majburiy o'yinni tugatng
                      </p>
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <Link
                key={entry.key}
                href={`/o/${token}/g/${encodeURIComponent(entry.key)}`}
                className={cn(
                  "group rounded-2xl border-2 bg-white p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.99]",
                  isDailyCard ? "border-amber-400 hover:border-amber-500" : "border-slate-200 hover:border-indigo-400"
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="text-4xl" aria-hidden>
                    {entry.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    {isDailyCard && daily ? (
                      <p className="mb-0.5 text-[10px] font-black uppercase tracking-wide text-amber-600">
                        ⭐ Bugungi majburiy · +{daily.points} ball
                      </p>
                    ) : null}
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
                      {!entry.practice && !isDailyCard ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          {entry.subject === "Ona tili" ? "+4" : "+2"} ball
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-slate-400">
        Bu sahifa faqat senga tegishli — linkni boshqalarga bermagin. 🙌
      </p>
    </div>
  );
}
