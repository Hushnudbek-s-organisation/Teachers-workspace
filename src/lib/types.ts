// ============================================================================
// Shared domain types — mirror the Supabase schema (supabase/schema.sql)
// ============================================================================

/** Davomat (attendance) — static enum */
export type AttendanceStatus = "keldi" | "kelmadi" | "sababli" | "sababsiz";

/** Uyga ketish usuli (dismissal) — static enum */
export type DismissalMethod = "ozi_ketdi" | "olib_ketishdi" | "avtobusda";

// ----------------------------- Dynamic entities -----------------------------

export interface Teacher {
  id: string;
  full_name: string;
  phone: string;
  subject: string;
}

export interface Student {
  id: string;
  full_name: string;
  /** ISO date: YYYY-MM-DD */
  date_of_birth: string;
  /** e.g. "6-A" */
  class_name: string;
  phone?: string | null;
  notes?: string | null;
}

export interface Parent {
  id: string;
  full_name: string;
  phone: string;
  student_id: string | null;
  contract_number?: string | null;
  /** ISO date: YYYY-MM-DD */
  contract_date?: string | null;
  home_address: string;
}

export interface ScheduleItem {
  id: string;
  /** 1 = Dushanba … 6 = Shanba */
  day_of_week: number;
  /** HH:MM */
  start_time: string;
  /** HH:MM */
  end_time: string;
  subject: string;
  teacher_id: string;
  class_name: string;
  room?: string | null;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  /** ISO date: YYYY-MM-DD */
  date: string;
  status: AttendanceStatus;
  note?: string | null;
}

export interface DismissalRecord {
  id: string;
  student_id: string;
  /** ISO date: YYYY-MM-DD */
  date: string;
  method: DismissalMethod;
  note?: string | null;
}

export interface GradeRecord {
  id: string;
  student_id: string;
  subject: string;
  grade: number;
  /** ISO date: YYYY-MM-DD */
  date: string;
  teacher_id?: string | null;
}

// ------------------------------- Create inputs ------------------------------

export interface StudentInput {
  full_name: string;
  date_of_birth: string;
  class_name: string;
  phone?: string | null;
  notes?: string | null;
}

export interface ParentInput {
  full_name: string;
  phone: string;
  student_id?: string | null;
  contract_number?: string | null;
  contract_date?: string | null;
  home_address: string;
}

export interface TeacherInput {
  full_name: string;
  phone: string;
  subject: string;
}

export interface ScheduleInput {
  class_name: string;
  subject: string;
  teacher_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room?: string | null;
}

export interface GradeInput {
  student_id: string;
  subject: string;
  grade: number;
  date: string;
}

// ------------------------------ Repository API ------------------------------

/**
 * One interface, two implementations:
 *  - SupabaseRepository  -> real database (when env vars are set)
 *  - DemoRepository      -> in-memory demo data (fallback, works offline)
 */
export interface Repository {
  readonly mode: "supabase" | "demo";

  // Students
  listStudents(): Promise<Student[]>;
  createStudent(input: StudentInput): Promise<void>;
  updateStudent(id: string, input: StudentInput): Promise<void>;
  deleteStudent(id: string): Promise<void>;

  // Parents
  listParents(): Promise<Parent[]>;
  createParent(input: ParentInput): Promise<void>;
  updateParent(id: string, input: ParentInput): Promise<void>;
  deleteParent(id: string): Promise<void>;

  // Teachers
  listTeachers(): Promise<Teacher[]>;
  createTeacher(input: TeacherInput): Promise<void>;
  updateTeacher(id: string, input: TeacherInput): Promise<void>;
  deleteTeacher(id: string): Promise<void>;

  // Schedule
  listSchedules(): Promise<ScheduleItem[]>;
  createSchedule(input: ScheduleInput): Promise<void>;
  updateSchedule(id: string, input: ScheduleInput): Promise<void>;
  deleteSchedule(id: string): Promise<void>;

  // Attendance (upsert per student+date)
  listAttendance(since?: string): Promise<AttendanceRecord[]>;
  setAttendance(studentId: string, date: string, status: AttendanceStatus, note?: string | null): Promise<void>;

  // Dismissal (upsert per student+date)
  listDismissals(since?: string): Promise<DismissalRecord[]>;
  setDismissal(studentId: string, date: string, method: DismissalMethod, note?: string | null): Promise<void>;

  // Grades
  listGrades(since?: string): Promise<GradeRecord[]>;
  createGrade(input: GradeInput): Promise<void>;
  deleteGrade(id: string): Promise<void>;
}
