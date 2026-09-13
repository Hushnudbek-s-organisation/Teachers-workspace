"use client";

// ============================================================================
// O'yin taxtalari uchun umumiy yordamchilar
//   • shuffleStable  — bir xil seed bilan bir xil tartib
//   • Progress       — "3/10 · ✓ 2 ball" chizig'i
//   • useCountdown   — oddiy taymer
//   • useBoardProgress — bo'lingan ekranda jonli hisobni yuqoriga xabar qilish
//   • FitBox         — taxtani o'z konteyneriga avto-moslashtirish (kichraytirish)
// ============================================================================

import { useEffect, useRef, useState, type ReactNode } from "react";
import { shuffleSeeded } from "@/lib/books/multiplayer";

export function shuffleStable<T>(arr: readonly T[], seed: number): T[] {
  return shuffleSeeded(arr, seed);
}

/** Haqiqiy tasodifiy aralashtirish — har safar boshqa tartib (Fisher–Yates + Math.random) */
export function shuffleRandom<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Taxtaning jonli holati (bo'lingan ekranda hisob ko'rsatish uchun) */
export interface BoardProgress {
  /** Nechta savol/topshiriq bajarildi */
  answered: number;
  /** To'g'ri javoblar */
  score: number;
  /** Jami (shu raund uchun) */
  total: number;
}

export interface BoardProps {
  /** O'yin tugagach ball bilan xabar beradi */
  onFinish: (score: number, total: number) => void;
  /** Har qadamda hisobni yuqoriga xabar qiladi (ixtiyoriy) */
  onProgress?: (progress: BoardProgress) => void;
  /** Kichik maydon (2–3 kishilik bo'lingan ekran) — ixcham ko'rinish */
  compact?: boolean;
}

export function Progress({
  index,
  total,
  score,
  className,
  compact,
}: {
  index: number;
  total: number;
  score: number;
  className?: string;
  compact?: boolean;
}) {
  const percent = total ? Math.round((index / total) * 100) : 0;
  return (
    <div className={className ?? (compact ? "mb-2.5" : "mb-4")}>
      <div
        className={
          compact
            ? "mb-1 flex items-center justify-between text-[11px] font-medium text-slate-500"
            : "mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500"
        }
      >
        <span>
          {Math.min(index + 1, total)} / {total}
        </span>
        <span className="text-emerald-600">✓ {score} ball</span>
      </div>
      <div className={compact ? "h-1.5 overflow-hidden rounded-full bg-slate-100" : "h-2 overflow-hidden rounded-full bg-slate-100"}>
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

/**
 * Hisobni yuqoriga xabar qiladi — faqat qiymat O'ZGARGANDA (aks holda
 * bo'lingan ekranda har renderda qayta xabar ketib, sikl hosil bo'lardi).
 */
export function useBoardProgress(
  report: ((progress: BoardProgress) => void) | undefined,
  answered: number,
  score: number,
  total: number
) {
  const last = useRef("");
  const latest = useRef(report);
  latest.current = report;

  useEffect(() => {
    if (!latest.current) return;
    const key = `${answered}|${score}|${total}`;
    if (last.current === key) return;
    last.current = key;
    latest.current({ answered, score, total });
  });
}

// ---------------------------------------------------------------------------
// FitBox — konteynerga avto-moslashish
// ---------------------------------------------------------------------------

/** Eng kichik ruxsat etilgan kichraytirish (matn umuman o'qilmas bo'lib qolmasin) */
const MIN_FIT_SCALE = 0.35;

/**
 * Ichidagi taxtani o'z konteyneriga sig'adigan qilib kichraytiradi:
 * kenglik yetmasa masshtab pasayadi (scroll/overflow bo'lmaydi), ekran
 * aylansa yoki maydon kengaysa — qayta o'lchanadi.
 *
 * Bo'lingan ekranda (2–3 kishi) har maydon tor bo'lgani uchun kerak.
 */
export function FitBox({
  children,
  className,
  enabled = true,
  resetKey,
}: {
  children: ReactNode;
  className?: string;
  enabled?: boolean;
  /** Yangi raund kabi holatlarda qayta o'lchash uchun */
  resetKey?: unknown;
}) {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const scaleRef = useRef(1);
  const availRef = useRef(0);
  const measureRef = useRef<((fresh: boolean) => void) | null>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | null>(null);

  const applyScale = (value: number) => {
    if (Math.abs(scaleRef.current - value) < 0.005) return;
    scaleRef.current = value;
    setScale(value);
  };

  useEffect(() => {
    if (!enabled) {
      scaleRef.current = 1;
      availRef.current = 0;
      setScale(1);
      setHeight(null);
      return;
    }
    const box = outerRef.current;
    const content = innerRef.current;
    if (!box || !content || typeof ResizeObserver === "undefined") return;

    let raf = 0;
    const measure = (fresh: boolean) => {
      const avail = box.clientWidth;
      if (avail <= 0) return;
      const run = () => {
        const natural = Math.max(content.scrollWidth, content.clientWidth);
        availRef.current = avail;
        const next = natural > avail + 1 ? Math.max(MIN_FIT_SCALE, avail / natural) : 1;
        applyScale(next);
      };
      if (fresh && scaleRef.current !== 1) {
        applyScale(1);
        raf = requestAnimationFrame(run);
      } else {
        run();
      }
    };
    measureRef.current = measure;

    const ro = new ResizeObserver(() => {
      measure(box.clientWidth !== availRef.current);
    });
    ro.observe(box);
    measure(false);

    return () => {
      measureRef.current = null;
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  // Yangi raund boshlanganda taxta o'lchami o'zgaradi — qayta o'lchaymiz
  useEffect(() => {
    measureRef.current?.(false);
  }, [resetKey]);

  // Balandlikni masshtabga moslab turamiz (transform layout'ni o'zgartirmaydi)
  useEffect(() => {
    if (!enabled) return;
    const content = innerRef.current;
    if (!content) return;
    const next = Math.round(content.offsetHeight * scaleRef.current);
    setHeight((prev) => (prev !== null && Math.abs(prev - next) <= 1 ? prev : next));
  });

  return (
    <div
      ref={outerRef}
      className={className}
      style={{ height: enabled && height !== null ? height : undefined, overflow: "hidden" }}
    >
      <div
        ref={innerRef}
        style={
          enabled
            ? {
                width: `${100 / scale}%`,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
