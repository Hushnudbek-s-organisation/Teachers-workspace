// ============================================================================
// Demo data — realistic seeded sample data used when Supabase is not
// configured (Demo rejimi). Deterministic: same seed -> same data.
// ============================================================================

import { addDays, todayStr } from "./utils";
import type {
  AttendanceRecord,
  AttendanceStatus,
  DismissalMethod,
  DismissalRecord,
  GradeRecord,
  Parent,
  ScheduleItem,
  Student,
  Teacher,
} from "./types";

// Deterministic PRNG (mulberry32) so charts look stable between reloads.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(r: () => number, arr: readonly T[]): T {
  return arr[Math.floor(r() * arr.length)]!;
}

function id(n: number): string {
  return `demo-${String(n).padStart(4, "0")}`;
}

export interface DemoDb {
  teachers: Teacher[];
  students: Student[];
  parents: Parent[];
  schedules: ScheduleItem[];
  attendance: AttendanceRecord[];
  dismissal: DismissalRecord[];
  grades: GradeRecord[];
}

const CLASSES = ["5-A", "6-A", "7-A", "8-A"];
const SUBJECTS = ["Matematika", "Ona tili", "Ingliz tili", "Fizika", "Tarix", "Biologiya"];

const STUDENT_NAMES = [
  "Alisher Karimov", "Madina Yusupova", "Bekzod Ismoilov", "Zarina Umarova",
  "Islom Nazarov", "Malika Tursunova", "Ulug'bek Safarov", "Sarvinoz Abdullayeva",
  "Doniyor Xolmatov", "Rayhona Qobilova", "Muhammadali Ergashev", "Sevinch Norova",
  "Temur Jalolov", "Nodira G'ulomova", "Javohir Sultonov", "Mohichehra Anvarova",
];

const PARENT_NAMES = [
  "Karim Ismoilov", "Nodira Karimova", "Rustam Yusupov", "Dilnoza Rasulova",
  "Aziz Umarov", "Shahnoza Nazarova", "Bahodir Tursunov", "Feruza Safarova",
  "Oybek Abdullayev", "Gulbahor Xolmatova", "Anvar Qobilov", "Zulfiya Ergasheva",
];

const ADDRESSES = [
  "Toshkent sh., Chilonzor 9-kvartal, 14-uy",
  "Toshkent sh., Yunusobod 4-mavze, 7-uy",
  "Toshkent sh., Sergeli 8-kvartal, 3-uy",
  "Toshkent sh., Mirzo Ulug'bek tumani, 21-uy",
  "Toshkent sh., Yakkasaroy, Bobur ko'chasi 5-uy",
  "Toshkent sh., Olmazor, Farobiy 12-uy",
];

export function seedDemoDb(): DemoDb {
  const r = rng(20260902);
  const today = todayStr();
  let seq = 1;

  // ------------------------------ teachers ------------------------------
  const teachers: Teacher[] = [
    { full_name: "Dilshod Rahimov", phone: "+998 90 123-45-67", subject: "Matematika" },
    { full_name: "Nilufar Qodirova", phone: "+998 91 234-56-78", subject: "Ona tili" },
    { full_name: "Jasur Toshev", phone: "+998 93 345-67-89", subject: "Ingliz tili" },
    { full_name: "Gulnora Ergasheva", phone: "+998 94 456-78-90", subject: "Tarix" },
    { full_name: "Sardor Yo'ldoshev", phone: "+998 97 567-89-01", subject: "Fizika" },
    { full_name: "Kamola Sattorova", phone: "+998 99 678-90-12", subject: "Biologiya" },
  ].map((t) => ({ ...t, id: id(seq++) }));

  // ------------------------------ students ------------------------------
  const birthYears = [2014, 2013, 2012, 2011]; // by class index
  const students: Student[] = STUDENT_NAMES.map((full_name, i) => {
    const classIdx = i % CLASSES.length;
    const year = birthYears[classIdx]!;
    const month = 1 + Math.floor(r() * 12);
    const day = 1 + Math.floor(r() * 28);
    const dob = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { id: id(seq++), full_name, date_of_birth: dob, class_name: CLASSES[classIdx]!, phone: null, notes: null };
  });

  // Birthday alert demo: one student's birthday is ALWAYS today.
  const bdIdx = 7; // Sarvinoz Abdullayeva
  const [_, bm, bd] = today.split("-");
  students[bdIdx] = {
    ...students[bdIdx]!,
    date_of_birth: `2012-${bm}-${bd}`,
    notes: "Bugun tug'ilgan kuni! 🎉",
  };

  // ------------------------------ parents -------------------------------
  const parents: Parent[] = PARENT_NAMES.map((full_name, i) => {
    const student = students[i % students.length]!;
    const hasContract = r() > 0.15;
    return {
      id: id(seq++),
      full_name,
      phone: `+998 9${Math.floor(r() * 9)} ${100 + Math.floor(r() * 899)}-${10 + Math.floor(r() * 89)}-${10 + Math.floor(r() * 89)}`,
      student_id: student.id,
      contract_number: hasContract ? `SH-2026-${String(i + 1).padStart(3, "0")}` : null,
      contract_date: hasContract ? `2026-0${1 + Math.floor(r() * 8)}-1${Math.floor(r() * 9)}` : null,
      home_address: pick(r, ADDRESSES),
    };
  });

  // ------------------------------ schedule ------------------------------
  const TIMES: Array<[string, string]> = [
    ["08:00", "08:45"], ["09:00", "09:45"], ["10:00", "10:45"], ["11:00", "11:45"],
  ];
  const schedules: ScheduleItem[] = [];
  for (const className of CLASSES) {
    for (let day = 1; day <= 6; day++) {
      const lessonCount = 2 + Math.floor(r() * 2); // 2-3 lessons per day
      for (let slot = 0; slot < lessonCount; slot++) {
        const teacher = pick(r, teachers);
        const [start_time, end_time] = TIMES[slot % TIMES.length]!;
        schedules.push({
          id: id(seq++),
          class_name: className,
          subject: teacher.subject,
          teacher_id: teacher.id,
          day_of_week: day,
          start_time,
          end_time,
          room: `${100 + Math.floor(r() * 300)}-xona`,
        });
      }
    }
  }

  // ----------------------------- attendance -----------------------------
  // Last 30 days, school days only (Mon-Sat), realistic distribution.
  const attendance: AttendanceRecord[] = [];
  for (let back = 29; back >= 0; back--) {
    const date = addDays(today, -back);
    const dow = (new Date(date + "T00:00:00Z").getUTCDay() + 6) % 7 + 1; // 1..7
    if (dow === 7) continue; // Sunday off
    for (const s of students) {
      const roll = r();
      const status: AttendanceStatus =
        roll < 0.82 ? "keldi" : roll < 0.9 ? "sababli" : roll < 0.96 ? "kelmadi" : "sababsiz";
      attendance.push({ id: id(seq++), student_id: s.id, date, status, note: null });
    }
  }

  // ----------------------------- dismissal ------------------------------
  const dismissal: DismissalRecord[] = [];
  for (let back = 6; back >= 0; back--) {
    const date = addDays(today, -back);
    const dow = (new Date(date + "T00:00:00Z").getUTCDay() + 6) % 7 + 1;
    if (dow === 7) continue;
    for (const s of students) {
      const roll = r();
      const method: DismissalMethod =
        roll < 0.55 ? "olib_ketishdi" : roll < 0.82 ? "ozi_ketdi" : "avtobusda";
      dismissal.push({ id: id(seq++), student_id: s.id, date, method, note: null });
    }
  }

  // ------------------------------- grades -------------------------------
  const grades: GradeRecord[] = [];
  for (const s of students) {
    for (const subject of SUBJECTS) {
      const count = 2 + Math.floor(r() * 3); // 2-4 grades per subject
      for (let k = 0; k < count; k++) {
        grades.push({
          id: id(seq++),
          student_id: s.id,
          subject,
          grade: 50 + Math.floor(r() * 50), // 50..99
          date: addDays(today, -Math.floor(r() * 30)),
          teacher_id: teachers.find((t) => t.subject === subject)?.id ?? null,
        });
      }
    }
  }

  return { teachers, students, parents, schedules, attendance, dismissal, grades };
}
