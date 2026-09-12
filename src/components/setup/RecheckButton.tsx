"use client";

// Sozlash tekshiruvini qayta ishga tushirish tugmasi (server diagnostikasini
// yangilaydi — sahifa to'liq qayta yuklanmaydi).

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";

export function RecheckButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      onClick={async () => {
        setBusy(true);
        try {
          await router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
    >
      <RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
      {busy ? "Tekshirilmoqda…" : "Qayta tekshirish"}
    </button>
  );
}
