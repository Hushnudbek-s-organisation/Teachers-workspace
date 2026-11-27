"use server";

// ============================================================================
// AUTH server amallari — login / logout / birinchi admin yaratish.
// ============================================================================

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createTeacherAccount,
  login,
  logout,
  requireTeacherAction,
  setClassAccess,
} from "@/lib/auth";

export async function actionLogin(
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    return await login(email, password);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Kirishda xatolik." };
  }
}

export async function actionLogout(): Promise<void> {
  await logout();
  redirect("/login");
}

export interface FirstAdminInput {
  email: string;
  password: string;
  displayName: string;
}

/** Birinchi admin hisobini yaratish (faqat HISOBLAR YO'Q bo'lsa ishlaydi) */
export async function actionCreateFirstAdmin(
  input: FirstAdminInput
): Promise<{ ok: boolean; error?: string; role?: string }> {
  try {
    const created = await createTeacherAccount({
      email: input.email,
      password: input.password,
      displayName: input.displayName,
    });
    revalidatePath("/login");
    return { ok: true, role: created.role };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Hisob yaratishda xatolik." };
  }
}

/** Admin: o'qituvchi hisobiga sinf huquqlarini aniq berish */
export async function actionSetClassAccess(
  accountId: string,
  classes: string[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await requireTeacherAction();
    await setClassAccess(accountId, classes, session);
    revalidatePath("/teachers");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Ruxsatlarni saqlashda xatolik." };
  }
}
