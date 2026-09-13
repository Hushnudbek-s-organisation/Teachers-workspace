"use client";

// ============================================================================
// O'yin boshlanishidan oldingi sozlama: "Nech kishi o'ynaydi?"
//
// Barcha o'yin turlari (kitob o'yinlari + o'qituvchi yasagan o'yinlar) uchun
// BIR XIL ishlaydi — tanlov GamePlayer darajasida, taxtalar esa o'zgarmaydi.
//
//   1 kishi → hozirgidek to'liq ekran
//   2–3 kishi → ismlar so'raladi (ro'yxatdan tanlash ham mumkin), qoida
//               tanlanadi: "savollar soni" yoki "vaqt bo'yicha"
// ============================================================================

import { Clock, Flag, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MULTIPLAYER_MINUTE_OPTIONS,
  MULTIPLAYER_MAX_QUESTIONS,
} from "@/lib/config";
import {
  DEFAULT_PLAYER_NAMES,
  PLAYER_COUNTS,
  clampCount,
  isBoardGame,
  isUnlimited,
  themeFor,
  type EndRule,
  type GameSetup,
  type MultiMode,
  type PlayerCount,
} from "@/lib/books/multiplayer";
import type { GameType } from "@/lib/books/types";
import { Input, Select } from "@/components/ui";

export interface StudentOption {
  id: string;
  full_name: string;
}

export function MultiplayerSetup({
  gameType,
  itemsCount,
  setup,
  students,
  onChange,
}: {
  gameType: GameType;
  itemsCount: number;
  setup: GameSetup;
  students: StudentOption[];
  onChange: (next: GameSetup) => void;
}) {
  const board = isBoardGame(gameType);
  const patch = (part: Partial<GameSetup>) => onChange({ ...setup, ...part });

  const setPlayers = (players: PlayerCount) => {
    patch({
      players,
      names: Array.from({ length: players }, (_, i) => setup.names[i] || DEFAULT_PLAYER_NAMES[i] || ""),
      studentIds: Array.from({ length: players }, (_, i) => setup.studentIds[i] ?? null),
    });
  };

  const setName = (index: number, name: string) => {
    const names = [...setup.names];
    names[index] = name;
    patch({ names });
  };

  const pickStudent = (index: number, id: string) => {
    const student = students.find((s) => s.id === id);
    const studentIds = [...setup.studentIds];
    studentIds[index] = student?.id ?? null;
    const names = [...setup.names];
    if (student) names[index] = student.full_name;
    patch({ studentIds, names });
  };

  const setMode = (mode: MultiMode) => patch({ mode });

  const step = (delta: number) => {
    const max = board ? 10 : Math.max(itemsCount, MULTIPLAYER_MAX_QUESTIONS);
    patch({ perPlayer: clampCount(setup.perPlayer + delta, 1, max) });
  };

  const setEndRule = (endRule: EndRule) => patch({ endRule });

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-left sm:p-4">
      {/* --------------------------- Nech kishi? --------------------------- */}
      <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
        <Users className="h-4 w-4 text-indigo-500" /> Nech kishi o'ynaydi?
      </p>
      <p className="mt-0.5 text-xs text-slate-500">
        Bir qurilmada 1, 2 yoki 3 o'yinchi — har birining o'z maydoni, o'z hisobi.
      </p>

      <div className="mt-2.5 grid grid-cols-3 gap-2">
        {PLAYER_COUNTS.map((n) => {
          const active = setup.players === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => setPlayers(n)}
              className={cn(
                "rounded-xl border-2 px-2 py-2.5 text-center transition-all",
                active
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300"
              )}
            >
              <span className="block text-lg font-bold">{n}</span>
              <span className="block text-[11px] font-medium">kishi</span>
            </button>
          );
        })}
      </div>

      {setup.players === 1 ? (
        <p className="mt-2.5 text-xs text-slate-500">
          1 kishi rejimida o'yin butun ekranda, hozirgidek o'ynaladi.
        </p>
      ) : (
        <>
          {/* ------------------------------ Ismlar ------------------------------ */}
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
            O'yinchilar
          </p>
          <div className="mt-1.5 space-y-2">
            {Array.from({ length: setup.players }, (_, i) => {
              const theme = themeFor(i);
              return (
                <div
                  key={i}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2"
                >
                  <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", theme.dot)} />
                  <span className="w-4 shrink-0 text-sm">{theme.emoji}</span>
                  <Input
                    value={setup.names[i] ?? ""}
                    onChange={(e) => setName(i, e.target.value)}
                    placeholder={DEFAULT_PLAYER_NAMES[i]}
                    maxLength={40}
                    className="min-w-[8rem] flex-1 py-1.5 text-sm"
                  />
                  <Select
                    value={setup.studentIds[i] ?? ""}
                    onChange={(e) => pickStudent(i, e.target.value)}
                    className="w-full py-1.5 text-xs sm:w-44"
                    aria-label={`${i + 1}-o'yinchini ro'yxatdan tanlash`}
                  >
                    <option value="">— o'quvchidan tanlash —</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}
                      </option>
                    ))}
                  </Select>
                </div>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">
            Ismni qo'lda yozish ham mumkin — natija o'yinlar statistikasiga shu ism bilan tushadi.
          </p>

          {/* ------------------------------ Qoida ------------------------------ */}
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
            O'yin qanday yakunlansin?
          </p>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("count")}
              className={cn(
                "rounded-xl border-2 px-3 py-2 text-left transition-all",
                setup.mode === "count"
                  ? "border-violet-500 bg-violet-50 text-violet-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-violet-300"
              )}
            >
              <span className="block text-xs font-bold">🔢 Savollar soni</span>
              <span className="block text-[11px] text-slate-500">
                {board ? "nechta taxta o'ynalishi" : "nechta savol berilishi"} belgilanadi
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMode("time")}
              className={cn(
                "rounded-xl border-2 px-3 py-2 text-left transition-all",
                setup.mode === "time"
                  ? "border-rose-500 bg-rose-50 text-rose-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-rose-300"
              )}
            >
              <span className="flex items-center gap-1 text-xs font-bold">
                <Clock className="h-3.5 w-3.5" /> Vaqt bo'yicha
              </span>
              <span className="block text-[11px] text-slate-500">
                Minut tugaguncha savollar ketma-ket keladi
              </span>
            </button>
          </div>

          {setup.mode === "count" ? (
            <div className="mt-2.5 rounded-xl border border-slate-200 bg-white p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-600">
                  Har o'yinchiga{" "}
                  <b className="text-slate-900">
                    {Math.max(1, setup.perPlayer)} {board ? "taxta" : "savol"}
                  </b>
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    disabled={setup.perPlayer <= 1}
                    className="h-8 w-8 rounded-lg border border-slate-300 bg-white text-lg font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
                    aria-label="Kamaytirish"
                  >
                    −
                  </button>
                  <Input
                    type="number"
                    min={1}
                    max={board ? 10 : MULTIPLAYER_MAX_QUESTIONS}
                    value={Number.isFinite(setup.perPlayer) ? setup.perPlayer : ""}
                    onChange={(e) => {
                      const n = Math.round(Number(e.target.value));
                      patch({ perPlayer: Number.isFinite(n) && n >= 0 ? n : 0 });
                    }}
                    className="h-8 w-16 px-2 text-center text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => step(1)}
                    disabled={setup.perPlayer >= (board ? 10 : MULTIPLAYER_MAX_QUESTIONS)}
                    className="h-8 w-8 rounded-lg border border-slate-300 bg-white text-lg font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
                    aria-label="Ko'paytirish"
                  >
                    +
                  </button>
                </div>
              </div>

              {!board && setup.perPlayer > itemsCount ? (
                <p className="mt-1.5 text-[11px] text-amber-600">
                  Bu o'yinda {itemsCount} ta savol bor — savollar aralashtirilib takrorlanadi (har
                  o'yinchiga baribir har xil savol tushadi).
                </p>
              ) : null}
              {board && itemsCount < setup.players * 4 ? (
                <p className="mt-1.5 text-[11px] text-amber-600">
                  To'plam kichik ({itemsCount} ta) — har o'yinchi bir xil to'plamni har xil tartibda
                  o'ynaydi.
                </p>
              ) : null}

              <div className="mt-2.5 border-t border-slate-100 pt-2.5">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <Flag className="h-3.5 w-3.5" /> Qachon tugaydi?
                </p>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {(
                    [
                      { key: "first", label: "🏁 Birinchi tugatgan", note: "poyga — qolganlar to'xtaydi" },
                      { key: "all", label: "⚖️ Hammasi tugatguncha", note: "har kim o'z to'plamini bitiradi" },
                    ] as Array<{ key: EndRule; label: string; note: string }>
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setEndRule(opt.key)}
                      className={cn(
                        "rounded-lg border px-2 py-1.5 text-left transition-all",
                        setup.endRule === opt.key
                          ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 bg-white text-slate-500 hover:border-indigo-200"
                      )}
                    >
                      <span className="block text-[11px] font-bold">{opt.label}</span>
                      <span className="block text-[10px] opacity-80">{opt.note}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-2.5 rounded-xl border border-slate-200 bg-white p-2.5">
              <p className="text-xs font-medium text-slate-600">
                Qancha vaqt? <b className="text-slate-900">{setup.minutes} daqiqa</b>
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {MULTIPLAYER_MINUTE_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => patch({ minutes: m })}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all",
                      setup.minutes === m
                        ? "border-rose-400 bg-rose-50 text-rose-700"
                        : "border-slate-200 bg-white text-slate-500 hover:border-rose-200"
                    )}
                  >
                    {m} daq
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">
                Vaqt tugashi bilan barcha maydonlar to'xtaydi va kim nechta savol ishlagani
                ko'rsatiladi.
              </p>
            </div>
          )}

          <p className="mt-2.5 rounded-xl bg-white/70 px-2.5 py-2 text-[11px] text-slate-500">
            {isUnlimited(setup)
              ? "Barcha o'yinchilar bir vaqtda boshlaydi va bir vaqtda o'ynaydi — har kimga har xil savol tushadi."
              : "Barcha o'yinchilar bir vaqtda boshlaydi: har kim o'z savolini yechib bo'lgach keyingisiga o'tadi, boshqalar o'zinikini davom ettiradi."}
            Telefonda maydonlar ustma-ust, keng ekranda (yoki gorizontal holatda) yonma-yon joylashadi.
          </p>
        </>
      )}
    </div>
  );
}
