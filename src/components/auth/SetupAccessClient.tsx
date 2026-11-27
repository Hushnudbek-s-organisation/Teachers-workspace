"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, UserPlus } from "lucide-react";
import { actionCreateFirstAdmin } from "@/app/auth-actions";
import type { AccountListItem } from "@/lib/auth";

// ============================================================================
// /setup-access sahifasining client qismi:
//   • FirstAdminForm — birinchi admin hisobini yaratish (bootstrap)
//   • AccountsOverview — hisoblar allaqachon bo'lsa: holat ma'lumoti
// ============================================================================

export function FirstAdminForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== repeat) {
      setError("Parollar mos kelmadi.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await actionCreateFirstAdmin({ email, password, displayName });
        if (!res.ok) {
          setError(res.error ?? "Hisob yaratish muvaffaqiyatsiz.");
          return;
        }
        setDone(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Xatolik.");
      }
    });
  }

  if (done) {
    return (
      <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
          <ShieldCheck className="h-4 w-4" /> Administrator hisobi yaratildi
        </p>
        <p className="text-xs text-slate-300">
          Endi <a href="/login" className="font-medium text-indigo-400 hover:text-indigo-300">/login</a>{" "}
          sahifasidan kiring. O'quvchilarga egalikni AVTOMATIK biriktirish yo'q —
          &quot;O'qituvchilar&quot; sahifasida har bir hisobga sinf huquqlarini aniq berishingiz mumkin.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-300">
        Hisoblar hali yaratilmagan. Bu sahifa FAQAT birinchi hisobni yaratish uchun ishlaydi —
        keyinchalik shu yerda yangi hisob yaratib bo'lmaydi.
      </p>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-300" htmlFor="name">
          Ism (ko'rinadigan nom)
        </label>
        <input
          id="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Masalan: Dilshod Rahimov"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-300" htmlFor="email">
          Email *
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ustoz@maktab.uz"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-300" htmlFor="pass">
            Parol * (kamida 8 belgi)
          </label>
          <input
            id="pass"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-300" htmlFor="pass2">
            Parolni takrorlang
          </label>
          <input
            id="pass2"
            type="password"
            required
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>
      {error ? (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        <UserPlus className="h-4 w-4" />
        {pending ? "Yaratilmoqda..." : "Birinchi admin hisobini yaratish"}
      </button>
    </form>
  );
}

export function AccountsOverview({ accounts }: { accounts: AccountListItem[] }) {
  return (
    <div className="space-y-3">
      <p className="rounded-lg bg-slate-800/60 px-3 py-2.5 text-xs leading-relaxed text-slate-300">
        Hisoblar allaqachon yaratilgan — yangi hisob bu sahifadan yaratilmaydi. Kirish:{" "}
        <a href="/login" className="font-medium text-indigo-400 hover:text-indigo-300">/login</a>.
      </p>
      <div className="space-y-2">
        {accounts.map((a) => (
          <div key={a.id} className="rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-2">
            <p className="text-sm font-medium text-white">
              {a.displayName || a.email}
              <span className="ml-2 rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                {a.role === "admin" ? "Administrator" : "O'qituvchi"}
              </span>
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {a.email}
              {a.classes.length ? ` · Sinf huquqi: ${a.classes.join(", ")}` : " · Sinf huquqi berilmagan"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
