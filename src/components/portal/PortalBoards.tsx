"use client";

// ============================================================================
// Portal savol taxtalari — katta tugmalar, telefon (360–390px) uchun mos,
// to'g'ri/xato FAQAT rang bilan emas: belgi (✓/✗) + matn ham ko'rsatiladi.
// Javob kaliti bu yerda UMUMAN YO'Q — server faqat to'g'ri/xato qaytaradi.
// ============================================================================

import { useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnswerFeedback } from "@/lib/portal/types";
import type { ClockQuestion, McQuestion, OrderQuestion, PortalQuestion } from "@/lib/portal/types";

// ------------------------------- Analog soat -------------------------------

export function ClockSvg({ h, m, size = 92 }: { h: number; m: number; size?: number }) {
  const hourAngle = ((h % 12) + m / 60) * 30; // 30° bir soat
  const minuteAngle = m * 6; // 6° bir daqiqa
  const c = size / 2;
  const r = c - 6;

  const hand = (angleDeg: number, length: number, width: number, color: string) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    const x = c + Math.cos(rad) * length;
    const y = c + Math.sin(rad) * length;
    return (
      <line
        x1={c}
        y1={c}
        x2={x}
        y2={y}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
      />
    );
  };

  const ticks = [];
  for (let i = 0; i < 12; i++) {
    const rad = ((i * 30 - 90) * Math.PI) / 180;
    const x1 = c + Math.cos(rad) * (r - 2);
    const y1 = c + Math.sin(rad) * (r - 2);
    const x2 = c + Math.cos(rad) * r;
    const y2 = c + Math.sin(rad) * r;
    ticks.push(
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#64748b"
        strokeWidth={i % 3 === 0 ? 2.5 : 1.2}
        strokeLinecap="round"
      />
    );
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Soat ${h}:${String(m).padStart(2, "0")}`}>
      <circle cx={c} cy={c} r={r} fill="#fffbeb" stroke="#f59e0b" strokeWidth={3} />
      {ticks}
      {hand(hourAngle, r * 0.5, 4, "#1e293b")}
      {hand(minuteAngle, r * 0.74, 2.5, "#475569")}
      <circle cx={c} cy={c} r={2.6} fill="#1e293b" />
    </svg>
  );
}

// ------------------------------ Qaytaruvchi --------------------------------

export interface AnswerState {
  picked: number | number[] | null;
  correct: boolean | null;
}

interface BoardProps {
  question: PortalQuestion;
  index: number;
  total: number;
  score: number;
  answered: boolean;
  feedback: AnswerFeedback | null;
  onAnswer: (choice: number | number[]) => void;
  compact?: boolean;
}

/** Progress: "Savol 2/5" — katta va tushunarli */
export function PortalProgress({ index, total, score }: { index: number; total: number; score: number }) {
  const pct = total ? Math.round((index / total) * 100) : 0;
  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-center justify-between text-sm font-semibold text-slate-700">
        <span>
          Savol {Math.min(index + 1, total)}/{total}
        </span>
        <span className="flex items-center gap-1 text-emerald-700">
          <span aria-hidden>⭐</span> {score} to'g'ri
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Bitta savolni chizish (mc / tf / order / clock) */
export function PortalQuestionView({
  question,
  index,
  total,
  score,
  answered,
  feedback,
  onAnswer,
  compact,
  orderPicked,
  onOrderPick,
  onOrderReset,
}: BoardProps & {
  orderPicked?: number[];
  onOrderPick?: (i: number) => void;
  onOrderReset?: () => void;
}) {
  if (question.kind === "clock") return <ClockBoard question={question} index={index} total={total} score={score} answered={answered} feedback={feedback} onAnswer={onAnswer} compact={compact} />;
  if (question.kind === "order")
    return (
      <OrderBoard
        question={question}
        index={index}
        total={total}
        score={score}
        answered={answered}
        feedback={feedback}
        picked={orderPicked ?? []}
        onPick={onOrderPick ?? (() => {})}
        onReset={onOrderReset ?? (() => {})}
        onAnswer={onAnswer}
        compact={compact}
      />
    );
  return <McBoard question={question} index={index} total={total} score={score} answered={answered} feedback={feedback} onAnswer={onAnswer} compact={compact} />;
}

// ------------------------------ Variant tugmalari ---------------------------

function optionClasses(state: { answered: boolean; picked: boolean; correct: boolean }): string {
  if (state.answered && state.correct) return "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200";
  if (state.answered && state.picked && !state.correct) return "border-red-400 bg-red-50 ring-2 ring-red-200";
  if (state.answered) return "border-slate-200 bg-white opacity-70";
  return "border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50 active:scale-[0.99]";
}

function FeedbackBadge({ feedback }: { feedback: AnswerFeedback | null }) {
  if (!feedback) return null;
  return (
    <p
      className={cn(
        "mt-3 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-base font-bold",
        feedback.correct ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
      )}
      role="status"
    >
      {feedback.correct ? (
        <>
          <Check className="h-5 w-5" /> To'g'ri javob!
        </>
      ) : (
        <>
          <X className="h-5 w-5" /> Noto'g'ri — keyingisida chiqadi!
        </>
      )}
    </p>
  );
}

function McBoard({
  question,
  answered,
  feedback,
  onAnswer,
  compact,
}: BoardProps & { question: McQuestion }) {
  // tf rejimi: ikkita katta tugma (To'g'ri / Noto'g'ri)
  if (question.tf) {
    return (
      <div>
        <p className={cn("mb-4 rounded-2xl border border-slate-200 bg-slate-50 text-center font-semibold leading-relaxed text-slate-900", compact ? "px-3 py-3 text-sm" : "px-4 py-6 text-lg")}>
          {question.prompt}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "To'g'ri", emoji: "✅", i: 0 },
            { label: "Noto'g'ri", emoji: "❌", i: 1 },
          ].map((o) => (
            <button
              key={o.i}
              disabled={answered}
              onClick={() => onAnswer(o.i)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl border-2 px-3 py-5 text-lg font-bold transition-all min-h-[88px]",
                optionClasses({ answered, picked: feedback?.answerIndex === o.i || false, correct: answered && feedback?.correct === true && feedback?.answerIndex === o.i })
              )}
            >
              <span className="text-3xl" aria-hidden>{o.emoji}</span>
              {o.label}
              {answered && feedback?.answerIndex === o.i ? (
                <span className={cn("text-xs font-semibold", feedback.correct ? "text-emerald-700" : "text-red-700")}>
                  {feedback.correct ? "✓ sizning javobingiz" : "✗ sizning javobingiz"}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <FeedbackBadge feedback={feedback} />
      </div>
    );
  }

  return (
    <div>
      <p className={cn("mb-4 rounded-2xl border border-slate-200 bg-slate-50 text-center font-semibold leading-relaxed text-slate-900", compact ? "px-3 py-3 text-sm" : "px-4 py-6 text-lg")}>
        {question.prompt}
      </p>
      <div className={cn("grid gap-2.5", "sm:grid-cols-2")}>
        {question.options.map((opt, i) => (
          <button
            key={`${opt}-${i}`}
            disabled={answered}
            onClick={() => onAnswer(i)}
            className={cn(
              "flex min-h-[60px] items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-base font-medium transition-all",
              optionClasses({
                answered,
                picked: answered && feedback?.answerIndex === i,
                correct: answered && feedback?.correct === true && feedback?.answerIndex === i,
              })
            )}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 break-words text-[15px]">{opt}</span>
            {answered && feedback?.answerIndex === i ? (
              feedback.correct ? (
                <Check className="h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <X className="h-5 w-5 shrink-0 text-red-600" />
              )
            ) : null}
          </button>
        ))}
      </div>
      <FeedbackBadge feedback={feedback} />
    </div>
  );
}

// -------------------------------- Soat taxtasi ------------------------------

function ClockBoard({
  question,
  answered,
  feedback,
  onAnswer,
  compact,
}: BoardProps & { question: ClockQuestion }) {
  return (
    <div>
      <p className={cn("mb-4 rounded-2xl border border-slate-200 bg-slate-50 text-center font-semibold leading-relaxed text-slate-900", compact ? "px-3 py-3 text-sm" : "px-4 py-6 text-lg")}>
        {question.prompt}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {question.options.map((face, i) => (
          <button
            key={`${face.h}-${face.m}-${i}`}
            disabled={answered}
            onClick={() => onAnswer(i)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl border-2 px-2 py-3 transition-all",
              optionClasses({
                answered,
                picked: answered && feedback?.answerIndex === i,
                correct: answered && feedback?.correct === true && feedback?.answerIndex === i,
              })
            )}
          >
            <ClockSvg h={face.h} m={face.m} size={compact ? 84 : 104} />
            <span className="text-sm font-semibold text-slate-600">
              {i + 1}-soat rasm
            </span>
            {answered && feedback?.answerIndex === i ? (
              <span className={cn("text-xs font-bold", feedback.correct ? "text-emerald-700" : "text-red-700")}>
                {feedback.correct ? "✓ sizning javobingiz" : "✗ sizning javobingiz"}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <FeedbackBadge feedback={feedback} />
    </div>
  );
}

// ------------------------------ Bo'laklardan yig'ish -----------------------

function OrderBoard({
  question,
  answered,
  feedback,
  picked,
  onPick,
  onReset,
  onAnswer,
  compact,
}: BoardProps & {
  question: OrderQuestion;
  picked: number[];
  onPick: (i: number) => void;
  onReset: () => void;
}) {
  const remaining = question.pieces.map((_, i) => i).filter((i) => !picked.includes(i));
  const allPlaced = picked.length === question.pieces.length;

  return (
    <div>
      <p className={cn("mb-4 rounded-2xl border border-slate-200 bg-slate-50 text-center font-semibold leading-relaxed text-slate-900", compact ? "px-3 py-3 text-sm" : "px-4 py-6 text-lg")}>
        {question.prompt}
      </p>

      <div
        className={cn(
          "mb-4 rounded-2xl border-2 border-dashed p-3 min-h-[64px] flex flex-wrap items-center gap-2",
          answered && feedback?.correct ? "border-emerald-500 bg-emerald-50" : answered ? "border-red-400 bg-red-50" : "border-slate-300 bg-slate-50"
        )}
      >
        {picked.length === 0 ? (
          <p className="w-full py-2 text-center text-sm text-slate-400">
            Quyidagi bo'laklarni bosib, shu yerda tartibga soling
          </p>
        ) : (
          picked.map((pi, pos) => (
            <button
              key={`${pi}-${pos}`}
              disabled={answered}
              onClick={() => !answered && onPick(pi)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 hover:border-red-300 hover:text-red-600"
            >
              {pos + 1}. {question.pieces[pi]}
            </button>
          ))
        )}
      </div>

      {answered && feedback && !feedback.correct ? (
        <p className="mb-3 rounded-xl bg-red-100 px-3 py-2 text-center text-sm font-semibold text-red-800">
          ✗ Noto'g'ri tartib — keyingisida ehtiyot bo'ling!
        </p>
      ) : null}
      {answered && feedback?.correct ? (
        <p className="mb-3 rounded-xl bg-emerald-100 px-3 py-2 text-center text-sm font-bold text-emerald-800">
          ✓ To'g'ri yig'dingiz!
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {remaining.map((i) => (
          <button
            key={i}
            disabled={answered || allPlaced}
            onClick={() => onPick(i)}
            className="rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 text-base font-semibold text-slate-800 transition-all hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-40"
          >
            {question.pieces[i]}
          </button>
        ))}
      </div>

      {!answered ? (
        <div className="flex justify-center gap-2">
          <button
            onClick={onReset}
            disabled={!picked.length}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Tozalash
          </button>
          <button
            onClick={() => onAnswer(picked)}
            disabled={!allPlaced}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            Tekshirish
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Taxta o'yini uchun o'rashvchi (feedback + keyingi savol oqimi) */
export function usePortalBoardState() {
  const [orderPicked, setOrderPicked] = useState<number[]>([]);

  const resetOrder = () => setOrderPicked([]);
  const pickOrder = (i: number) => setOrderPicked((p) => (p.includes(i) ? p : [...p, i]));

  return { orderPicked, pickOrder, resetOrder, clearOrder: () => setOrderPicked([]) };
}
