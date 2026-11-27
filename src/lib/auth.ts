import "server-only";

// ============================================================================
// O'QITUVCHI AUTENTIFIKATSIYASI — cookie sessiyalari va sahifa himoyasi.
//
//   • Har bir o'qituvchi sahifasi `(dashboard)` layoutida requireTeacher() bilan
//     SERVERDA tekshiriladi (menu yashirish emas!)
//   • Server amallari requireTeacherAction(), API'lar getTeacherSession()
//   • Sessiya tokeni httpOnly cookie'da; bazada FAQAT SHA-256 xeshi
//
// Yadro funksiyalar (hisoblar, parollar, sinf huquqlari) `auth-core.ts` da —
// u cookie'siz, shuning uchun integratsiya testlarida ham ishlaydi.
// ============================================================================

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseFetch } from "@/lib/supabase-fetch";
import { isSupabaseConfigured } from "@/lib/repo";
import {
  TEACHER_COOKIE,
  SESSION_TTL_MS,
  findAccountById,
  tokenHash,
  type AccountRow,
} from "@/lib/auth-core";

// Barcha yadro funksiyalari tashqaridan xuddi shu nom bilan ishlatiladi:
export {
  TEACHER_COOKIE,
  countAccounts,
  createTeacherAccount,
  findAccountByEmail,
  findAccountById,
  verifyAccount,
  ensureDemoAdmin,
  resetAuthDemoStore,
  hashPassword,
  verifyPassword,
  allowedClasses,
  canAccessStudent,
  listAccounts,
  setClassAccess,
  type AccountListItem,
} from "@/lib/auth-core";

export type { TeacherSession } from "@/lib/auth-core";
import type { TeacherSession } from "@/lib/auth-core";

// ------------------------------- Supabase ----------------------------------

let cached: SupabaseClient | null = null;

function sb(): SupabaseClient {
  if (cached) return cached;
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  ).trim();
  cached = createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: supabaseFetch },
  });
  return cached;
}

// ------------------------------- Sessiyalar --------------------------------

export async function login(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const { verifyAccount } = await import("@/lib/auth-core");
  const account = await verifyAccount(email, password);
  if (!account) return { ok: false, error: "Email yoki parol noto'g'ri." };

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  if (isSupabaseConfigured()) {
    const { error } = await sb().from("teacher_sessions").insert({
      account_id: account.id,
      token_hash: tokenHash(token),
      expires_at: expiresAt.toISOString(),
    });
    if (error) throw new Error(`Sessiya yaratishda xato: ${error.message}`);
    await sb().from("teacher_accounts").update({ last_login_at: new Date().toISOString() }).eq("id", account.id);
  } else {
    const { demoSessions } = await import("@/lib/auth-core");
    demoSessions().set(tokenHash(token), { accountId: account.id, expiresAt: expiresAt.getTime() });
  }

  const jar = await cookies();
  jar.set(TEACHER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return { ok: true };
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(TEACHER_COOKIE)?.value;
  if (token) {
    if (isSupabaseConfigured()) {
      await sb().from("teacher_sessions").delete().eq("token_hash", tokenHash(token));
    } else {
      const { demoSessions } = await import("@/lib/auth-core");
      demoSessions().delete(tokenHash(token));
    }
  }
  jar.delete(TEACHER_COOKIE);
}

/** Cookie'dagi sessiyani tekshirish (hech qanday redirect yo'q).
 *  DEMO/preview rejimda (Supabase ulanmagan) sessiya bo'lmasa ham demo admin
 *  sifatida ochiladi — sandbox preview'da login oynasisiz ichkarini ko'rsatish
 *  uchun. Supabase ulangan PRODUCTION'da bu yo'l YO'Q: login majburiy. */
export async function getTeacherSession(): Promise<TeacherSession | null> {
  const { findAccountById, demoSessions, ensureDemoAdmin } = await import("@/lib/auth-core");
  const jar = await cookies();
  const token = jar.get(TEACHER_COOKIE)?.value;
  const hash = token ? tokenHash(token) : null;

  let accountId: string | null = null;
  if (hash && !isSupabaseConfigured()) {
    const s = demoSessions().get(hash);
    if (s) {
      if (Date.now() > s.expiresAt) {
        demoSessions().delete(hash);
      } else {
        accountId = s.accountId;
      }
    }
  } else if (hash && isSupabaseConfigured()) {
    const res = await sb()
      .from("teacher_sessions")
      .select("account_id, expires_at")
      .eq("token_hash", hash)
      .maybeSingle();
    const row = res.data as { account_id: string; expires_at: string } | null;
    if (row && new Date(row.expires_at).getTime() >= Date.now()) {
      accountId = row.account_id;
    }
  }

  // Demo fallback: cookie yo'q/yaroqsiz — demo admin (faqat Supabase ulanmaganIDA)
  if (!accountId && !isSupabaseConfigured()) {
    const demo = await ensureDemoAdmin();
    if (demo) {
      return {
        accountId: demo.id,
        email: demo.email,
        displayName: demo.display_name,
        role: demo.role,
        teacherId: demo.teacher_id,
      };
    }
  }

  const account = accountId ? await findAccountById(accountId) : null;
  if (!account) return null;
  return {
    accountId: account.id,
    email: account.email,
    displayName: account.display_name,
    role: account.role,
    teacherId: account.teacher_id,
  };
}

/** Sahifalar uchun: sessiya yo'q bo'lsa /login ga yo'naltiradi */
export async function requireTeacher(): Promise<TeacherSession> {
  const session = await getTeacherSession();
  if (!session) redirect("/login");
  return session;
}

/** Server amallari uchun: sessiya yo'q bo'lsa xato (redirect yo'q) */
export async function requireTeacherAction(): Promise<TeacherSession> {
  const session = await getTeacherSession();
  if (!session) throw new Error("Ruxsat yo'q: avval tizimga kiring.");
  return session;
}
