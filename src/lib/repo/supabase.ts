// ============================================================================
// Supabase repository — real database implementation (server-side only).
// Active when NEXT_PUBLIC_SUPABASE_URL + a key are configured in .env.local.
//
// Tables/views/columns must match supabase/schema.sql exactly.
//
// Xatoga chidamlilik (src/lib/db-status.ts):
//   • list* (o'qish)  → xato bo'lsa bo'sh ro'yxat + DbAlert ogohlantirishi
//   • create/update/delete → tushunarli xato matni bilan chiqadi
// So'rovlar supabaseFetch orqali yuboriladi (10 s taymer + sababli xabar).
// ============================================================================

import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { guardWrite, safeRead } from "../db-status";
import { supabaseFetch } from "../supabase-fetch";
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
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  ).trim();
  if (!url || !key) {
    throw new Error(
      "Supabase sozlanmagan: .env.local faylida NEXT_PUBLIC_SUPABASE_URL va kalitlarni to'ldiring."
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: supabaseFetch },
  });
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
    return safeRead("listStudents", async () => {
      const { data, error } = await client()
        .from("students")
        .select("id, full_name, date_of_birth, class_name, phone, notes")
        .order("full_name");
      await assertOk({ error });
      return (data ?? []).map((s: Omit<Student, "date_of_birth"> & { date_of_birth: string }) => ({
        ...s,
        date_of_birth: dateOnly(s.date_of_birth),
      }));
    });
  },
  async createStudent(input: StudentInput) {
    await guardWrite("createStudent", async () => {
      const { error } = await client().from("students").insert(input);
      await assertOk({ error });
    });
  },
  async updateStudent(id, input) {
    await guardWrite("updateStudent", async () => {
      const { error } = await client().from("students").update(input).eq("id", id);
      await assertOk({ error });
    });
  },
  async deleteStudent(id) {
    await guardWrite("deleteStudent", async () => {
      const { error } = await client().from("students").delete().eq("id", id);
      await assertOk({ error });
    });
  },

  // ------------------------------- parents ------------------------------
  async listParents() {
    return safeRead("listParents", async () => {
      const { data, error } = await client()
        .from("parents")
        .select("id, full_name, phone, student_id, contract_number, contract_date, home_address")
        .order("full_name");
      await assertOk({ error });
      return (data ?? []).map((p: Parent & { contract_date?: string | null }) => ({
        ...p,
        contract_date: p.contract_date ? dateOnly(p.contract_date) : null,
      }));
    });
  },
  async createParent(input: ParentInput) {
    await guardWrite("createParent", async () => {
      const { error } = await client().from("parents").insert(input);
      await assertOk({ error });
    });
  },
  async updateParent(id, input) {
    await guardWrite("updateParent", async () => {
      const { error } = await client().from("parents").update(input).eq("id", id);
      await assertOk({ error });
    });
  },
  async deleteParent(id) {
    await guardWrite("deleteParent", async () => {
      const { error } = await client().from("parents").delete().eq("id", id);
      await assertOk({ error });
    });
  },

  // ------------------------------ teachers ------------------------------
  async listTeachers() {
    return safeRead("listTeachers", async () => {
      const { data, error } = await client()
        .from("teachers")
        .select("id, full_name, phone, subject")
        .order("full_name");
      await assertOk({ error });
      return (data ?? []) as Teacher[];
    });
  },
  async createTeacher(input: TeacherInput) {
    await guardWrite("createTeacher", async () => {
      const { error } = await client().from("teachers").insert(input);
      await assertOk({ error });
    });
  },
  async updateTeacher(id, input) {
    await guardWrite("updateTeacher", async () => {
      const { error } = await client().from("teachers").update(input).eq("id", id);
      await assertOk({ error });
    });
  },
  async deleteTeacher(id) {
    await guardWrite("deleteTeacher", async () => {
      const { error } = await client().from("teachers").delete().eq("id", id);
      await assertOk({ error });
    });
  },

  // ------------------------------ schedule ------------------------------
  async listSchedules() {
    return safeRead("listSchedules", async () => {
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
    });
  },
  async createSchedule(input: ScheduleInput) {
    await guardWrite("createSchedule", async () => {
      const { error } = await client().from("schedules").insert(input);
      await assertOk({ error });
    });
  },
  async updateSchedule(id, input) {
    await guardWrite("updateSchedule", async () => {
      const { error } = await client().from("schedules").update(input).eq("id", id);
      await assertOk({ error });
    });
  },
  async deleteSchedule(id) {
    await guardWrite("deleteSchedule", async () => {
      const { error } = await client().from("schedules").delete().eq("id", id);
      await assertOk({ error });
    });
  },

  // ----------------------------- attendance -----------------------------
  async listAttendance(since) {
    return safeRead("listAttendance", async () => {
      let q = client()
        .from("attendance")
        .select("id, student_id, date, status, note")
        .order("date");
      if (since) q = q.gte("date", since);
      const { data, error } = await q;
      await assertOk({ error });
      return (data ?? []).map((a: AttendanceRecord) => ({ ...a, date: dateOnly(a.date) }));
    });
  },
  async setAttendance(studentId, date, status: AttendanceStatus, note = null) {
    // unique(student_id, date) -> upsert (schema.sql)
    await guardWrite("setAttendance", async () => {
      const { error } = await client()
        .from("attendance")
        .upsert({ student_id: studentId, date, status, note }, { onConflict: "student_id,date" });
      await assertOk({ error });
    });
  },

  // ----------------------------- dismissal ------------------------------
  async listDismissals(since) {
    return safeRead("listDismissals", async () => {
      let q = client()
        .from("dismissal")
        .select("id, student_id, date, method, note")
        .order("date");
      if (since) q = q.gte("date", since);
      const { data, error } = await q;
      await assertOk({ error });
      return (data ?? []).map((x: DismissalRecord) => ({ ...x, date: dateOnly(x.date) }));
    });
  },
  async setDismissal(studentId, date, method: DismissalMethod, note = null) {
    await guardWrite("setDismissal", async () => {
      const { error } = await client()
        .from("dismissal")
        .upsert({ student_id: studentId, date, method, note }, { onConflict: "student_id,date" });
      await assertOk({ error });
    });
  },

  // ------------------------------- grades -------------------------------
  async listGrades(since) {
    return safeRead("listGrades", async () => {
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
    });
  },
  async createGrade(input: GradeInput) {
    await guardWrite("createGrade", async () => {
      const { error } = await client().from("grades").insert(input);
      await assertOk({ error });
    });
  },
  async deleteGrade(id) {
    await guardWrite("deleteGrade", async () => {
      const { error } = await client().from("grades").delete().eq("id", id);
      await assertOk({ error });
    });
  },
};
