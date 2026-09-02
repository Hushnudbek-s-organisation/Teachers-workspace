// ============================================================================
// Demo repository — full in-memory CRUD used when Supabase env vars are
// absent. State lives on globalThis so it survives dev-server hot reloads.
// Mirrors the SQL schema's ON DELETE CASCADE behaviour manually.
// ============================================================================

import { seedDemoDb, type DemoDb } from "../demo-data";
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

const g = globalThis as unknown as { __teachersWorkspaceDemoDb?: DemoDb };

function db(): DemoDb {
  if (!g.__teachersWorkspaceDemoDb) g.__teachersWorkspaceDemoDb = seedDemoDb();
  return g.__teachersWorkspaceDemoDb;
}

function uid(): string {
  return "demo-" + Math.random().toString(36).slice(2, 10);
}

/** Simulate a bit of latency so pending states are visible (feels real). */
const delay = () => new Promise((res) => setTimeout(res, 60));

function sortByName<T extends { full_name: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => a.full_name.localeCompare(b.full_name, "uz"));
}

export const demoRepository: Repository = {
  mode: "demo" as const,

  // ------------------------------ students ------------------------------
  async listStudents() {
    await delay();
    return sortByName(db().students);
  },
  async createStudent(input: StudentInput) {
    await delay();
    const s: Student = { id: uid(), phone: null, notes: null, ...input };
    db().students.push(s);
  },
  async updateStudent(id, input) {
    await delay();
    db().students = db().students.map((s) => (s.id === id ? { ...s, ...input } : s));
  },
  async deleteStudent(id) {
    await delay();
    const d = db();
    d.students = d.students.filter((s) => s.id !== id);
    // ON DELETE CASCADE (schema.sql dagi kabi):
    d.parents = d.parents.filter((p) => p.student_id !== id);
    d.attendance = d.attendance.filter((a) => a.student_id !== id);
    d.dismissal = d.dismissal.filter((x) => x.student_id !== id);
    d.grades = d.grades.filter((gr) => gr.student_id !== id);
  },

  // ------------------------------- parents ------------------------------
  async listParents() {
    await delay();
    return sortByName(db().parents);
  },
  async createParent(input: ParentInput) {
    await delay();
    const p: Parent = {
      id: uid(),
      full_name: input.full_name,
      phone: input.phone,
      student_id: input.student_id ?? null,
      contract_number: input.contract_number ?? null,
      contract_date: input.contract_date ?? null,
      home_address: input.home_address,
    };
    db().parents.push(p);
  },
  async updateParent(id, input) {
    await delay();
    db().parents = db().parents.map((p) => (p.id === id ? { ...p, ...input } : p));
  },
  async deleteParent(id) {
    await delay();
    db().parents = db().parents.filter((p) => p.id !== id);
  },

  // ------------------------------ teachers ------------------------------
  async listTeachers() {
    await delay();
    return sortByName(db().teachers);
  },
  async createTeacher(input: TeacherInput) {
    await delay();
    const t: Teacher = { id: uid(), ...input };
    db().teachers.push(t);
  },
  async updateTeacher(id, input) {
    await delay();
    db().teachers = db().teachers.map((t) => (t.id === id ? { ...t, ...input } : t));
  },
  async deleteTeacher(id) {
    await delay();
    const d = db();
    d.teachers = d.teachers.filter((t) => t.id !== id);
    // schedules.teacher_id -> ON DELETE CASCADE
    d.schedules = d.schedules.filter((s) => s.teacher_id !== id);
    // grades.teacher_id -> ON DELETE SET NULL
    d.grades = d.grades.map((gr) => (gr.teacher_id === id ? { ...gr, teacher_id: null } : gr));
  },

  // ------------------------------ schedule ------------------------------
  async listSchedules() {
    await delay();
    return [...db().schedules].sort(
      (a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)
    );
  },
  async createSchedule(input: ScheduleInput) {
    await delay();
    const s: ScheduleItem = { id: uid(), room: null, ...input };
    db().schedules.push(s);
  },
  async updateSchedule(id, input) {
    await delay();
    db().schedules = db().schedules.map((s) => (s.id === id ? { ...s, ...input } : s));
  },
  async deleteSchedule(id) {
    await delay();
    db().schedules = db().schedules.filter((s) => s.id !== id);
  },

  // ----------------------------- attendance -----------------------------
  async listAttendance(since) {
    await delay();
    const rows = db().attendance;
    return since ? rows.filter((a) => a.date >= since) : [...rows];
  },
  async setAttendance(studentId, date, status, note = null) {
    await delay();
    const d = db();
    const existing = d.attendance.find((a) => a.student_id === studentId && a.date === date);
    if (existing) {
      existing.status = status;
      existing.note = note;
    } else {
      const rec: AttendanceRecord = { id: uid(), student_id: studentId, date, status, note };
      d.attendance.push(rec);
    }
  },

  // ----------------------------- dismissal ------------------------------
  async listDismissals(since) {
    await delay();
    const rows = db().dismissal;
    return since ? rows.filter((x) => x.date >= since) : [...rows];
  },
  async setDismissal(studentId, date, method, note = null) {
    await delay();
    const d = db();
    const existing = d.dismissal.find((x) => x.student_id === studentId && x.date === date);
    if (existing) {
      existing.method = method;
      existing.note = note;
    } else {
      const rec: DismissalRecord = { id: uid(), student_id: studentId, date, method, note };
      d.dismissal.push(rec);
    }
  },

  // ------------------------------- grades -------------------------------
  async listGrades(since) {
    await delay();
    const rows = db().grades;
    return since ? rows.filter((gr) => gr.date >= since) : [...rows];
  },
  async createGrade(input: GradeInput) {
    await delay();
    const rec: GradeRecord = { id: uid(), teacher_id: null, ...input };
    db().grades.push(rec);
  },
  async deleteGrade(id) {
    await delay();
    db().grades = db().grades.filter((gr) => gr.id !== id);
  },
};
