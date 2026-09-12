"use client";

// ============================================================================
// O'yin taxtalari uchun umumiy yordamchilar
// ============================================================================

import { useEffect, useState } from "react";

export function shuffleStable<T>(arr: readonly T[], seed: number): T[] {
  const out = [...arr];
  let s = (seed + 1) * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface BoardProps {
  /** O'yin tugagach ball bilan xabar beradi */
  onFinish: (score: number, total: number) => void;
}

export function Progress({
  index,
  total,
  score,
  className,
}: {
  index: number;
  total: number;
  score: number;
  className?: string;
}) {
  const percent = total ? Math.round((index / total) * 100) : 0;
  return (
    <div className={className ?? "mb-4"}>
      <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500">
        <span>
          {Math.min(index + 1, total)} / {total}
        </span>
        <span className="text-emerald-600">✓ {score} ball</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/** Oddiy taymer (sekund sanaydi) */
export function useCountdown(seconds: number, active: boolean, onEnd: () => void, resetKey: unknown) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    setLeft(seconds);
  }, [resetKey, seconds]);

  useEffect(() => {
    if (!active) return;
    if (left <= 0) {
      onEnd();
      return;
    }
    const t = setTimeout(() => setLeft((v: number) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [active, left, onEnd]);

  return left;
}
