"use client";

// ============================================================================
// Taklif linki bilan qo'shilish (/o/duo/<kod>) — MEHMON oqimi.
//
//   • Do'st faqat TAXALLUS kiritadi — to'liq ism, telefon, boshqalar ko'rinmaydi
//   • Mehmonning o'z shaxsiy linki bo'lsa (cookie yoki qo'lda kiritish) —
//     natija FAQAT O'ZIga yoziladi; yo'q bo'lsa mehmon sifatida (profiga
//     hech narsa yozilmaydi)
//   • Ochiq chat yoki ochiq reyting YO'Q
//   • Sahifa yangilansa — cookie orqali o'yinchining o'ziga qaytariladi
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, PartyPopper, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FinishOutcome, PortalQuestion, RoomStateView } from "@/lib/portal/types";
import {
  actionPortalJoinRoom,
  actionPortalRoomAnswer,
  actionPortalRoomFinish,
  actionPortalRoomQuestions,
  actionPortalRoomState,
} from "@/app/portal/actions";
import { QuestionFlow } from "./QuestionFlow";
import { newAttemptId } from "./attempt";

type Phase = "join" | "waiting" | "play" | "done" | "error";

export function DuoJoin({
  code,
  initial,
}: {
  code: string;
  initial: { status?: string; gameTitle?: string; total?: number; guestFirstName?: string | null };
}) {
  const [phase, setPhase] = useState<Phase>("join");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<RoomStateView | null>(null);
  const [questions, setQuestions] = useState<PortalQuestion[] | null>(null);
  const [outcome, setOutcome] = useState<FinishOutcome | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [netProblem, setNetProblem] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gameTitle, setGameTitle] = useState(initial.gameTitle ?? "");
  const [timeLeftSec, setTimeLeftSec] = useState<number | null>(null);
  const finishedRef = useRef(false);
  const scoreRef = useRef(0);

  // Qayta ulanish: cookie'da maxfiy kalit bo'lsa to'g'ridan-to'g'ri holatni olamiz
  const resume = useCallback(async () => {
    try {
      const res = await actionPortalRoomState(code);
      if (!res.ok) return false;
      setState(res.state);
      if (res.state.status === "playing") {
        const q = await actionPortalRoomQuestions(code);
        if (q.ok) {
          setQuestions(q.questions);
          setStartedAt(Date.now());
          if (res.state.endMode === "time" && res.state.timeLimitMin) {
            const elapsed = Math.floor((Date.now() - new Date(res.state.myAnswered ? Date.now() : Date.now()).getTime()) / 1000);
            void elapsed;
            setTimeLeftSec(res.state.timeLimitMin * 60);
          }
          setPhase("play");
          return true;
        }
      }
      if (res.state.status === "finished" || res.state.status === "cancelled") {
        setPhase("done");
        return true;
      }
      setPhase("waiting");
      return true;
    } catch {
      return false;
    }
  }, [code]);

  useEffect(() => {
    void resume();
  }, [resume]);

  // Polling — host "Boshlash" bosgach ikkalamizga savollar keladi
  useEffect(() => {
    if (phase !== "waiting") return;
    let alive = true;
    const tick = async () => {
      try {
        const res = await actionPortalRoomState(code);
        if (!alive) return;
        setNetProblem(false);
        if (res.ok) {
          setState(res.state);
          if (res.state.status === "playing") {
            const q = await actionPortalRoomQuestions(code);
            if (q.ok) {
              setQuestions(q.questions);
              setStartedAt(Date.now());
              if (res.state.endMode === "time" && res.state.timeLimitMin) {
                setTimeLeftSec(res.state.timeLimitMin * 60);
              }
              setPhase("play");
            }
          } else if (res.state.status === "cancelled") {
            setError("Xona bekor qilingan yoki muddati tugagan.");
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
  }, [phase, code]);

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
        /* keyingi siklda */
      }
    };
    const timer = window.setInterval(tick, 3000);
    void tick();
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [phase, code]);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await actionPortalJoinRoom(code);
    if (!res.ok) {
      setError(res.error ?? "Qo'shilish muvaffaqiyatsiz.");
      return;
    }
    if (res.gameTitle) setGameTitle(res.gameTitle);
    setPhase("waiting");
  };

  const finish = async (localScore?: number) => {
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
          score: localScore ?? scoreRef.current,
          total: questions?.length ?? 0,
          percent: 0,
          problem: res.error,
        });
    } finally {
      setSaving(false);
      setPhase("done");
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-4 text-white">
          <p className="text-lg font-bold">🤝 Do'stim bilan o'ynash</p>
          <p className="text-xs text-white/85">
            {gameTitle ? `${gameTitle} · ` : ""}Xona: <span className="font-mono font-bold">{code}</span>
          </p>
        </div>

        <div className="p-4 sm:p-6">
          {phase === "join" ? (
            <form onSubmit={join} className="flex flex-col gap-4 py-2">
              {initial.guestFirstName ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-sm font-semibold text-emerald-800">
                    👤 Siz: {initial.guestFirstName} (o'z akkauntingiz bilan kirdingiz)
                  </p>
                  <p className="mt-0.5 text-[11px] text-emerald-700">
                    Natijangiz avtomatik O'Z profilingizga yoziladi.
                  </p>
                </div>
              ) : null}
              {error ? (
                <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">⚠ {error}</p>
              ) : null}
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-7 py-3.5 text-base font-bold text-white hover:bg-emerald-700 min-h-[52px]"
              >
                {initial.guestFirstName ? `Xonaga kirish ▶ (${initial.guestFirstName})` : "Xonaga kirish ▶"}
              </button>
              {netProblem ? (
                <p className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800">
                  ⚠ Ulanish uzildi — qayta ulanmoqda...
                </p>
              ) : null}
            </form>
          ) : phase === "waiting" ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="flex h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" aria-hidden />
              <p className="flex items-center gap-2 text-base font-semibold text-slate-700">
                <PartyPopper className="h-5 w-5 text-emerald-600" />
                Qo'shildingiz! Do'stingiz «Boshlash» bosishi kutilmoqda...
              </p>
              {netProblem ? (
                <p className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800">
                  ⚠ Ulanish uzildi — qayta ulanmoqda...
                </p>
              ) : null}
              <button
                onClick={() => void resume()}
                className="rounded-xl border-2 border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 min-h-[44px]"
              >
                🔄 Yangilash
              </button>
              <p className="text-xs text-slate-400">Bu sahifani yopsangiz, taklif havolasini qayta oching — o'yin davom etadi.</p>
            </div>
          ) : phase === "play" && questions ? (
            <>
              <div className="mb-3 space-y-2">
                {state?.endMode === "race" ? (
                  <p className="rounded-xl bg-amber-50 px-4 py-2 text-center text-sm font-bold text-amber-800">🏁 Poyga — birinchi tugatgan g'olib!</p>
                ) : null}
                {timeLeftSec !== null ? (
                  <p
                    className={cn(
                      "rounded-xl px-4 py-2.5 text-center text-base font-bold",
                      timeLeftSec <= 30 ? "bg-red-100 text-red-700" : "bg-indigo-50 text-indigo-700"
                    )}
                  >
                    ⏱ Qoldi: {Math.floor(timeLeftSec / 60)}:{String(timeLeftSec % 60).padStart(2, "0")}
                  </p>
                ) : null}
              </div>
              <QuestionFlow
                questions={questions}
                onAnswer={(qIndex, choice) =>
                  actionPortalRoomAnswer(code, qIndex, choice).then((r) => {
                    if (!r.ok) throw new Error(r.error);
                    if (r.feedback.correct) scoreRef.current += 1;
                    return r.feedback;
                  })
                }
                onFinish={(score) => void finish(score)}
                startAt={state?.myAnswered ?? 0}
                initialScore={state?.myScore ?? 0}
              />
            </>
          ) : phase === "done" ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              {state?.winnerSlot ? (
                state.winnerSlot === "guest" ? (
                  <p className="rounded-xl bg-amber-100 px-5 py-2.5 text-base font-bold text-amber-800">🏆 Siz birinchi tugatdingiz — G'OLIB!</p>
                ) : (
                  <p className="rounded-xl bg-slate-100 px-5 py-2.5 text-base font-bold text-slate-700">🏅 Do'stingiz birinchi tugatdi (g'olib)</p>
                )
              ) : null}
              <p className="text-3xl font-bold text-slate-900">
                {outcome ? `${outcome.score} / ${outcome.total}` : "Yakunlandi!"}
              </p>
              {outcome ? (
                <>
                  <p className="text-sm font-medium text-slate-500">{outcome.percent}% to'g'ri javob</p>
                  {state?.opponentDone && state?.opponentScore != null ? (
                    <p className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                      🎯 Do'stingiz natijasi: {state.opponentScore} / {state.total} ({state.total ? Math.round((state.opponentScore / state.total) * 100) : 0}%)
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
                </>
              ) : null}
              <Link href="/o/xato" className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
                <ArrowLeft className="h-4 w-4" /> Asosiy havolamga qaytish
              </Link>
              <p className="text-[11px] text-slate-400">Yangi juftlik o'yin uchun do'stingizdan yangi taklif linki so'rang.</p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white"
              >
                <RotateCcw className="h-4 w-4" /> Holatni yangilash
              </button>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">⚠ {error ?? "Xona topilmadi."}</p>
              <Link href="/o/xato" className="mt-3 inline-block text-xs font-medium text-indigo-600">
                Asosiy havolamga qaytish
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
