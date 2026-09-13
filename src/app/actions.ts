"use server";

// ============================================================================
// Server Actions — the single mutation surface for the whole UI.
// Every action validates its input, delegates to the repository and
// revalidates the affected pages.
//
// MUHIM: hech bir action throw qilmaydi — har biri safeAction() orqali
// ActionResult qaytaradi (src/lib/action-result.ts). Kalit noto'g'ri bo'lsa
// ham Next.js 500 qaytarmaydi; client komponent xabarni qizil matn ko'rsatadi.
//   • Validatsiya xatosi → ValidationError → { ok: false, error }
//   • Baza xatosi        → { ok: false, error, hint }
// ============================================================================

import { revalidatePath } from "next/cache";
import { repo } from "@/lib/repo";
import { safeAction, ValidationError, type ActionResult } from "@/lib/action-result";
import type {
  AttendanceStatus,
  DismissalMethod,
  GradeInput,
  ParentInput,
  ScheduleInput,
  StudentInput,
  TeacherInput,
} from "@/lib/types";

const PAGES = ["/", "/students", "/parents", "/teachers", "/schedule", "/daily", "/analytics"];

function refresh() {
  for (const p of PAGES) revalidatePath(p);
}

function req<T>(value: T, field: string): NonNullable<T> {
  if (value === undefined || value === null || value === "") {
    throw new ValidationError(`"${field}" maydoni to'ldirilishi shart`);
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

// --------------------------------- Students --------------------------------

export async function saveStudent(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const input: StudentInput = {
      full_name: req(str(formData.get("full_name")), "F.I.Sh"),
      date_of_birth: req(str(formData.get("date_of_birth")), "Tug'ilgan sana"),
      class_name: req(str(formData.get("class_name")), "Sinf"),
      phone: nullable(formData.get("phone")),
      notes: nullable(formData.get("notes")),
    };
    const id = str(formData.get("id"));
    if (id) await repo.updateStudent(id, input);
    else await repo.createStudent(input);
    refresh();
  }, "saveStudent");
}

export async function deleteStudent(id: string): Promise<ActionResult> {
  return safeAction(async () => {
    await repo.deleteStudent(id);
    refresh();
  }, "deleteStudent");
}

// ---------------------------------- Parents ---------------------------------

export async function saveParent(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
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
  }, "saveParent");
}

export async function deleteParent(id: string): Promise<ActionResult> {
  return safeAction(async () => {
    await repo.deleteParent(id);
    refresh();
  }, "deleteParent");
}

// --------------------------------- Teachers ---------------------------------

export async function saveTeacher(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const input: TeacherInput = {
      full_name: req(str(formData.get("full_name")), "F.I.Sh"),
      phone: req(str(formData.get("phone")), "Telefon"),
      subject: str(formData.get("subject")),
    };
    const id = str(formData.get("id"));
    if (id) await repo.updateTeacher(id, input);
    else await repo.createTeacher(input);
    refresh();
  }, "saveTeacher");
}

export async function deleteTeacher(id: string): Promise<ActionResult> {
  return safeAction(async () => {
    await repo.deleteTeacher(id);
    refresh();
  }, "deleteTeacher");
}

// --------------------------------- Schedule ---------------------------------

export async function saveSchedule(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
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
  }, "saveSchedule");
}

export async function deleteSchedule(id: string): Promise<ActionResult> {
  return safeAction(async () => {
    await repo.deleteSchedule(id);
    refresh();
  }, "deleteSchedule");
}

// ------------------------------ Daily records -------------------------------

export async function markAttendance(
  studentId: string,
  date: string,
  status: AttendanceStatus
): Promise<ActionResult> {
  return safeAction(async () => {
    await repo.setAttendance(studentId, date, status);
    refresh();
  }, "markAttendance");
}

export async function markDismissal(
  studentId: string,
  date: string,
  method: DismissalMethod
): Promise<ActionResult> {
  return safeAction(async () => {
    await repo.setDismissal(studentId, date, method);
    refresh();
  }, "markDismissal");
}

export async function saveGrade(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const input: GradeInput = {
      student_id: req(str(formData.get("student_id")), "O'quvchi"),
      subject: req(str(formData.get("subject")), "Fan"),
      grade: Number(req(str(formData.get("grade")), "Baho")),
      date: req(str(formData.get("date")), "Sana"),
    };
    if (!Number.isFinite(input.grade) || input.grade < 0 || input.grade > 100) {
      throw new ValidationError("Baho 0 dan 100 gacha bo'lishi kerak");
    }
    await repo.createGrade(input);
    refresh();
  }, "saveGrade");
}

export async function deleteGrade(id: string): Promise<ActionResult> {
  return safeAction(async () => {
    await repo.deleteGrade(id);
    refresh();
  }, "deleteGrade");
}
