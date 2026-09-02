// ============================================================================
// Analytics (Tahlil) — pure functions that mirror the SQL views
// (v_daily_attendance, v_subject_performance, v_class_performance,
//  v_student_overview, v_today_birthdays) so both data sources
// (Supabase rows / demo rows) are aggregated identically.
// ============================================================================

import type {
  AttendanceRecord,
  AttendanceStatus,
  DismissalMethod,
  DismissalRecord,
  GradeRecord,
  Student,
} from "./types";
import { addDays, dayShortLabel, todayStr } from "./utils";

// --------------------------------- shapes ----------------------------------

export interface DayAttendancePoint {
  date: string;
  label: string;
  keldi: number;
  kelmadi: number;
  sababli: number;
  sababsiz: number;
  total: number;
  /** keldi / (jami - sababli) * 100 */
  rate: number | null;
}

export interface SubjectPerformance {
  subject: string;
  average: number;
  count: number;
  highest: number;
  lowest: number;
}

export interface ClassPerformance {
  class_name: string;
  student_count: number;
  average_grade: number | null;
  attendance_rate: number | null;
}

export interface StudentStat {
  student: Student;
  attendance_rate: number | null;
  present_days: number;
  absent_days: number;
  excused_days: number;
  unexcused_days: number;
  total_days: number;
  average_grade: number | null;
  grade_count: number;
}

export interface MonthlyAttendance {
  month: string; // YYYY-MM
  total: number;
  keldi: number;
  rate: number | null;
}

// ------------------------------ attendance ---------------------------------

function rateOf(present: number, counted: number): number | null {
  return counted === 0 ? null : Math.round((present / counted) * 1000) / 10;
}

/** Daily attendance counts for the trailing `days` days (like v_daily_attendance). */
export function dailyAttendance(
  records: AttendanceRecord[],
  days = 7,
  today = todayStr()
): DayAttendancePoint[] {
  const from = addDays(today, -(days - 1));
  const byDate = new Map<string, Record<AttendanceStatus, number> & { total: number }>();
  for (const rec of records) {
    if (rec.date < from || rec.date > today) continue;
    let row = byDate.get(rec.date);
    if (!row) {
      row = { keldi: 0, kelmadi: 0, sababli: 0, sababsiz: 0, total: 0 };
      byDate.set(rec.date, row);
    }
    row[rec.status] += 1;
    row.total += 1;
  }
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, row]) => ({
      date,
      label: dayShortLabel(date),
      keldi: row.keldi,
      kelmadi: row.kelmadi,
      sababli: row.sababli,
      sababsiz: row.sababsiz,
      total: row.total,
      rate: rateOf(row.keldi, row.kelmadi + row.sababsiz + row.keldi),
    }));
}

/** Attendance rate for a single day (null when nothing recorded). */
export function attendanceRateOn(records: AttendanceRecord[], date: string): number | null {
  const day = records.filter((r) => r.date === date);
  const present = day.filter((r) => r.status === "keldi").length;
  const counted = day.filter((r) => r.status !== "sababli").length;
  return rateOf(present, counted);
}

/** Monthly rollup (like v_monthly_attendance). */
export function monthlyAttendance(records: AttendanceRecord[]): MonthlyAttendance[] {
  const byMonth = new Map<string, { total: number; keldi: number }>();
  for (const rec of records) {
    const m = rec.date.slice(0, 7);
    const row = byMonth.get(m) ?? { total: 0, keldi: 0 };
    row.total += 1;
    if (rec.status === "keldi") row.keldi += 1;
    byMonth.set(m, row);
  }
  return [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, row]) => ({ month, total: row.total, keldi: row.keldi, rate: rateOf(row.keldi, row.total) }));
}

// --------------------------------- grades ----------------------------------

export function subjectPerformance(grades: GradeRecord[]): SubjectPerformance[] {
  const bySubject = new Map<string, number[]>();
  for (const g of grades) {
    const arr = bySubject.get(g.subject) ?? [];
    arr.push(g.grade);
    bySubject.set(g.subject, arr);
  }
  return [...bySubject.entries()]
    .map(([subject, arr]) => ({
      subject,
      average: Math.round((arr.reduce((s, x) => s + x, 0) / arr.length) * 10) / 10,
      count: arr.length,
      highest: Math.max(...arr),
      lowest: Math.min(...arr),
    }))
    .sort((a, b) => b.average - a.average);
}

export function averageGrade(grades: GradeRecord[]): number | null {
  if (grades.length === 0) return null;
  return Math.round((grades.reduce((s, g) => s + g.grade, 0) / grades.length) * 10) / 10;
}

// ---------------------------- cross-entity stats ----------------------------

export function classPerformance(
  students: Student[],
  grades: GradeRecord[],
  attendance: AttendanceRecord[]
): ClassPerformance[] {
  const classes = [...new Set(students.map((s) => s.class_name))].sort();
  return classes.map((class_name) => {
    const ids = new Set(students.filter((s) => s.class_name === class_name).map((s) => s.id));
    const classGrades = grades.filter((g) => ids.has(g.student_id));
    const classAtt = attendance.filter((a) => ids.has(a.student_id));
    const present = classAtt.filter((a) => a.status === "keldi").length;
    const counted = classAtt.filter((a) => a.status !== "sababli").length;
    return {
      class_name,
      student_count: ids.size,
      average_grade: averageGrade(classGrades),
      attendance_rate: rateOf(present, counted),
    };
  });
}

export function studentStats(
  students: Student[],
  attendance: AttendanceRecord[],
  grades: GradeRecord[]
): StudentStat[] {
  return students.map((student) => {
    const att = attendance.filter((a) => a.student_id === student.id);
    const gr = grades.filter((g) => g.student_id === student.id);
    const present = att.filter((a) => a.status === "keldi").length;
    const counted = att.filter((a) => a.status !== "sababli").length;
    return {
      student,
      attendance_rate: rateOf(present, counted),
      present_days: present,
      absent_days: att.filter((a) => a.status === "kelmadi").length,
      excused_days: att.filter((a) => a.status === "sababli").length,
      unexcused_days: att.filter((a) => a.status === "sababsiz").length,
      total_days: att.length,
      average_grade: averageGrade(gr),
      grade_count: gr.length,
    };
  });
}

// ------------------------------- dismissal ---------------------------------

export function dismissalBreakdown(
  records: DismissalRecord[],
  date: string
): Array<{ method: DismissalMethod; count: number }> {
  const day = records.filter((r) => r.date === date);
  return (["olib_ketishdi", "ozi_ketdi", "avtobusda"] as DismissalMethod[]).map((method) => ({
    method,
    count: day.filter((r) => r.method === method).length,
  }));
}

/** The latest date that actually has dismissal records (today may be empty). */
export function latestDismissalDate(records: DismissalRecord[]): string | null {
  let max: string | null = null;
  for (const r of records) if (!max || r.date > max) max = r.date;
  return max;
}

// ------------------------------- birthdays ---------------------------------

export function birthdaysToday(students: Student[], today = todayStr()): Student[] {
  const [, tm, td] = today.split("-").map(Number);
  return students.filter((s) => {
    const [, bm, bd] = s.date_of_birth.split("-").map(Number);
    return bm === tm && bd === td;
  });
}

export function upcomingBirthdays(
  students: Student[],
  withinDays = 7,
  today = todayStr()
): Array<{ student: Student; daysLeft: number }> {
  const [ty, tm, td] = today.split("-").map(Number);
  return students
    .map((student) => {
      const [, bm, bd] = student.date_of_birth.split("-").map(Number);
      let next = Date.UTC(ty, bm - 1, bd);
      const now = Date.UTC(ty, tm - 1, td);
      if (next < now) next = Date.UTC(ty + 1, bm - 1, bd);
      return { student, daysLeft: Math.round((next - now) / 86_400_000) };
    })
    .filter((x) => x.daysLeft > 0 && x.daysLeft <= withinDays)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}
