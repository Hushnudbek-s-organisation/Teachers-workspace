// ============================================================================
// O'QITUVCHI SESSIYASI — LOGIN OLIB TASHLANGAN.
//
// Foydalanuvchi talabi: sayt shaxsiy — login oynasi YO'Q, hamma sahifa
// to'g'ridan-to'g'ri ochiladi. Yagona o'qituvchi: **Muxlisa** (barcha sinflar).
//
//   • requireTeacher / requireTeacherAction / getTeacherSession — doim
//     "Muxlisa" sessiyasini qaytaradi (hech qanday redirect/401 yo'q)
//   • O'QUVCHI PORTALI (/o/...) baribir maxfiy: har havola tasodifiy token,
//     bazada FAQAT SHA-256 xesh saqlanadi, linkini bilmasa kira olmaydi
//   • Eski login/setup-access URL'lari "/" ga yo'naltiriladi
//   • auth-core.ts dagi hisob/parol funksiyalari saqlanib qoldi (testlar
//     ishlatadi; kelajakda login qayta qo'shilsa tayyor)
// ============================================================================

import type { TeacherSession } from "@/lib/auth-core";

// Yadro funksiyalari (hisoblar, parollar, sinf huquqlari) — testlar uchun
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

/** Yagona o'qituvchi — Muxlisa. role "admin" = barcha sinflar ochiq. */
const FIXED_TEACHER: TeacherSession = {
  accountId: "muxlisa",
  email: "muxlisa",
  displayName: "Muxlisa",
  role: "admin",
  teacherId: null,
};

function session(): TeacherSession {
  return { ...FIXED_TEACHER };
}

/** Cookie'dagi sessiya o'rniga — doim Muxlisa (login yo'q) */
export async function getTeacherSession(): Promise<TeacherSession> {
  return session();
}

/** Sahifalar uchun — redirect YO'Q, to'g'ridan-to'g'ri ochiladi */
export async function requireTeacher(): Promise<TeacherSession> {
  return session();
}

/** Server amallari uchun — 401 YO'Q */
export async function requireTeacherAction(): Promise<TeacherSession> {
  return session();
}
