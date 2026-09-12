// ============================================================================
// Ma'lumotlar bazasi holati — o'qish so'rovlarini xatoga chidamli qilish
//
// Muammo: Supabase javob bermasa har bir sahifa 500 bo'lib yiqilardi
// (prodda faqat "digest" ko'rinadi). Buning o'rniga:
//
//   • O'QISH  → xato bo'lsa bo'sh ro'yxat qaytadi, sahifa ochiladi, tepada
//               DbAlert ogohlantirish ko'rsatadi (safeRead)
//   • YOZISH  → xato yashirilmaydi, lekin tushunarli matn bilan chiqadi,
//               chunki "saqlandi" deb aldash yomonroq (guardWrite)
//
// Yig'ilgan xatolar so'rov davomida saqlanadi va DbAlert / /setup /
// /api/health ularni ko'rsatadi.
// ============================================================================

import { describeConnectionError, describeSupabaseError, type ExplainedError } from "./supabase-fetch";

export interface DbIssue {
  /** Qaysi amal ("listStudents", "dbListBooks", ...) */
  source: string;
  message: string;
  hint: string;
  raw: string;
  kind: ExplainedError["kind"];
  at: string;
}

const MAX_ISSUES = 20;

interface IssueStore {
  issues: DbIssue[];
  /** Ulanish tekshiruvi keshi (DbAlert har sahifada 17 ta so'rov yubormasligi uchun) */
  probe?: { ok: boolean; message: string; hint: string; at: number };
}

const store: IssueStore = ((globalThis as unknown as { __dbStatus?: IssueStore }).__dbStatus ??= {
  issues: [],
});

/** Xatoni ro'yxatga yozadi (takrorlarini birlashtiradi) */
export function recordDbIssue(source: string, err: unknown): DbIssue {
  const explained = explain(source, err);
  const issue: DbIssue = {
    source,
    message: explained.message,
    hint: explained.hint,
    raw: explained.raw.slice(0, 400),
    kind: explained.kind,
    at: new Date().toISOString(),
  };
  const same = store.issues.find((i) => i.source === source && i.raw === issue.raw);
  if (same) same.at = issue.at;
  else store.issues.unshift(issue);
  if (store.issues.length > MAX_ISSUES) store.issues.length = MAX_ISSUES;
  return issue;
}

function explain(source: string, err: unknown): ExplainedError {
  const message = err instanceof Error ? err.message : String(err);
  const table = source.replace(/^(db)?(list|get|save|delete|update|create|set)(Meta|Book|Result|s)?/i, "");
  const explained = /fetch|ENOTFOUND|ECONN|abort|socket|timed out|manzili topilmadi|javob bermadi/i.test(message)
    ? describeConnectionError(err)
    : describeSupabaseError(message, table);
  // "Supabase xatosi: Supabase: ..." kabi takrorlanishni va keraksiz
  // "Error: " prefiksini tozalaymiz (foydalanuvchiga toza matn ko'rsatiladi)
  const tidy = (t: string) =>
    t.replace(/Supabase xatosi: (Supabase: )+/g, "Supabase: ").replace(/:\s*Error:\s*/g, ": ");
  explained.message = tidy(explained.message);
  explained.hint = tidy(explained.hint);
  return explained;
}

// ---------------------------------------------------------------------------
// "Ulanish uzilgan" rejimi (circuit breaker)
//
// Baza javob bermasa har bir sahifa DNS/taymer vaqtini kutib, 7–10 soniya
// "qotib" turardi. Birinchi xatodan keyin CONNECTION_BREAKER_MS davomida
// tarmoqqa umuman chiqmaymiz: sahifalar darhol bo'sh ro'yxat bilan ochiladi,
// xato esa ogohlantirishda ko'rinadi. Vaqt o'tgach so'rovlar qayta uriniladi.
// ---------------------------------------------------------------------------

/** Ulanish xatosidan keyin tarmoqqa chiqilmaydigan vaqt (ms) */
export const CONNECTION_BREAKER_MS = 30_000;

const CONNECTION_KINDS: ExplainedError["kind"][] = ["timeout", "dns", "refused", "tls", "network"];

/** Yaqinda qayd etilgan ulanish xatosi (agar bo'lsa) */
export function getCachedConnectionIssue(): DbIssue | undefined {
  const found = store.issues.find((i) => CONNECTION_KINDS.includes(i.kind));
  if (!found) return undefined;
  return Date.now() - new Date(found.at).getTime() < CONNECTION_BREAKER_MS ? found : undefined;
}

/** So'rov paytida yig'ilgan xatolar (DbAlert uchun) */
export function getDbIssues(): DbIssue[] {
  return store.issues.slice();
}

export function clearDbIssues(): void {
  store.issues = [];
}

// ---------------------------------------------------------------------------
// O'qish — xatoga chidamli
// ---------------------------------------------------------------------------

/**
 * O'qish so'rovini bajaradi. Xato bo'lsa — xatoni yozib qo'yadi va
 * `fallback` (odatda bo'sh ro'yxat) qaytaradi: sahifa yiqilmaydi.
 */
export async function safeRead<T>(
  source: string,
  read: () => Promise<T[]>,
  fallback: T[] = []
): Promise<T[]> {
  if (getCachedConnectionIssue()) return fallback;
  try {
    return await read();
  } catch (err) {
    const issue = recordDbIssue(source, err);
    console.warn(`[db] ${source}: ${issue.message}\n     maslahat: ${issue.hint}`);
    return fallback;
  }
}

/** Bitta yozuvni o'qish (topilmasa null) */
export async function safeReadOne<T>(source: string, read: () => Promise<T | null>): Promise<T | null> {
  if (getCachedConnectionIssue()) return null;
  try {
    return await read();
  } catch (err) {
    const issue = recordDbIssue(source, err);
    console.warn(`[db] ${source}: ${issue.message}\n     maslahat: ${issue.hint}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Yozish — xato yashirilmaydi
// ---------------------------------------------------------------------------

/**
 * Yozish so'rovi. Xato bo'lsa — tushunarli matn bilan qayta tashlanadi
 * (foydalanuvchi "saqlanmadi"ni bilishi kerak), lekin sabab aniq bo'ladi.
 */
export async function guardWrite<T>(source: string, write: () => Promise<T>): Promise<T> {
  const broken = getCachedConnectionIssue();
  if (broken) throw new Error(`${broken.message} ${broken.hint}`);
  try {
    return await write();
  } catch (err) {
    const issue = recordDbIssue(source, err);
    const e = new Error(`${issue.message} ${issue.hint}`);
    (e as Error & { cause?: unknown }).cause = err;
    throw e;
  }
}
