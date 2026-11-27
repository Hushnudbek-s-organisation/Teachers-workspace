"use client";

// ============================================================================
// Savol oqimi — yakka va juftlik (duo) o'yinlari uchun UMUMIY komponent.
//
//   • "Savol 2/5" progress
//   • Har savol SERVERGA yuboriladi va server javobi (to'g'ri/xato) ko'rsatiladi
//   • Vaqt bosimi yo'q — o'quvchi o'ylab qolishi mumkin
//   • Yakunda onFinish(score) chaqiriladi (score serverda saqlangan holatdan)
// ============================================================================

import { useEffect, useState } from "react";
import type { AnswerFeedback, PortalQuestion } from "@/lib/portal/types";
import { PortalProgress, PortalQuestionView } from "./PortalBoards";

export interface QuestionFlowProps {
  questions: PortalQuestion[];
  /** Savolga javob — serverga yuboriladi, natijasi feedback qaytadi */
  onAnswer: (qIndex: number, choice: number | number[]) => Promise<AnswerFeedback>;
  /** Oxirgi savolga javob berilgach (server score bilan) */
  onFinish: (score: number) => void;
  /** Qayta ulanishda allaqachon javob berilgan savollar soni */
  startAt?: number;
  initialScore?: number;
  compact?: boolean;
}

export function QuestionFlow({
  questions,
  onAnswer,
  onFinish,
  startAt = 0,
  initialScore = 0,
  compact = false,
}: QuestionFlowProps) {
  const [index, setIndex] = useState(Math.min(startAt, Math.max(0, questions.length - 1)));
  const [score, setScore] = useState(initialScore);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [orderPicked, setOrderPicked] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const question = questions[index];

  useEffect(() => {
    setFeedback(null);
    setOrderPicked([]);
    setError(null);
  }, [index]);

  if (!question) {
    // Barcha savollar tugagan (qayta ulanishda ham bo'lishi mumkin)
    return (
      <div className="py-8 text-center">
        <p className="text-lg font-semibold text-slate-700">Savollar tugadi!</p>
        <button
          onClick={() => onFinish(score)}
          className="mt-4 rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white hover:bg-indigo-700"
        >
          Natijani ko'rish
        </button>
      </div>
    );
  }

  const handleAnswer = async (choice: number | number[]) => {
    if (busy || feedback) return;
    setBusy(true);
    setError(null);
    try {
      const fb = await onAnswer(index, choice);
      setFeedback(fb);
      if (fb.correct) setScore((s) => s + 1);

      const isLast = index + 1 >= questions.length;
      const delay = fb.correct ? 900 : 1500;
      window.setTimeout(() => {
        if (isLast) {
          onFinish(score + (fb.correct ? 1 : 0));
        } else {
          setIndex((v) => v + 1);
        }
      }, delay);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Javobni yuborib bo'lmadi — internetni tekshiring.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PortalProgress index={index} total={questions.length} score={score} />

      {error ? (
        <p className="mb-3 rounded-xl bg-amber-100 px-4 py-2.5 text-center text-sm font-semibold text-amber-800">
          ⚠ {error} — qayta urinib ko'ring.
        </p>
      ) : null}

      <PortalQuestionView
        question={question}
        index={index}
        total={questions.length}
        score={score}
        answered={Boolean(feedback) || busy}
        feedback={feedback}
        onAnswer={handleAnswer}
        compact={compact}
        orderPicked={orderPicked}
        onOrderPick={(i) => setOrderPicked((p) => (p.includes(i) ? p : [...p, i]))}
        onOrderReset={() => setOrderPicked([])}
      />

      {busy ? (
        <p className="mt-3 text-center text-xs text-slate-400">Tekshirilmoqda...</p>
      ) : null}
    </div>
  );
}
