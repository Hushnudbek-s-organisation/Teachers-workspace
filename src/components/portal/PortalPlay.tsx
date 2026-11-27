"use client";

// ============================================================================
// Yakka o'yin oqimi (portal): intro → savollar (server tekshiruvi) → natija.
//
//   • Katta ko'rsatma, progress "Savol 2/5", "Yana o'ynash"
//   • "Do'stim bilan o'ynash" → taklif linki → kutish → boshlash (DuoInvite)
//   • Natija saqlangani SERVER TASDIQLANGANDA ko'rsatiladi — "saqlandi" deb
//     aldash yo'q; saqlanmasa aniq ogohlantirish chiqadi
// ============================================================================

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, RotateCcw, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CatalogEntry, FinishOutcome } from "@/lib/portal/types";
import {
  actionPortalAnswer,
  actionPortalCreateRoom,
  actionPortalFinish,
  actionPortalStartGame,
} from "@/app/portal/actions";
import { QuestionFlow } from "./QuestionFlow";
import { DuoInvite } from "./DuoInvite";
import { newAttemptId } from "./attempt";

type Phase = "intro" | "loading" | "play" | "done";

export function PortalPlay({ token, entry }: { token: string; entry: CatalogEntry }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<{
    sessionId: string;
    questions: import("@/lib/portal/types").PortalQuestion[];
  } | null>(null);
  const [outcome, setOutcome] = useState<FinishOutcome | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [duoOpen, setDuoOpen] = useState(false);
  const [runKey, setRunKey] = useState(0);

  const intro = async () => {
    setError(null);
    setPhase("loading");
    const res = await actionPortalStartGame(token, entry.key);
    if (!res.ok) {
      setError(res.error);
      setPhase("intro");
      return;
    }
    setSession({ sessionId: res.session.sessionId, questions: res.session.questions });
    setStartedAt(Date.now());
    setRunKey((k) => k + 1);
    setPhase("play");
  };

  const finish = async (localScore: number) => {
    if (!session) return;
    setSaving(true);
    const timeSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const attemptId = newAttemptId();
    try {
      const res = await actionPortalFinish(token, session.sessionId, timeSec, attemptId);
      if (res.ok) {
        // SERVER TASDIQLASHI: score serverdan qaytadi (mijoz balliga ishonilmaydi)
        setOutcome(res.outcome);
      } else {
        setOutcome({
          saved: false,
          alreadySaved: false,
          score: localScore,
          total: session.questions.length,
          percent: Math.round((localScore / Math.max(1, session.questions.length)) * 100),
          problem: res.error,
        });
      }
    } catch (err) {
      setOutcome({
        saved: false,
        alreadySaved: false,
        score: localScore,
        total: session.questions.length,
        percent: Math.round((localScore / Math.max(1, session.questions.length)) * 100),
        problem: err instanceof Error ? err.message : "Saqlashda tarmoq xatosi.",
      });
    } finally {
      setSaving(false);
      setPhase("done");
    }
  };

  const restart = () => {
    setOutcome(null);
    setSession(null);
    setPhase("intro");
    setDuoOpen(false);
  };

  const stars = useMemo(() => {
    if (!outcome) return 0;
    return outcome.percent >= 90 ? 3 : outcome.percent >= 70 ? 2 : outcome.percent >= 40 ? 1 : 0;
  }, [outcome]);

  if (duoOpen) {
    return <DuoInvite token={token} entry={entry} onBack={() => setDuoOpen(false)} />;
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <Link
        href={`/o/${token}`}
        className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Boshqa o'yinlar
      </Link>

      <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden>{entry.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold">{entry.title}</p>
              <p className="truncate text-xs text-white/80">{entry.origin} · {entry.subject}</p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {phase === "intro" ? (
            <div className="flex flex-col items-center gap-5 py-4 text-center">
              <div className="text-6xl" aria-hidden>{entry.emoji}</div>
              <p className="max-w-md text-base font-medium leading-relaxed text-slate-700">
                {entry.instructions}
              </p>
              <div className="flex flex-wrap justify-center gap-2 text-xs">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
                  {entry.savollar} savol
                </span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
                  Vaqt bosimi yo'q 😊
                </span>
              </div>
              {error ? (
                <p className="rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-700">{error}</p>
              ) : null}
              <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
                <button
                  onClick={intro}
                  className="rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-bold text-white transition-colors hover:bg-indigo-700 min-h-[52px]"
                >
                  ▶ Boshlash
                </button>
                <button
                  onClick={() => setDuoOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-indigo-200 bg-white px-6 py-3.5 text-base font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 min-h-[52px]"
                >
                  <Users className="h-5 w-5" /> Do'stim bilan o'ynash
                </button>
              </div>
            </div>
          ) : phase === "loading" ? (
            <p className="py-10 text-center text-sm font-medium text-slate-500">Savollar tayyorlanmoqda...</p>
          ) : phase === "play" && session ? (
            <QuestionFlow
              key={runKey}
              questions={session.questions}
              onAnswer={(qIndex, choice) =>
                actionPortalAnswer(token, session.sessionId, qIndex, choice).then((r) => {
                  if (!r.ok) throw new Error(r.error);
                  return r.feedback;
                })
              }
              onFinish={finish}
            />
          ) : outcome ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <Trophy className={cn("h-14 w-14", outcome.percent >= 70 ? "text-amber-400" : "text-slate-300")} />
              <div>
                <p className="text-3xl font-bold text-slate-900">
                  {outcome.score} / {outcome.total}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-500">{outcome.percent}% to'g'ri javob</p>
              </div>
              <div className="flex gap-1" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <span key={i} className={cn("text-2xl", i < stars ? "" : "opacity-25 grayscale")}>
                    ⭐
                  </span>
                ))}
              </div>
              <p className="max-w-sm text-sm font-medium text-slate-600">
                {outcome.percent >= 90
                  ? "Zo'r natija! Sen tayyor o'yinchisan! 🎉"
                  : outcome.percent >= 70
                    ? "Yaxshi! Yana bir marta o'ynab ko'r 💪"
                    : outcome.percent >= 40
                      ? "Yaxshi harakat! Mavzuni takrorlab ko'r 📖"
                      : "Mavzuni qayta o'qib, yana urinib ko'r 🌟"}
              </p>

              {/* Saqlash holati — faqat SERVER TASDIQLASA "saqlandi" */}
              {saving ? (
                <p className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
                  Natijani saqlaymiz...
                </p>
              ) : outcome.saved ? (
                <p className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800">
                  <Check className="h-4 w-4" /> Natija saqlandi — o'qituvchingiz ko'radi ✅
                </p>
              ) : (
                <p className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                  ⚠ Natija saqlanmadi{outcome.problem ? `: ${outcome.problem}` : ""} — yana o'ynab ko'ring.
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={restart}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-base font-bold text-white hover:bg-indigo-700 min-h-[52px]"
                >
                  <RotateCcw className="h-5 w-5" /> Yana o'ynash
                </button>
                <Link
                  href={`/o/${token}`}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50 min-h-[52px]"
                >
                  <ArrowLeft className="h-5 w-5" /> Boshqa o'yinlar
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
