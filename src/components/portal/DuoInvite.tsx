"use client";

// ============================================================================
// "Do'stim bilan o'ynash" — HOST oqimi:
//
//   1. REJIM TANLASH — o'qituvchi ko'p kishilik rejimlari kabi:
//        🎯 Savollar soni (hamma savolga javob)
//        🏁 Poyga (birinchi tugatgan g'olib)
//        ⏱ Vaqt bo'yicha (vaqt tugaguncha savollar davom etadi)
//   2. "Taklif linkini nusxalash" — do'stga yuboriladigan ALOHIDA havola
//   3. "Do'stimni kutyapman" — kutish ekrani (polling bilan)
//   4. "Boshlash" — do'st qo'shilmasa ham bosiladi (qotib qolish yo'q)
//
// Yakunda raqib natijasi avtomatik ko'rinadi (polling), poygada g'olib
// ko'rsatiladi. Do'st faqat taxallusni ko'radi: ismlar/telefon YO'Q.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, PartyPopper, RotateCcw, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CatalogEntry, FinishOutcome, PortalQuestion, RoomStateView } from "@/lib/portal/types";
import {
  actionPortalCancelRoom,
  actionPortalCreateRoom,
  actionPortalFinish,
  actionPortalRoomAnswer,
  actionPortalRoomFinish,
  actionPortalRoomQuestions,
  actionPortalRoomState,
  actionPortalStartRoom,
  type RoomEndMode,
} from "@/app/portal/actions";
import { QuestionFlow } from "./QuestionFlow";
import { newAttemptId } from "./attempt";

type HostPhase = "setup" | "creating" | "invite" | "waiting" | "play" | "done" | "error";

const MODES: Array<{ key: RoomEndMode; title: string; hint: string }> = [
  { key: "questions", title: "🎯 Savollar soni", hint: "Ikkala o'yinchi ham barcha savollarga javob beradi (oddiy rejim)" },
  { key: "race", title: "🏁 Poyga", hint: "Birinchi tugatgan G'OLIB bo'ladi! (tezkorlik o'yini)" },
  { key: "time", title: "⏱ Vaqt bo'yicha", hint: "Vaqt tugaguncha savollar davom etadi — ko'p to'g'ri javob yutadi" },
];

export function DuoInvite({ token, entry, onBack }: { token: string; entry: CatalogEntry; onBack: () => void }) {
  const [phase, setPhase] = useState<HostPhase>("setup");
  const [endMode, setEndMode] = useState<RoomEndMode>("questions");
  const [timeMin, setTimeMin] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [state, setState] = useState<RoomStateView | null>(null);
  const [questions, setQuestions] = useState<PortalQuestion[] | null>(null);
  const [outcome, setOutcome] = useState<FinishOutcome | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [timeLeftSec, setTimeLeftSec] = useState<number | null>(null);
  const [netProblem, setNetProblem] = useState(false);
  const [saving, setSaving] = useState(false);
  const finishedRef = useRef(false);
  const startedRef = useRef(false);
  const scoreRef = useRef(0);

  const create = useCallback(
    async (mode: RoomEndMode, minutes: number) => {
      setPhase("creating");
      setError(null);
      const res = await actionPortalCreateRoom(token, entry.key, mode, minutes);
      if (!res.ok) {
        setError(res.error);
        setPhase("error");
        return;
      }
      setCode(res.code);
      setInviteUrl(res.inviteUrl);
      setPhase("waiting");
    },
    [token, entry.key]
  );

  // Polling — do'st qo'shilgach holatni yangilaydi
  useEffect(() => {
    if (phase !== "waiting") return;
    let alive = true;
    const tick = async () => {
      try {
        const res = await actionPortalRoomState(code);
        if (!alive) return;
        if (res.ok) {
          setNetProblem(false);
          setState(res.state);
          if (res.state.status === "playing" && !startedRef.current) {
            startedRef.current = true;
            await beginPlay();
          }
          if (res.state.status === "cancelled") {
            setError("Xona bekor qilindi.");
            setPhase("error");
          }
        } else {
          setNetProblem(true);
        }
      } catch {
        if (alive) setNetProblem(true);
      }
    };
    const timer = window.setInterval(tick, 2500);
    void tick();
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, code]);

  const beginPlay = async () => {
    const st = await actionPortalRoomState(code);
    if (st.ok) setState(st.state);
    const res = await actionPortalRoomQuestions(code);
    if (!res.ok) {
      setError(res.error);
      setPhase("error");
      return;
    }
    setQuestions(res.questions);
    setStartedAt(Date.now());
    if (st.ok && st.state.endMode === "time" && st.state.timeLimitMin) {
      setTimeLeftSec(st.state.timeLimitMin * 60);
    }
    setPhase("play");
  };

  const start = async () => {
    const res = await actionPortalStartRoom(code);
    if (!res.ok) {
      setError(res.error ?? "Boshlab bo'lmadi.");
      return;
    }
    startedRef.current = true;
    await beginPlay();
  };

  const finish = async (localScore: number) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setSaving(true);
    setTimeLeftSec(null);
    const timeSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    try {
      const res = await actionPortalRoomFinish(code, timeSec, newAttemptId());
      if (res.ok) setOutcome(res.outcome);
      else
        setOutcome({
          saved: false,
          alreadySaved: false,
          score: localScore,
          total: questions?.length ?? 0,
          percent: 0,
          problem: res.error,
        });
    } finally {
      setSaving(false);
      setPhase("done");
    }
  };

  // ⏱ Vaqt bo'yicha rejim: hisoblagich + avtomatik yakunlash
  useEffect(() => {
    if (phase !== "play" || timeLeftSec === null) return;
    if (timeLeftSec <= 0) {
      void finish(scoreRef.current);
      return;
    }
    const t = window.setTimeout(() => setTimeLeftSec((s) => (s === null ? null : s - 1)), 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeftSec]);

  // Yakunda raqib natijasi avtomatik ko'rinadi (polling)
  useEffect(() => {
    if (phase !== "done") return;
    let alive = true;
    const tick = async () => {
      try {
        const res = await actionPortalRoomState(code);
        if (alive && res.ok) setState(res.state);
      } catch {
        /* keyingi siklda qayta uriniladi */
      }
    };
    const timer = window.setInterval(tick, 3000);
    void tick();
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [phase, code]);

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Nusxalash ishlamadi — havolani qo'lda tanlab nusxalang.");
    }
  };

  // ----------------------------- SETUP: rejim tanlash -----------------------------
  if (phase === "setup") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100">
          <ArrowLeft className="h-4 w-4" /> Orqaga
        </button>
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-base font-bold text-slate-900">🤝 Do'stim bilan o'ynash — {entry.title}</p>
          <p className="mt-1 text-sm text-slate-500">Qanday yakunlanishini tanlang (o'qituvchi rejimlari kabi):</p>

          <div className="mt-4 space-y-2.5">
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => setEndMode(m.key)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-colors",
                  endMode === m.key ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-indigo-500 text-[10px] font-bold text-indigo-600">
                  {endMode === m.key ? "✓" : ""}
                </span>
                <span>
                  <span className="block text-sm font-bold text-slate-900">{m.title}</span>
                  <span className="block text-xs text-slate-500">{m.hint}</span>
                </span>
              </button>
            ))}
          </div>

          {endMode === "time" ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-semibold text-amber-900">⏱ Vaqtni tanlang:</p>
              <div className="mt-2 flex gap-2">
                {[1, 2, 3, 5].map((m) => (
                  <button
                    key={m}
                    onClick={() => setTimeMin(m)}
                    className={cn(
                      "rounded-lg border-2 px-4 py-2 text-sm font-bold",
                      timeMin === m ? "border-amber-500 bg-amber-500 text-white" : "border-slate-300 bg-white text-slate-700"
                    )}
                  >
                    {m} daq
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">⚠ {error}</p> : null}

          <button
            onClick={() => void create(endMode, timeMin)}
            className="mt-5 w-full rounded-xl bg-emerald-600 px-7 py-3.5 text-base font-bold text-white hover:bg-emerald-700 min-h-[52px]"
          >
            Xona yaratish ▶
          </button>
        </div>
      </div>
    );
  }

  if (phase === "creating") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10 text-center">
        <p className="text-sm font-medium text-slate-500">Xona yaratilmoqda...</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10 text-center">
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">⚠ {error}</p>
        <button onClick={onBack} className="mt-4 rounded-xl border-2 border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700">
          Orqaga
        </button>
      </div>
    );
  }

  if (phase === "invite" || phase === "waiting") {
    const joined = state?.guestJoined ?? false;
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100">
          <ArrowLeft className="h-4 w-4" /> Orqaga
        </button>
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-base font-bold text-slate-900">🤝 Do'stim bilan o'ynash — {entry.title}</p>
          <p className="mt-1 text-sm text-slate-500">
            Xona kodi: <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-base font-bold text-indigo-700">{code}</span>
          </p>

          <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">1-2-QADAM</p>
            <p className="mt-1 text-sm font-medium text-slate-700">
              Do'stingiz O'Z havolasini ochib, shu KODNI kiritsin (yoki havolani yuboring):
            </p>
            <div className="mt-2 rounded-xl bg-white px-4 py-3 text-center">
              <span className="font-mono text-3xl font-black tracking-[0.3em] text-indigo-700">{code}</span>
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                readOnly
                value={inviteUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700"
              />
              <button
                onClick={copyInvite}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 min-h-[44px]"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Nusxalandi!" : "Taklif linkini nusxalash"}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Bu havola faqat SHU o'yin uchun · muddati 2 soat · uchinchi o'yinchi qo'shilolmaydi.
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">3-QADAM</p>
            {joined ? (
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <PartyPopper className="h-5 w-5" /> Do'stingiz qo'shildi! Tayyorsizmi?
              </p>
            ) : (
              <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-600">
                <span className="flex h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" aria-hidden />
                Do'stimni kutyapman... (bu ekran ochiq tursin)
              </p>
            )}
            {!joined ? (
              <p className="mt-1.5 text-[11px] text-slate-400">
                Maslahat: do'stingiz qo'shilmasa ham «Boshlash» bosishingiz mumkin — u kodni kiritib
                qo'shilgach o'ynayveradi.
              </p>
            ) : null}
            {netProblem ? (
              <p className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800">
                ⚠ Ulanish uzildi — qayta ulanmoqda...
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={start}
                className="rounded-xl bg-emerald-600 px-7 py-3 text-base font-bold text-white hover:bg-emerald-700 disabled:opacity-40 min-h-[50px]"
              >
                ▶ Boshlash
              </button>
              <button
                onClick={async () => {
                  await actionPortalCancelRoom(code);
                  onBack();
                }}
                className="rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 min-h-[50px]"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "play" && questions) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <p className="mb-2 text-center text-sm font-semibold text-indigo-700">
          🤝 Juftlik rejimi — {state?.guestJoined ? "do'stingiz bilan" : "do'stingiz kutyapti"}
        </p>
        {timeLeftSec !== null ? (
          <p
            className={cn(
              "mb-2 rounded-xl px-4 py-2.5 text-center text-base font-bold",
              timeLeftSec <= 30 ? "bg-red-100 text-red-700" : "bg-indigo-50 text-indigo-700"
            )}
          >
            ⏱ Qoldi: {Math.floor(timeLeftSec / 60)}:{String(timeLeftSec % 60).padStart(2, "0")}
          </p>
        ) : null}
        <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 text-white">
            <p className="truncate text-base font-bold">{entry.title}</p>
            <p className="text-xs text-white/80">
              {endMode === "race"
                ? "🏁 Poyga — birinchi tugatgan g'olib!"
                : endMode === "time"
                  ? "⏱ Vaqt bo'yicha — vaqt tugaguncha savollar davom etadi"
                  : "Do'stingiz ham shu savollarni ko'ryapti · bir xil savollar"}
            </p>
          </div>
          <div className="p-4 sm:p-6">
            <QuestionFlow
              questions={questions}
              onAnswer={(qIndex, choice) =>
                actionPortalRoomAnswer(code, qIndex, choice).then((r) => {
                  if (!r.ok) throw new Error(r.error);
                  if (r.feedback.correct) scoreRef.current += 1;
                  return r.feedback;
                })
              }
              onFinish={finish}
            />
          </div>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10 text-center">
        <TrophyDone outcome={outcome} saving={saving} state={state} mySlot="host" total={questions?.length ?? 0} />
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-base font-bold text-white hover:bg-indigo-700 min-h-[52px]"
          >
            <RotateCcw className="h-5 w-5" /> Yangi juftlik o'yini
          </button>
          <Link
            href={`/o/${token}`}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-700 min-h-[52px]"
          >
            Boshqa o'yinlar
          </Link>
        </div>
      </div>
    );
  }

  return null;
}

function TrophyDone({
  outcome,
  saving,
  state,
  mySlot,
  total,
}: {
  outcome: FinishOutcome | null;
  saving: boolean;
  state: RoomStateView | null;
  mySlot: "host" | "guest";
  total: number;
}) {
  if (!outcome) return <p className="text-sm text-slate-500">Yakunlanmoqda...</p>;

  const oppScore = state?.opponentScore ?? null;
  const oppDone = state?.opponentDone ?? false;
  const iWon = state?.winnerSlot === mySlot;
  const oppWon = state?.winnerSlot != null && state.winnerSlot !== mySlot;

  return (
    <div className="flex flex-col items-center gap-3">
      {iWon ? (
        <p className="rounded-xl bg-amber-100 px-5 py-2.5 text-base font-bold text-amber-800">🏆 Siz birinchi tugatdingiz — G'OLIB!</p>
      ) : oppWon ? (
        <p className="rounded-xl bg-slate-100 px-5 py-2.5 text-base font-bold text-slate-700">🏅 Do'stingiz birinchi tugatdi (g'olib)</p>
      ) : null}
      <Trophy className={cn("h-14 w-14", outcome.percent >= 70 ? "text-amber-400" : "text-slate-300")} />
      <p className="text-3xl font-bold text-slate-900">
        {outcome.score} / {outcome.total}
      </p>
      <p className="text-sm font-medium text-slate-500">{outcome.percent}% to'g'ri javob</p>
      {oppDone && oppScore != null ? (
        <p className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
          🎯 Do'stingiz natijasi: {oppScore} / {total} ({total ? Math.round((oppScore / total) * 100) : 0}%)
        </p>
      ) : (
        <p className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-500">
          <span className="flex h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" aria-hidden />
          Do'stingiz hali o'ynamoqda... natijasi avtomatik ko'rinadi
        </p>
      )}
      {saving ? (
        <p className="text-sm text-slate-500">Saqlanmoqda...</p>
      ) : outcome.saved ? (
        <p className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800">
          <Check className="h-4 w-4" /> Natijangiz saqlandi ✅
        </p>
      ) : (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
          ⚠ Saqlanmadi{outcome.problem ? `: ${outcome.problem}` : ""}
        </p>
      )}
    </div>
  );
}
