import "server-only";

// ============================================================================
// O'QITUVCHI AUTH — YADRO (cookie'siz): hisoblar, parollar, sinf huquqlari.
// Cookie sessiyalari `auth.ts` da (next/headers kerak).
//
// README'da yozilganidek, ilovada ilgari login yo'q edi va hammasi
// service_role kalit bilan ishlagan. Endi:
//
//   • O'qituvchi hisoblari `teacher_accounts` jadvalida (scrypt xeshli parol)
//   • Sessiyalar `teacher_sessions` jadvalida (cookie'dagi token FAQAT XESH
//     sifatida saqlanadi), httpOnly cookie
//   • Har bir o'qituvchi sahifasi / amal / API `(dashboard)` layout va
//     `requireTeacher*` orqali SERVERDA tekshiriladi — menyuni yashirishga
//     yoki anon Supabase ruxsatlariga tayanilmaydi
//   • Sinf bo'yicha huquq: admin hamma sinfni, o'qituvchi FAQAT aniq
//     berilgan sinflarni ko'radi (teacher_class_access). Mavjud yozuvlarga
//     egalik AVTOMATIK biriktirilmaydi — /setup-access va o'qituvchilar
//     sahifasidagi "Ruxsatlar" bo'limi orqali xavfsiz sozlanadi.
//   • Supabase sozlanmagan demo rejimda xotirada bir admin hisob bo'ladi
//     (faqat sinov uchun; prod da albatta Supabase ulanadi).
// ============================================================================

import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { supabaseFetch } from "@/lib/supabase-fetch";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/repo";

export const TEACHER_COOKIE = "tw_teacher";
export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export interface TeacherSession {
  accountId: string;
  email: string;
  displayName: string;
  role: "admin" | "teacher";
  teacherId: string | null;
}

export interface AccountRow {
  id: string;
  teacher_id: string | null;
  email: string;
  display_name: string;
  password_hash: string;
  role: "admin" | "teacher";
}

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

// ------------------------------ Demo ombori --------------------------------

interface DemoAuth {
  accounts: Map<string, AccountRow>;
  sessions: Map<string, { accountId: string; expiresAt: number }>;
}

const g = globalThis as unknown as { __teacherAuthDemo?: DemoAuth };

function demoAuth(): DemoAuth {
  if (!g.__teacherAuthDemo) {
    g.__teacherAuthDemo = { accounts: new Map(), sessions: new Map() };
  }
  return g.__teacherAuthDemo;
}

/** Cookie sessiyalari xotirada (demo rejim) — auth.ts ishlatadi */
export function demoSessions(): Map<string, { accountId: string; expiresAt: number }> {
  return demoAuth().sessions;
}

export function resetAuthDemoStore(): void {
  g.__teacherAuthDemo = undefined;
}

/** Demo rejimda ishlashi uchun standart admin (FAQAT demo — Supabase bo'lsa yaratilmaydi) */
export async function ensureDemoAdmin(): Promise<void> {
  if (isSupabaseConfigured()) return;
  const d = demoAuth();
  if (d.accounts.size > 0) return;
  const row: AccountRow = {
    id: "demo-admin",
    teacher_id: null,
    email: "ustoz@demo.uz",
    display_name: "Demo administrator",
    password_hash: hashPassword("demo1234"),
    role: "admin",
  };
  d.accounts.set(row.id, row);
}

// ------------------------------- Parollar ----------------------------------

/** scrypt: N$r$s<hash> formatida saqlanadi */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const N = 16384;
  const r = 8;
  const p = 1;
  const hash = scryptSync(password, salt, 64, { N, r, p }).toString("hex");
  return `${N}$${r}$${p}$${hash}$${salt}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [nStr, rStr, pStr, hash, salt] = stored.split("$");
    if (!nStr || !rStr || !pStr || !hash || !salt) return false;
    const derived = scryptSync(password, salt, 64, {
      N: Number(nStr),
      r: Number(rStr),
      p: Number(pStr),
    }).toString("hex");
    return timingSafeEqual(Buffer.from(derived, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

export function tokenHash(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

// ------------------------------ Hisoblar -----------------------------------

export async function countAccounts(): Promise<number> {
  if (!isSupabaseConfigured()) return demoAuth().accounts.size;
  const res = await sb().from("teacher_accounts").select("id", { count: "exact", head: true });
  return res.count ?? 0;
}

export interface CreateAccountInput {
  email: string;
  password: string;
  displayName: string;
  role?: "admin" | "teacher";
  teacherId?: string | null;
  /** Boshqa hisobni admin yaratayotganda true (birinchi hisob uchun shart emas) */
}

/** Hisob yaratish. Birinchi hisob admin bo'ladi; keyingisi esa ko'rsatilgan rol bilan. */
export async function createTeacherAccount(input: CreateAccountInput): Promise<{ id: string; role: "admin" | "teacher" }> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Email noto'g'ri.");
  if (input.password.length < 8) throw new Error("Parol kamida 8 belgidan iborat bo'lishi kerak.");

  const total = await countAccounts();
  const role: "admin" | "teacher" = total === 0 ? "admin" : (input.role ?? "teacher");

  if (!isSupabaseConfigured()) {
    const d = demoAuth();
    for (const a of d.accounts.values()) {
      if (a.email === email) throw new Error("Bu email allaqachon ro'yxatda.");
    }
    const row: AccountRow = {
      id: `acc-${randomBytes(6).toString("hex")}`,
      teacher_id: input.teacherId ?? null,
      email,
      display_name: input.displayName || email,
      password_hash: hashPassword(input.password),
      role,
    };
    d.accounts.set(row.id, row);
    return { id: row.id, role };
  }

  const { data, error } = await sb()
    .from("teacher_accounts")
    .insert({
      email,
      password_hash: hashPassword(input.password),
      display_name: input.displayName || email,
      role,
      teacher_id: input.teacherId ?? null,
    })
    .select("id, role")
    .single();
  if (error) {
    if (/duplicate|unique/i.test(error.message)) throw new Error("Bu email allaqachon ro'yxatda.");
    throw new Error(`Hisob yaratishda xato: ${error.message}`);
  }
  return { id: data.id, role: data.role };
}

export async function findAccountByEmail(email: string): Promise<AccountRow | null> {
  const normalized = email.trim().toLowerCase();
  if (!isSupabaseConfigured()) {
    for (const a of demoAuth().accounts.values()) if (a.email === normalized) return a;
    return null;
  }
  const res = await sb().from("teacher_accounts").select("*").eq("email", normalized).maybeSingle();
  return (res.data as AccountRow | null) ?? null;
}

export async function findAccountById(id: string): Promise<AccountRow | null> {
  if (!isSupabaseConfigured()) return demoAuth().accounts.get(id) ?? null;
  const res = await sb().from("teacher_accounts").select("*").eq("id", id).maybeSingle();
  return (res.data as AccountRow | null) ?? null;
}

/**
 * Email+parolni tekshirish (cookie'siz — testlar ham ishlatadi).
 * Hisob topilmasa yoki parol noto'g'ri bo'lsa null.
 */
export async function verifyAccount(email: string, password: string): Promise<AccountRow | null> {
  const account = await findAccountByEmail(email);
  if (!account) return null;
  if (!verifyPassword(password, account.password_hash)) return null;
  return account;
}

// --------------------------- Sinf bo'yicha huquq ---------------------------

/**
 * O'qituvchining ko'rishiga ruxsat etilgan sinflar.
 *   admin   → null (hamma sinflar)
 *   teacher → aniq berilgan sinflar ro'yxati (bo'sh ro'yxat = huquq yo'q)
 */
export async function allowedClasses(session: TeacherSession): Promise<string[] | null> {
  if (session.role === "admin") return null;
  if (!isSupabaseConfigured()) {
    return demoClassAccess().get(session.accountId) ?? [];
  }
  const res = await sb()
    .from("teacher_class_access")
    .select("class_name")
    .eq("account_id", session.accountId);
  return ((res.data ?? []) as Array<{ class_name: string }>).map((r) => r.class_name);
}

export async function canAccessStudent(
  session: TeacherSession,
  studentClass: string
): Promise<boolean> {
  const classes = await allowedClasses(session);
  if (classes === null) return true; // admin
  return classes.includes(studentClass);
}

// ------------------------------ Demo ruxsatlar -----------------------------

const gd = globalThis as unknown as { __teacherClassAccessDemo?: Map<string, string[]> };

function demoClassAccess(): Map<string, string[]> {
  if (!gd.__teacherClassAccessDemo) gd.__teacherClassAccessDemo = new Map();
  return gd.__teacherClassAccessDemo;
}

export interface AccountListItem {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "teacher";
  teacherId: string | null;
  createdAt: string | null;
  lastLoginAt: string | null;
  classes: string[];
}

export async function listAccounts(): Promise<AccountListItem[]> {
  if (!isSupabaseConfigured()) {
    const d = demoAuth();
    const access = demoClassAccess();
    return [...d.accounts.values()].map((a) => ({
      id: a.id,
      email: a.email,
      displayName: a.display_name,
      role: a.role,
      teacherId: a.teacher_id,
      createdAt: null,
      lastLoginAt: null,
      classes: access.get(a.id) ?? [],
    }));
  }
  const [accRes, accessRes] = await Promise.all([
    sb().from("teacher_accounts").select("id, email, display_name, role, teacher_id, created_at, last_login_at").order("created_at"),
    sb().from("teacher_class_access").select("account_id, class_name"),
  ]);
  const byAccount = new Map<string, string[]>();
  for (const row of (accessRes.data ?? []) as Array<{ account_id: string; class_name: string }>) {
    const list = byAccount.get(row.account_id) ?? [];
    list.push(row.class_name);
    byAccount.set(row.account_id, list);
  }
  return ((accRes.data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    email: String(r.email),
    displayName: String(r.display_name ?? ""),
    role: r.role === "admin" ? "admin" : "teacher",
    teacherId: (r.teacher_id as string | null) ?? null,
    createdAt: (r.created_at as string | null) ?? null,
    lastLoginAt: (r.last_login_at as string | null) ?? null,
    classes: byAccount.get(String(r.id)) ?? [],
  }));
}

/** Admin: sinf huquqlarini aniq berish (avtomatik biriktirish YO'Q) */
export async function setClassAccess(
  accountId: string,
  classes: string[],
  actor: TeacherSession
): Promise<void> {
  if (actor.role !== "admin") throw new Error("Faqat administrator sinf huquqlarini sozlaydi.");
  const clean = [...new Set(classes.map((c) => c.trim()).filter(Boolean))];
  if (!isSupabaseConfigured()) {
    demoClassAccess().set(accountId, clean);
    return;
  }
  const client = sb();
  const { error: delError } = await client
    .from("teacher_class_access")
    .delete()
    .eq("account_id", accountId);
  if (delError) throw new Error(`Ruxsatlarni yangilashda xato: ${delError.message}`);
  if (clean.length) {
    const { error } = await client
      .from("teacher_class_access")
      .insert(clean.map((c) => ({ account_id: accountId, class_name: c })));
    if (error) throw new Error(`Ruxsatlarni saqlashda xato: ${error.message}`);
  }
}
