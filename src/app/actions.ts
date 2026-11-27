"use server";

// ============================================================================
// Server Actions — the single mutation surface for the whole UI.
// Every action validates its input, delegates to the repository and
// revalidates the affected pages.
//
// XAVFSIZLIK: har bir o'zgartiruvchi amal SERVERDA sessiyani tekshiradi
// (requireTeacherAction) va sinf bo'yicha huquqni (canAccessStudent).
// ============================================================================

import { revalidatePath } from "next/cache";
import { repo } from "@/lib/repo";
import {
  allowedClasses,
  canAccessStudent,
  requireTeacherAction,
  type TeacherSession,
} from "@/lib/auth";
import { issueStudentLink, revokeStudentLink } from "@/lib/portal/store";
import { getBaseUrl } from "@/lib/base-url";
import type {
  AttendanceStatus,
  DismissalMethod,
  GradeInput,
  ParentInput,
  ScheduleInput,
  Student,
  StudentInput,
  TeacherInput,
} from "@/lib/types";

const PAGES = ["/", "/students", "/parents", "/teachers", "/schedule", "/daily", "/analytics"];

function refresh() {
  for (const p of PAGES) revalidatePath(p);
}

function req<T>(value: T, field: string): NonNullable<T> {
  if (value === undefined || value === null || value === "") {
    throw new Error(`"${field}" maydoni to'ldirilishi shart`);
  }
  return value as NonNullable<T>;
}

function str(formValue: FormDataEntryValue | null): string {
  return typeof formValue === "string" ? formValue.trim() : "";
}

function nullable(formValue: FormDataEntryValue | null): string | null {
  const v = str(formValue);
  return v === "" ? null : v;
}

/** Sessiya + sinf huquqi tekshiruvi (yozuv sinfi ma'lum bo'lsa) */
async function requireAccessFor(studentClass?: string | null): Promise<TeacherSession> {
  const session = await requireTeacherAction();
  if (studentClass) {
    const ok = await canAccessStudent(session, studentClass);
    if (!ok) throw new Error("Bu o'quvchiga kirish huquqingiz yo'q (sinf bo'yicha cheklov).");
  }
  return session;
}

// --------------------------------- Students --------------------------------

export async function saveStudent(formData: FormData): Promise<{ linkUrl: string | null }> {
  await requireTeacherAction();
  const input: StudentInput = {
    full_name: req(str(formData.get("full_name")), "F.I.Sh"),
    date_of_birth: req(str(formData.get("date_of_birth")), "Tug'ilgan sana"),
    class_name: req(str(formData.get("class_name")), "Sinf"),
    phone: nullable(formData.get("phone")),
    notes: nullable(formData.get("notes")),
  };
  const id = str(formData.get("id"));
  if (id) {
    await requireAccessFor(input.class_name);
    await repo.updateStudent(id, input);
    refresh();
    return { linkUrl: null };
  }

  await repo.createStudent(input);
  refresh();

  // Yangi o'quvchiga darhol shaxsiy link beramiz — muvaffaqiyat oynasida
  // "O'quvchi linkini nusxalash" tugmasi chiqadi. Eski yozuvlar QAYTA
  // YOZILMAYDI: link alohida student_links jadvalida (faqat token xeshi).
  try {
    const students = await repo.listStudents();
    const created = students.find(
      (s) => s.full_name === input.full_name && s.class_name === input.class_name && s.date_of_birth === input.date_of_birth
    );
    if (created) {
      const baseUrl = await getBaseUrl();
      const link = await issueStudentLink(created.id, baseUrl);
      return { linkUrl: link.url };
    }
  } catch {
    // Link yaratishda xato — o'quvchi baribir saqlandi; link keyinroq
    // ro'yxatdan "Yangilash" bilan beriladi
  }
  return { linkUrl: null };
}

export async function deleteStudent(id: string): Promise<void> {
  const session = await requireTeacherAction();
  const student = await findStudent(id);
  if (student && !(await canAccessStudent(session, student.class_name))) {
    throw new Error("Bu o'quvchiga kirish huquqingiz yo'q.");
  }
  await repo.deleteStudent(id); // student_links cascade bilan o'chadi
  refresh();
}

async function findStudent(id: string): Promise<Student | null> {
  const students = await repo.listStudents();
  return students.find((s) => s.id === id) ?? null;
}

// ------------------------- O'quvchi linklarini boshqarish -------------------
// Bazada FAQAT tokenning SHA-256 xeshi saqlanadi. Link URL'i faqat yangi
// token berilganda (issue/rotate) bir marta qaytariladi — keyin ko'rsatib
// bo'lmaydi, shuning uchun "Nusxalash" o'sha paytda ishlaydi.

export async function actionIssueStudentLink(
  studentId: string
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const student = await findStudent(studentId);
    if (!student) throw new Error("O'quvchi topilmadi.");
    await requireAccessFor(student.class_name);
    const baseUrl = await getBaseUrl();
    const link = await issueStudentLink(studentId, baseUrl);
    revalidatePath("/students");
    return { ok: true, url: link.url };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Linkni berishda xatolik." };
  }
}

export async function actionRotateStudentLink(
  studentId: string
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const student = await findStudent(studentId);
    if (!student) throw new Error("O'quvchi topilmadi.");
    await requireAccessFor(student.class_name);
    const baseUrl = await getBaseUrl();
    // Yangilash = eski token o'lgan + yangi token bir marta ko'rsatiladi
    const link = await issueStudentLink(studentId, baseUrl);
    revalidatePath("/students");
    return { ok: true, url: link.url };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Linkni yangilashda xatolik." };
  }
}

export async function actionRevokeStudentLink(
  studentId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const student = await findStudent(studentId);
    if (!student) throw new Error("O'quvchi topilmadi.");
    await requireAccessFor(student.class_name);
    await revokeStudentLink(studentId);
    revalidatePath("/students");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Linkni bekor qilishda xatolik." };
  }
}

/** Sessiyada ko'rishga ruxsat etilgan sinflar (filtr uchun); null = hamma */
export async function actionAllowedClasses(): Promise<string[] | null> {
  const session = await requireTeacherAction();
  return allowedClasses(session);
}

// ---------------------------------- Parents ---------------------------------

export async function saveParent(formData: FormData): Promise<void> {
  await requireTeacherAction();
  const input: ParentInput = {
    full_name: req(str(formData.get("full_name")), "F.I.Sh"),
    phone: str(formData.get("phone")),
    student_id: nullable(formData.get("student_id")),
    contract_number: nullable(formData.get("contract_number")),
    contract_date: nullable(formData.get("contract_date")),
    home_address: str(formData.get("home_address")),
  };
  const id = str(formData.get("id"));
  if (id) await repo.updateParent(id, input);
  else await repo.createParent(input);
  refresh();
}

export async function deleteParent(id: string): Promise<void> {
  await requireTeacherAction();
  await repo.deleteParent(id);
  refresh();
}

// --------------------------------- Teachers ---------------------------------

export async function saveTeacher(formData: FormData): Promise<void> {
  await requireTeacherAction();
  const input: TeacherInput = {
    full_name: req(str(formData.get("full_name")), "F.I.Sh"),
    phone: req(str(formData.get("phone")), "Telefon"),
    subject: str(formData.get("subject")),
  };
  const id = str(formData.get("id"));
  if (id) await repo.updateTeacher(id, input);
  else await repo.createTeacher(input);
  refresh();
}

export async function deleteTeacher(id: string): Promise<void> {
  const session = await requireTeacherAction();
  if (session.role !== "admin") {
    throw new Error("Faqat administrator o'qituvchilarni o'chiradi.");
  }
  await repo.deleteTeacher(id);
  refresh();
}

// --------------------------------- Schedule ---------------------------------

export async function saveSchedule(formData: FormData): Promise<void> {
  await requireTeacherAction();
  const input: ScheduleInput = {
    class_name: req(str(formData.get("class_name")), "Sinf"),
    subject: req(str(formData.get("subject")), "Fan"),
    teacher_id: req(str(formData.get("teacher_id")), "O'qituvchi"),
    day_of_week: Number(req(str(formData.get("day_of_week")), "Kun")),
    start_time: req(str(formData.get("start_time")), "Boshlanish vaqti"),
    end_time: req(str(formData.get("end_time")), "Tugash vaqti"),
    room: nullable(formData.get("room")),
  };
  const id = str(formData.get("id"));
  if (id) await repo.updateSchedule(id, input);
  else await repo.createSchedule(input);
  refresh();
}

export async function deleteSchedule(id: string): Promise<void> {
  await requireTeacherAction();
  await repo.deleteSchedule(id);
  refresh();
}

// ------------------------------ Daily records -------------------------------

export async function markAttendance(
  studentId: string,
  date: string,
  status: AttendanceStatus
): Promise<void> {
  const session = await requireTeacherAction();
  const student = await findStudent(studentId);
  if (student && !(await canAccessStudent(session, student.class_name))) {
    throw new Error("Bu o'quvchiga kirish huquqingiz yo'q.");
  }
  await repo.setAttendance(studentId, date, status);
  refresh();
}

export async function markDismissal(
  studentId: string,
  date: string,
  method: DismissalMethod
): Promise<void> {
  const session = await requireTeacherAction();
  const student = await findStudent(studentId);
  if (student && !(await canAccessStudent(session, student.class_name))) {
    throw new Error("Bu o'quvchiga kirish huquqingiz yo'q.");
  }
  await repo.setDismissal(studentId, date, method);
  refresh();
}

export async function saveGrade(formData: FormData): Promise<void> {
  await requireTeacherAction();
  const input: GradeInput = {
    student_id: req(str(formData.get("student_id")), "O'quvchi"),
    subject: req(str(formData.get("subject")), "Fan"),
    grade: Number(req(str(formData.get("grade")), "Baho")),
    date: req(str(formData.get("date")), "Sana"),
  };
  if (!Number.isFinite(input.grade) || input.grade < 0 || input.grade > 100) {
    throw new Error("Baho 0 dan 100 gacha bo'lishi kerak");
  }
  await repo.createGrade(input);
  refresh();
}

export async function deleteGrade(id: string): Promise<void> {
  await requireTeacherAction();
  await repo.deleteGrade(id);
  refresh();
}
