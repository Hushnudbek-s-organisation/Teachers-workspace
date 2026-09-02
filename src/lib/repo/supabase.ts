// ============================================================================
// Supabase repository — real database implementation (server-side only).
// Active when NEXT_PUBLIC_SUPABASE_URL + a key are configured in .env.local.
//
// Tables/views/columns must match supabase/schema.sql exactly.
// ============================================================================

import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AttendanceRecord,
  AttendanceStatus,
  DismissalMethod,
  DismissalRecord,
  GradeInput,
  GradeRecord,
  Parent,
  ParentInput,
  Repository,
  ScheduleInput,
  ScheduleItem,
  Student,
  StudentInput,
  Teacher,
  TeacherInput,
} from "../types";

let cached: SupabaseClient | null = null;

function client(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase sozlanmagan: .env.local faylida NEXT_PUBLIC_SUPABASE_URL va kalitlarni to'ldiring."
    );
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

/** Postgres `time` comes back as HH:MM:SS — normalise to HH:MM. */
function hhmm(t: string): string {
  return (t ?? "").slice(0, 5);
}

/** Postgres `date` may come back as a full timestamp in some drivers. */
function dateOnly(d: string): string {
  return (d ?? "").slice(0, 10);
}

async function assertOk(result: { error: unknown }): Promise<void> {
  const error = result.error as { message?: string } | null;
  if (error) throw new Error(error.message ?? "Supabase xatosi");
}

export const supabaseRepository: Repository = {
  mode: "supabase" as const,

  // ------------------------------ students ------------------------------
  async listStudents() {
    const { data, error } = await client()
      .from("students")
      .select("id, full_name, date_of_birth, class_name, phone, notes")
      .order("full_name");
    await assertOk({ error });
    return (data ?? []).map((s: Omit<Student, "date_of_birth"> & { date_of_birth: string }) => ({
      ...s,
      date_of_birth: dateOnly(s.date_of_birth),
    }));
  },
  async createStudent(input: StudentInput) {
    const { error } = await client().from("students").insert(input);
    await assertOk({ error });
  },
  async updateStudent(id, input) {
    const { error } = await client().from("students").update(input).eq("id", id);
    await assertOk({ error });
  },
  async deleteStudent(id) {
    const { error } = await client().from("students").delete().eq("id", id);
    await assertOk({ error });
  },

  // ------------------------------- parents ------------------------------
  async listParents() {
    const { data, error } = await client()
      .from("parents")
      .select("id, full_name, phone, student_id, contract_number, contract_date, home_address")
      .order("full_name");
    await assertOk({ error });
    return (data ?? []).map((p: Parent & { contract_date?: string | null }) => ({
      ...p,
      contract_date: p.contract_date ? dateOnly(p.contract_date) : null,
    }));
  },
  async createParent(input: ParentInput) {
    const { error } = await client().from("parents").insert(input);
    await assertOk({ error });
  },
  async updateParent(id, input) {
    const { error } = await client().from("parents").update(input).eq("id", id);
    await assertOk({ error });
  },
  async deleteParent(id) {
    const { error } = await client().from("parents").delete().eq("id", id);
    await assertOk({ error });
  },

  // ------------------------------ teachers ------------------------------
  async listTeachers() {
    const { data, error } = await client()
      .from("teachers")
      .select("id, full_name, phone, subject")
      .order("full_name");
    await assertOk({ error });
    return data ?? [];
  },
  async createTeacher(input: TeacherInput) {
    const { error } = await client().from("teachers").insert(input);
    await assertOk({ error });
  },
  async updateTeacher(id, input) {
    const { error } = await client().from("teachers").update(input).eq("id", id);
    await assertOk({ error });
  },
  async deleteTeacher(id) {
    const { error } = await client().from("teachers").delete().eq("id", id);
    await assertOk({ error });
  },

  // ------------------------------ schedule ------------------------------
  async listSchedules() {
    const { data, error } = await client()
      .from("schedules")
      .select("id, class_name, subject, teacher_id, day_of_week, start_time, end_time, room")
      .order("day_of_week")
      .order("start_time");
    await assertOk({ error });
    return (data ?? []).map((s: ScheduleItem) => ({
      ...s,
      start_time: hhmm(s.start_time),
      end_time: hhmm(s.end_time),
    }));
  },
  async createSchedule(input: ScheduleInput) {
    const { error } = await client().from("schedules").insert(input);
    await assertOk({ error });
  },
  async updateSchedule(id, input) {
    const { error } = await client().from("schedules").update(input).eq("id", id);
    await assertOk({ error });
  },
  async deleteSchedule(id) {
    const { error } = await client().from("schedules").delete().eq("id", id);
    await assertOk({ error });
  },

  // ----------------------------- attendance -----------------------------
  async listAttendance(since) {
    let q = client()
      .from("attendance")
      .select("id, student_id, date, status, note")
      .order("date");
    if (since) q = q.gte("date", since);
    const { data, error } = await q;
    await assertOk({ error });
    return (data ?? []).map((a: AttendanceRecord) => ({ ...a, date: dateOnly(a.date) }));
  },
  async setAttendance(studentId, date, status: AttendanceStatus, note = null) {
    // unique(student_id, date) -> upsert (schema.sql)
    const { error } = await client()
      .from("attendance")
      .upsert(
        { student_id: studentId, date, status, note },
        { onConflict: "student_id,date" }
      );
    await assertOk({ error });
  },

  // ----------------------------- dismissal ------------------------------
  async listDismissals(since) {
    let q = client()
      .from("dismissal")
      .select("id, student_id, date, method, note")
      .order("date");
    if (since) q = q.gte("date", since);
    const { data, error } = await q;
    await assertOk({ error });
    return (data ?? []).map((x: DismissalRecord) => ({ ...x, date: dateOnly(x.date) }));
  },
  async setDismissal(studentId, date, method: DismissalMethod, note = null) {
    const { error } = await client()
      .from("dismissal")
      .upsert(
        { student_id: studentId, date, method, note },
        { onConflict: "student_id,date" }
      );
    await assertOk({ error });
  },

  // ------------------------------- grades -------------------------------
  async listGrades(since) {
    let q = client()
      .from("grades")
      .select("id, student_id, subject, grade, date, teacher_id")
      .order("date");
    if (since) q = q.gte("date", since);
    const { data, error } = await q;
    await assertOk({ error });
    return (data ?? []).map((gr: GradeRecord) => ({
      ...gr,
      grade: Number(gr.grade),
      date: dateOnly(gr.date),
    }));
  },
  async createGrade(input: GradeInput) {
    const { error } = await client().from("grades").insert(input);
    await assertOk({ error });
  },
  async deleteGrade(id) {
    const { error } = await client().from("grades").delete().eq("id", id);
    await assertOk({ error });
  },
};
