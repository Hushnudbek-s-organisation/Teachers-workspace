// ============================================================================
// Supabase so'rovlari uchun umumiy `fetch` qatlami
//
// Nima uchun kerak?
//   1) Standart fetch'da taymer yo'q. Supabase javob bermasa (loyiha pauzada,
//      URL noto'g'ri, tarmoq yo'q) sahifa cheksiz kutib turadi va Vercel
//      funksiyasi vaqti tugagach foydalanuvchi faqat "digest" ko'radi.
//   2) Node.js tarmoq xatolari "fetch failed" deb chiqadi — bu xabardan
//      sababni ham, nima qilishni ham bilib bo'lmaydi.
//
// Bu modul ikkala muammoni hal qiladi:
//   • har bir so'rovga SUPABASE_TIMEOUT_MS taymer qo'yadi
//   • tarmoq xatosini inson o'qiy oladigan sabab + maslahatga aylantiradi
// ============================================================================

/** Bitta Supabase so'rovi uchun kutiladigan eng uzoq vaqt (ms) */
export const SUPABASE_TIMEOUT_MS = 10_000;

export interface ExplainedError {
  /** Inson o'qiy oladigan xato matni */
  message: string;
  /** Nima qilish kerak */
  hint: string;
  /** Asl xato matni (diagnostika uchun) */
  raw: string;
  /** Xato turi — /setup sahifasi va /api/health uchun */
  kind:
    | "timeout"
    | "dns"
    | "refused"
    | "tls"
    | "network"
    | "auth"
    | "notfound"
    | "schema"
    | "unknown";
}

/** URL'dan faqat hostni oladi (xato xabarida log uchun) */
function hostOf(input: RequestInfo | URL | string): string {
  try {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : typeof (input as Request)?.url === "string"
            ? (input as Request).url
            : "";
    return url ? new URL(url).host : "Supabase";
  } catch {
    return "Supabase";
  }
}

/** Node.js/undici tarmoq xatolarini sabab + maslahatga aylantiradi */
export function describeConnectionError(err: unknown, url = ""): ExplainedError {
  const e = err as { name?: string; message?: string; cause?: unknown } | null;
  const cause = (e?.cause ?? err) as { code?: string; message?: string } | null;
  const code = String(cause?.code ?? "");
  const raw = `${e?.name ?? "Error"}: ${e?.message ?? String(err)}${
    cause?.message ? ` (${cause.message})` : ""
  }${code ? ` [${code}]` : ""}`;
  const host = hostOf(url);

  if (e?.name === "AbortError" || /aborted|timed?\s*out|timeout/i.test(raw)) {
    return {
      kind: "timeout",
      message: `Supabase (${host}) ${SUPABASE_TIMEOUT_MS / 1000} soniyada javob bermadi.`,
      hint: "Loyiha pauza holatida bo'lishi mumkin — Supabase Dashboard'ni oching (loyiha 'uyg'onadi). Yoki NEXT_PUBLIC_SUPABASE_URL noto'g'ri bo'lishi mumkin.",
      raw,
    };
  }
  if (code === "ENOTFOUND" || /getaddrinfo|ENOTFOUND/i.test(raw)) {
    return {
      kind: "dns",
      message: `Supabase manzili topilmadi: ${host} (DNS xatosi).`,
      hint: "NEXT_PUBLIC_SUPABASE_URL qiymatini tekshiring — u 'https://<loyiha>.supabase.co' ko'rinishida bo'lishi kerak (Supabase Dashboard → Settings → API).",
      raw,
    };
  }
  if (/ECONNREFUSED|ECONNRESET|EPIPE|socket hang up|EAI_AGAIN|ETIMEDOUT/i.test(raw)) {
    return {
      kind: "refused",
      message: `Supabase bilan ulanish o'rnatilmadi (${code || "tarmoq xatosi"}).`,
      hint: "Loyiha pauzada yoki o'chirilgan bo'lishi mumkin. Supabase Dashboard'da loyiha holatini tekshiring.",
      raw,
    };
  }
  if (/self.signed|certificate|UNABLE_TO_VERIFY|SSL|TLS/i.test(raw)) {
    return {
      kind: "tls",
      message: `Supabase bilan SSL/TLS ulanishida xato.`,
      hint: "Odatda bu proxy yoki noto'g'ri URL sababli bo'ladi. NEXT_PUBLIC_SUPABASE_URL 'https://' bilan boshlanishini tekshiring.",
      raw,
    };
  }

  return {
    kind: "network",
    message: `Supabase'ga so'rov yuborib bo'lmadi: ${e?.message ?? "tarmoq xatosi"}`,
    hint: "Tarmoq ulanishini va NEXT_PUBLIC_SUPABASE_URL qiymatini tekshiring. Sozlash tekshiruvi (/setup) aniq sababni ko'rsatadi.",
    raw,
  };
}

/** PostgREST javobidagi xato matnini tushunarli ko'rinishga keltiradi */
export function describeSupabaseError(message: string, table = ""): ExplainedError {
  const m = message || "noma'lum xato";
  const where = table ? `"${table}" ` : "";

  if (/JWT|invalid api ?key|Invalid token|signature/i.test(m)) {
    return {
      kind: "auth",
      message: `Supabase kaliti qabul qilinmadi: ${m}`,
      hint: "SUPABASE_SERVICE_ROLE_KEY (yoki NEXT_PUBLIC_SUPABASE_ANON_KEY) noto'g'ri yoki eskirgan. Dashboard → Settings → API'dan yangi kalitni oling.",
      raw: m,
    };
  }
  if (/relation .* does not exist|schema cache/i.test(m)) {
    return {
      kind: "schema",
      message: `Supabase'da ${where}jadvali topilmadi: ${m}`,
      hint: "supabase/schema.sql faylini Supabase SQL Editor'da ishga tushiring, so'ng /setup sahifasida qayta tekshiring.",
      raw: m,
    };
  }
  if (/permission denied|row.level security|new row violates/i.test(m)) {
    return {
      kind: "auth",
      message: `Supabase ruxsat bermadi: ${m}`,
      hint: "Row Level Security siyosatlarini tekshiring (supabase/schema.sql oxirida). Server tomonida SUPABASE_SERVICE_ROLE_KEY ishlatiladi.",
      raw: m,
    };
  }
  if (/column .* does not exist/i.test(m)) {
    return {
      kind: "schema",
      message: `Supabase'da ustun topilmadi: ${m}`,
      hint: "Sxema eski bo'lishi mumkin — supabase/schema.sql'ni qayta ishga tushiring.",
      raw: m,
    };
  }
  if (/duplicate key value/i.test(m)) {
    return { kind: "unknown", message: `Takroriy yozuv: ${m}`, hint: "Bu yozuv allaqachon mavjud.", raw: m };
  }

  return { kind: "unknown", message: `Supabase xatosi: ${m}`, hint: "/setup sahifasi aniq sababni ko'rsatadi.", raw: m };
}

/**
 * supabase-js'ga beriladigan `fetch`.
 *
 * Diqqat: `globalThis.fetch` HAR CHAQIRUVDA olinadi — shu sababli testlar
 * (scripts/test-supabase-path.mts) fetch'ni almashtirganda bu qatlam ham
 * o'sha stub orqali ishlaydi.
 */
export async function supabaseFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);

  // supabase-js o'zi signal bersa — ikkalasini birlashtiramiz
  const outer = init.signal;
  if (outer) {
    if (outer.aborted) controller.abort();
    else outer.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    return await globalThis.fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    const { message, hint } = describeConnectionError(err, String(input));
    const enriched = new Error(`${message} ${hint}`);
    (enriched as Error & { cause?: unknown }).cause = err;
    throw enriched;
  } finally {
    clearTimeout(timer);
  }
}
