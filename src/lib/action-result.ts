// ============================================================================
// ActionResult — Server Action'lar endi 500 qaytarmaydi
//
// Avval: action `throw` qilsa Next.js 500 qaytarardi va brauzerda faqat
// "An error occurred in the Server Components render" + digest chiqardi.
// Endi: har bir action safeAction() orqali o'raladi va HAR DOIM ActionResult
// qaytaradi — client komponent xatoni formada aniq qizil matn ko'rsatadi.
//
//   • Validatsiya xatolari (ValidationError) — baza bilan bog'liq EMAS:
//     DbAlert'ga yozilmaydi, hint qo'shilmaydi, matn o'zgarmasdan qaytadi
//     (masalan: "F.I.Sh" maydoni to'ldirilishi shart)
//   • Baza/tarmoq xatolari — recordDbIssue orqali ro'yxatga yoziladi va
//     { ok: false, error, hint } ko'rinishida qaytadi (hint supabase-fetch'dagi
//     describeSupabaseError/describeConnectionError'dan keladi)
// ============================================================================

import { recordDbIssue, type DbIssue } from "./db-status";

/**
 * Action natijasi. `T` — muvaffaqiyatda qaytadigan qo'shimcha ma'lumot
 (masalan, yangi yozuv id'si). Oddiy action'lar uchun `ActionResult` (void).
 */
export type ActionResult<T = void> =
  | ({ ok: true } & (T extends void ? unknown : { data: T }))
  | { ok: false; error: string; hint?: string };

/**
 * Validatsiya xatosi — foydalanuvchi kiritgan ma'lumot noto'g'ri.
 * Baza xatosi emas: DbAlert'ga tushmaydi va ustiga maslahat yopishtirilmaydi.
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/** Xato matnini hint bilan bitta satrga yig'adi (client'lar uchun) */
export function describeFailure(res: { error: string; hint?: string }): string {
  return res.error + (res.hint ? ` ${res.hint}` : "");
}

/**
 * Action tanasini xatoga chidamli bajaradi:
 *   • ValidationError → { ok: false, error } (toza matn, hintsiz)
 *   • guardWrite'dan kelgan xato → unga biriktirilgan dbIssue ishlatiladi
 *     (xato allaqachon recordDbIssue orqali yozilgan bo'ladi)
 *   • boshqa xato → recordDbIssue(source, err) + console.warn
 * Hech qachon throw qilmaydi — natija doim ActionResult.
 */
export async function safeAction(fn: () => Promise<void>, source?: string): Promise<ActionResult>;
export async function safeAction<T>(fn: () => Promise<T>, source?: string): Promise<ActionResult<T>>;
export async function safeAction<T>(
  fn: () => Promise<T>,
  source = "serverAction"
): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    if (data === undefined) return { ok: true } as ActionResult<T>;
    return { ok: true, data } as ActionResult<T>;
  } catch (err) {
    if (err instanceof ValidationError) {
      return { ok: false, error: err.message };
    }
    // guardWrite xatoni tushuntirib, dbIssue sifatida biriktirib otadi —
    // uni qayta izohlash matnni ikkilantirardi (supabase-fetch'dagi prefixlar).
    const attached = (err as { dbIssue?: DbIssue } | null)?.dbIssue;
    const issue = attached ?? recordDbIssue(source, err);
    console.warn(`[action] ${source}: ${issue.message}\n     maslahat: ${issue.hint}`);
    return { ok: false, error: issue.message, hint: issue.hint };
  }
}
