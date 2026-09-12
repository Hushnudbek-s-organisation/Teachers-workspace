// ============================================================================
// Sozlash tekshiruvi — "nega ishlamayapti?" savoliga javob beruvchi diagnostika
//
// Ish tartibi:
//   1. env tekshiruvi (URL/kalit bormi, to'g'rimi)
//   2. ULANISH tekshiruvi (bitta so'rov). Javob bo'lmasa — shu yerda
//      to'xtaymiz: 17 ta so'rovni behuda kutishning hojati yo'q, foydalanuvchi
//      bitta aniq xatoni ko'radi.
//   3. Ulanish bo'lsa — 10 ta jadval va 7 ta VIEW alohida tekshiriladi
//      (qaysi biri yo'q, qaysi biriga ruxsat yo'q, nechta qator bor).
//
// Ishlatiladi: /setup sahifasi, /api/health, DbAlert.
// ============================================================================

import { describeConnectionError, describeSupabaseError, supabaseFetch, SUPABASE_TIMEOUT_MS } from "./supabase-fetch";
import { validateSupabaseEnv } from "./repo";
import { getCachedConnectionIssue } from "./db-status";

/** supabase/schema.sql'dagi 10 ta jadval */
export const EXPECTED_TABLES = [
  "teachers",
  "students",
  "parents",
  "schedules",
  "attendance",
  "dismissal",
  "grades",
  "books",
  "custom_games",
  "game_results",
] as const;

/** supabase/schema.sql'dagi 7 ta VIEW */
export const EXPECTED_VIEWS = [
  "v_daily_attendance",
  "v_monthly_attendance",
  "v_class_performance",
  "v_subject_performance",
  "v_student_overview",
  "v_today_birthdays",
  "v_book_leaderboard",
] as const;

export type CheckStatus = "ok" | "missing" | "error";

export interface CheckRow {
  name: string;
  kind: "table" | "view";
  status: CheckStatus;
  rows: number | null;
  message?: string;
  hint?: string;
  ms: number;
}

export interface ConnectionCheck {
  ok: boolean;
  status?: number;
  ms: number;
  message?: string;
  hint?: string;
  raw?: string;
}

export interface DiagnosticReport {
  ok: boolean;
  mode: "supabase" | "demo";
  checkedAt: string;
  durationMs: number;
  env: {
    url: string;
    hasAnonKey: boolean;
    hasServiceKey: boolean;
    problems: string[];
  };
  connection: ConnectionCheck;
  tables: CheckRow[];
  views: CheckRow[];
  /** Ulanish xatosi tufayli jadval/VIEW'lar tekshirilmadi */
  skippedSchema: boolean;
  nextSteps: string[];
}

// ---------------------------------------------------------------------------

function envSnapshot() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  const service = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  return {
    url: url ? maskUrl(url) : "",
    hasAnonKey: anon.length > 0,
    hasServiceKey: service.length > 0,
  };
}

/** URL'ni log/ekran uchun qisqartiradi: https://abc…xyz.supabase.co */
export function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    const label = u.hostname.split(".")[0] ?? u.hostname;
    const short = label.length > 10 ? `${label.slice(0, 6)}…${label.slice(-3)}` : label;
    return `${u.protocol}//${short}.${u.hostname.split(".").slice(1).join(".")}`;
  } catch {
    return url.slice(0, 24) + "…";
  }
}

function key(): string {
  return (
    (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim() ||
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim()
  );
}

interface RestResult {
  status: number;
  ms: number;
  rows: number | null;
  message?: string;
  network?: unknown;
}

async function rest(path: string): Promise<RestResult> {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
  const started = Date.now();
  try {
    const res = await supabaseFetch(`${url}/rest/v1/${path}`, {
      method: "GET",
      headers: {
        apikey: key(),
        authorization: `Bearer ${key()}`,
        prefer: "count=exact",
        range: "0-0",
        accept: "application/json",
      },
    });
    const ms = Date.now() - started;
    const range = res.headers.get("content-range") ?? "";
    const total = range.includes("/") ? Number(range.split("/")[1]) : NaN;
    let message: string | undefined;
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      try {
        const parsed = JSON.parse(text) as { message?: string; details?: string; hint?: string };
        message = [parsed.message, parsed.details, parsed.hint].filter(Boolean).join(" — ");
      } catch {
        message = text.slice(0, 300) || res.statusText;
      }
    }
    return { status: res.status, ms, rows: Number.isFinite(total) ? total : null, message };
  } catch (err) {
    return { status: 0, ms: Date.now() - started, rows: null, network: err };
  }
}

function rowFor(name: string, kind: "table" | "view", r: RestResult): CheckRow {
  if (r.network) {
    const ex = describeConnectionError(r.network);
    return { name, kind, status: "error", rows: null, message: ex.message, hint: ex.hint, ms: r.ms };
  }
  if (r.status === 200 || r.status === 206) {
    return { name, kind, status: "ok", rows: r.rows, ms: r.ms };
  }
  const explained = describeSupabaseError(r.message ?? `HTTP ${r.status}`, name);
  const missing = explained.kind === "schema" || r.status === 404;
  return {
    name,
    kind,
    status: missing ? "missing" : "error",
    rows: null,
    message: explained.message,
    hint: explained.hint,
    ms: r.ms,
  };
}

/** Asosiy diagnostika — /setup va /api/health shu funksiyani chaqiradi */
export async function runDiagnostics(): Promise<DiagnosticReport> {
  const startedAt = Date.now();
  const env = validateSupabaseEnv();
  const snapshot = envSnapshot();
  const base = {
    checkedAt: new Date().toISOString(),
    env: { ...snapshot, problems: env.problems },
  };

  // --- Supabase umuman sozlanmagan: bu xato emas, demo rejimi ---
  if (!snapshot.url && !snapshot.hasAnonKey && !snapshot.hasServiceKey) {
    return {
      ...base,
      ok: true,
      mode: "demo",
      durationMs: Date.now() - startedAt,
      connection: { ok: true, ms: 0 },
      tables: [],
      views: [],
      skippedSchema: true,
      nextSteps: [
        "Ilova demo rejimida ishlayapti (ma'lumotlar xotirada, sahifa yangilansa yo'qoladi).",
        "Haqiqiy bazaga ulash uchun .env.local'ga NEXT_PUBLIC_SUPABASE_URL va kalitlarni yozing, so'ng supabase/schema.sql'ni ishga tushiring.",
      ],
    };
  }

  // --- env noto'g'ri: tarmoqqa chiqmasdan aytamiz ---
  if (!env.ok) {
    return {
      ...base,
      ok: false,
      mode: "demo",
      durationMs: Date.now() - startedAt,
      connection: { ok: false, ms: 0, message: env.problems[0], hint: ".env.local faylini to'ldiring (namuna: .env.local.example)." },
      tables: [],
      views: [],
      skippedSchema: true,
      nextSteps: [...env.problems, ".env.local.example faylidan nusxa oling va qiymatlarni to'ldiring."],
    };
  }

  // --- 1) Ulanish ---
  const probe = await rest("");
  const connection: ConnectionCheck = probe.network
    ? {
        ok: false,
        ms: probe.ms,
        ...describeConnectionError(probe.network),
      }
    : probe.status === 200 || probe.status === 206
      ? { ok: true, status: probe.status, ms: probe.ms }
      : {
          ok: false,
          status: probe.status,
          ms: probe.ms,
          ...describeSupabaseError(probe.message ?? `HTTP ${probe.status}`),
        };

  if (!connection.ok) {
    return {
      ...base,
      ok: false,
      mode: "supabase",
      durationMs: Date.now() - startedAt,
      connection,
      tables: [],
      views: [],
      skippedSchema: true,
      nextSteps: buildNextSteps({ connection, missing: [], auth: false }),
    };
  }

  // --- 2) Jadval va VIEW'lar (17 ta so'rov) ---
  const tables = await Promise.all(
    EXPECTED_TABLES.map(async (name) => rowFor(name, "table", await rest(`${name}?select=*&limit=1`)))
  );
  const views = await Promise.all(
    EXPECTED_VIEWS.map(async (name) => rowFor(name, "view", await rest(`${name}?select=*&limit=1`)))
  );

  const missing = [...tables, ...views].filter((r) => r.status === "missing").map((r) => r.name);
  const auth = [...tables, ...views].some((r) => r.status === "error" && /ruxsat|permission|JWT|api ?key/i.test(r.message ?? ""));
  const ok = missing.length === 0 && !auth;

  return {
    ...base,
    ok,
    mode: "supabase",
    durationMs: Date.now() - startedAt,
    connection,
    tables,
    views,
    skippedSchema: false,
    nextSteps: buildNextSteps({ connection, missing, auth }),
  };
}

function buildNextSteps(input: { connection: ConnectionCheck; missing: string[]; auth: boolean }): string[] {
  const steps: string[] = [];
  if (!input.connection.ok) {
    steps.push(input.connection.hint ?? "Ulanishni tekshiring.");
    steps.push("Supabase Dashboard → Settings → API: URL va kalitlarni .env.local bilan solishtiring.");
    steps.push("Loyiha pauzada bo'lsa, Dashboard'ni oching — loyiha avtomatik 'uyg'onadi (30–60 soniya).");
    return steps;
  }
  if (input.missing.length) {
    steps.push(
      `Supabase'da topilmadi: ${input.missing.join(", ")}. supabase/schema.sql faylini SQL Editor'da to'liq ishga tushiring.`
    );
    steps.push("Schema qo'llangandan so'ng bu sahifani qayta oching (yoki 'Qayta tekshirish' tugmasini bosing).");
  }
  if (input.auth) {
    steps.push("Ruxsat xatosi: SUPABASE_SERVICE_ROLE_KEY qiymatini yangilang yoki RLS siyosatlarini tekshiring.");
  }
  if (!steps.length) steps.push("Hammasi joyida — baza bilan ulanish ishlayapti.");
  return steps;
}

// ---------------------------------------------------------------------------
// Yengil xulosa — har sahifadagi DbAlert uchun (30 soniya kesh bilan)
// ---------------------------------------------------------------------------

export interface DbSummary {
  mode: "supabase" | "demo";
  ok: boolean;
  title: string;
  detail?: string;
  hint?: string;
}

const SUMMARY_TTL_MS = 30_000;

interface CachedSummary {
  at: number;
  summary: DbSummary;
}

/**
 * Sahifa tepasidagi ogohlantirish uchun tez holat.
 * Har sahifada 17 ta so'rov yubormaslik uchun 30 soniya keshlanadi.
 */
export async function getDbStatusSummary(force = false): Promise<DbSummary> {
  const globalRef = globalThis as unknown as { __dbSummary?: CachedSummary };
  if (!force && globalRef.__dbSummary && Date.now() - globalRef.__dbSummary.at < SUMMARY_TTL_MS) {
    return globalRef.__dbSummary.summary;
  }

  const summary = await computeSummary();
  globalRef.__dbSummary = { at: Date.now(), summary };
  return summary;
}

async function computeSummary(): Promise<DbSummary> {
  const env = validateSupabaseEnv();
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anyKey =
    (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim() ||
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

  if (!url && !anyKey) {
    return { mode: "demo", ok: true, title: "demo" };
  }
  if (!env.ok) {
    return {
      mode: "demo",
      ok: false,
      title: "Supabase sozlamalari to'liq emas — demo rejimida ishlayapti",
      detail: env.problems.join(" "),
      hint: ".env.local faylini to'ldiring va deploy qayta ishga tushiring.",
    };
  }

  // Ulanish xatosi allaqachon ma'lum bo'lsa, 7–10 soniya kutib probe qilmaymiz
  const broken = getCachedConnectionIssue();
  if (broken) {
    return { mode: "supabase", ok: false, title: "Supabase'ga ulanib bo'lmadi", detail: broken.message, hint: broken.hint };
  }

  const probe = await rest("");
  if (probe.network) {
    const ex = describeConnectionError(probe.network);
    return { mode: "supabase", ok: false, title: "Supabase'ga ulanib bo'lmadi", detail: ex.message, hint: ex.hint };
  }
  if (probe.status !== 200 && probe.status !== 206) {
    const ex = describeSupabaseError(probe.message ?? `HTTP ${probe.status}`);
    return { mode: "supabase", ok: false, title: "Supabase so'rovni qabul qilmadi", detail: ex.message, hint: ex.hint };
  }
  return { mode: "supabase", ok: true, title: "supabase" };
}

export const DIAGNOSTICS_TIMEOUT_MS = SUPABASE_TIMEOUT_MS;
