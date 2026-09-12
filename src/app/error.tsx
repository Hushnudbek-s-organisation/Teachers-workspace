"use client";

// ============================================================================
// error.tsx — Server Components render xatosi uchun tushunarli sahifa
//
// Bu fayl bo'lmaganda Next.js prodda faqat "An error occurred in the Server
// Components render" + digest ko'rsatardi: foydalanuvchi nima qilishni
// bilmaydi. Bu yerda 3 ta asosiy sabab, xato kodi (digest) va tekshiruv
// sahifasiga havola bor.
// ============================================================================

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, Home, LifeBuoy, RefreshCw } from "lucide-react";

const CAUSES = [
  {
    title: "Supabase ulanmagan yoki kalit noto'g'ri",
    body: "NEXT_PUBLIC_SUPABASE_URL / kalit xato bo'lsa yoki loyiha pauza holatida bo'lsa har bir sahifa shu xatoga tushadi. Supabase Dashboard'ni ochib loyihani 'uyg'oting.",
  },
  {
    title: "Baza sxemasi ishga tushirilmagan",
    body: "supabase/schema.sql faylini SQL Editor'da bajarish kerak — aks holda jadval va VIEW'lar topilmaydi.",
  },
  {
    title: "Ilova kodi xatosi",
    body: "Yuqoridagilar joyida bo'lsa, bu kod xatosi. Xato kodini (digest) Vercel → Logs'dagi yozuv bilan solishtiring.",
  },
];

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Xato brauzer konsolida ham ko'rinsin (server log bilan solishtirish uchun)
    console.error("[Teachers Workspace]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
          <div>
            <h1 className="text-lg font-bold text-red-900">Sahifani yuklashda xato yuz berdi</h1>
            <p className="mt-1 text-sm text-red-800">
              Ma'lumotlar bazasiga murojaat qilishda muammo bo'lishi mumkin. Quyidagi tekshiruv sahifasi
              aniq sababni ko'rsatadi.
            </p>
            {error.digest ? (
              <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 font-mono text-xs text-red-700">
                Xato kodi (digest): {error.digest}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <RefreshCw className="h-4 w-4" />
          Qayta urinish
        </button>
        <Link
          href="/setup"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <LifeBuoy className="h-4 w-4" />
          Sozlash tekshiruvi
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          <Home className="h-4 w-4" />
          Bosh sahifa
        </Link>
      </div>

      <div className="mt-8 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Eng ko'p uchraydigan 3 sabab</h2>
        {CAUSES.map((c, i) => (
          <div key={c.title} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">
              {i + 1}. {c.title}
            </p>
            <p className="mt-1 text-sm text-slate-600">{c.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
