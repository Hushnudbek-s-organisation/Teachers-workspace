"use client";

// ============================================================================
// O'yin statistikasini RESET qilish (foydalanuvchi talabi).
// Ikkala tasdiqdan keyin HAMMA natijalar o'chiriladi (qaytarilmaydi).
// ============================================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import { actionResetGameResults } from "@/app/(dashboard)/games/actions";

export function StatsResetButton() {
  const [confirm1, setConfirm1] = useState(false);
  const [typing, setTyping] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const reset = () => {
    setError(null);
    startTransition(async () => {
      try {
        await actionResetGameResults();
        setConfirm1(false);
        setTyping("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "O'chirishda xatolik");
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setConfirm1(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
      >
        <Trash2 className="h-3.5 w-3.5" /> Statistikani tozalash
      </button>

      {confirm1 ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold text-slate-900">Statistikani to'liq tozalash?</h3>
              <button onClick={() => setConfirm1(false)} aria-label="Yopish" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              HAMMA o'yin natijalari (barcha o'quvchilar, portali, yakka va juftlik) <b>butunlay o'chadi</b> —
              bu amalni QAYTARIB BO'LMAYDI. O'quvchilar, o'yinlar, havolalar o'zgarmaydi.
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Tasdiqlash uchun pastga <b className="font-mono">O&apos;CHIR</b> deb yozing:
            </p>
            <input
              value={typing}
              onChange={(e) => setTyping(e.target.value)}
              placeholder="O'CHIR"
              className="mt-1.5 w-full rounded-lg border-2 border-slate-300 px-3 py-2.5 text-sm font-mono text-slate-800 focus:border-red-400 focus:outline-none"
            />
            {error ? <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirm1(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={reset}
                disabled={pending || typing.trim().toUpperCase() !== "O'CHIR" && typing.trim() !== "OCHIR"}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
              >
                {pending ? "Tozalanmoqda..." : "Ha, hammasini o'chirish"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
