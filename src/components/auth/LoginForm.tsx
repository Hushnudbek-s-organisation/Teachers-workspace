"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { actionLogin } from "@/app/auth-actions";

// ============================================================================
// /login forma — server tomonda haqiqiy tekshiruv (scrypt + session).
// Demo rejimida standart hisob ko'rsatiladi (faqat sinov muhiti).
// ============================================================================

export function LoginForm({ demoMode }: { demoMode: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState(demoMode ? "ustoz@demo.uz" : "");
  const [password, setPassword] = useState(demoMode ? "demo1234" : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await actionLogin(email, password);
        if (!res.ok) {
          setError(res.error ?? "Kirish muvaffaqiyatsiz.");
          return;
        }
        router.push("/");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Kirishda xatolik.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {demoMode ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-[11px] leading-relaxed text-amber-300">
          <b>Demo rejimi</b> (Supabase ulanmagan): hisob xotirada saqlanadi —{" "}
          <span className="font-mono">ustoz@demo.uz</span> / <span className="font-mono">demo1234</span>.
          Prod da albatta Supabase ulanadi va haqiqiy hisoblar yaratiladi.
        </p>
      ) : null}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-300" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ustoz@maktab.uz"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-300" htmlFor="password">
          Parol
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
      </div>

      {error ? (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
      >
        <LogIn className="h-4 w-4" />
        {pending ? "Kirilmoqda..." : "Kirish"}
      </button>

      <p className="rounded-lg bg-slate-800/60 px-3 py-2.5 text-[11px] leading-relaxed text-slate-400">
        Birinchi marta ishlatmoqdami? Hisoblar hali yaratilmagan bo&apos;lsa{" "}
        <a href="/setup-access" className="font-medium text-indigo-400 hover:text-indigo-300">
          /setup-access
        </a>{" "}
        sahifasida birinchi administrator hisobini yaratng.
      </p>
    </form>
  );
}
