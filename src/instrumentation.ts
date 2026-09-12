// ============================================================================
// instrumentation.ts — server xatolarini log qilish
//
// Maqsad: prodda foydalanuvchi faqat "digest" ko'radi, xatoning haqiqiy matni
// esa server logida bo'ladi. Bu modul o'sha matnni, digest'ni va eng ehtimoliy
// sababni bitta joyga yozadi (Vercel → Logs, yoki `next start` terminali).
//
//   onRequestError — har bir Server Component / Route Handler xatosida
//   register       — server ishga tushganda bir marta (qaysi rejimda ekanini)
// ============================================================================

import { describeConnectionError, describeSupabaseError } from "@/lib/supabase-fetch";

interface InstrumentationRequest {
  url?: string;
  method?: string;
}

interface InstrumentationContext {
  routerKind?: string;
  routePath?: string;
  routeError?: unknown;
  componentStack?: string;
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { dataMode } = await import("@/lib/repo");
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  console.log(
    `[instrumentation] Teachers Workspace ishga tushdi · rejim: ${dataMode}` +
      (dataMode === "supabase" ? ` · ${url}` : " (Supabase sozlanmagan)")
  );
}

/**
 * Server tomonidagi har bir xato shu yerdan o'tadi.
 * (Next.js 15: onRequestError — App Router va Route Handler xatolari uchun.)
 */
export async function onRequestError(
  error: unknown,
  request: InstrumentationRequest,
  context: InstrumentationContext
) {
  const message = error instanceof Error ? error.message : String(error);
  const digest = (error as { digest?: string } | null)?.digest ?? "—";
  const route = context.routePath || request.url || "?";

  const looksLikeDb = /fetch|ENOTFOUND|ECONN|abort|socket|timed out|supabase|relation|schema cache|jwt/i.test(
    message
  );
  const explained = /fetch|ENOTFOUND|ECONN|abort|socket|timed out/i.test(message)
    ? describeConnectionError(error)
    : describeSupabaseError(message);

  console.error(
    [
      `[xato] ${request.method ?? "GET"} ${route}`,
      `  xabar : ${message}`,
      `  digest: ${digest}`,
      looksLikeDb
        ? `  sabab : ${explained.message}\n  nima qilish: ${explained.hint}`
        : "  sabab : kod xatosi (ma'lumotlar bazasi bilan bog'liq emas)",
      `  tekshirish: /setup yoki /api/health`,
    ].join("\n")
  );
}
