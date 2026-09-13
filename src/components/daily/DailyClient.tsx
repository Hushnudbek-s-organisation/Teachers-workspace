"use client";

// ============================================================================
// Kunlik davomat — Daily operations (Task 2)
// Interactive tables for: Davomat (attendance), Uyga ketish (dismissal),
// Baholar (grades). One click per cell — records are upserted instantly.
// ============================================================================

import { useMemo, useState, useTransition } from "react";
import {
  BookOpenCheck,
  Bus,
  Cake,
  CheckCircle2,
  ClipboardCheck,
  DoorOpen,
  Plus,
  Trash2,
} from "lucide-react";
import { deleteGrade, markAttendance, markDismissal, saveGrade } from "@/app/actions";
import type {
  AttendanceRecord,
  AttendanceStatus,
  DismissalMethod,
  DismissalRecord,
  GradeRecord,
  Student,
} from "@/lib/types";
import {
  ATTENDANCE_CLASSES,
  ATTENDANCE_LABELS,
  ATTENDANCE_STATUSES,
  DISMISSAL_CLASSES,
  DISMISSAL_LABELS,
  DISMISSAL_METHODS,
  cn,
  formatDateUz,
  isBirthdayToday,
  todayStr,
} from "@/lib/utils";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  SegmentedControl,
  Select,
} from "@/components/ui";

type Tab = "attendance" | "dismissal" | "grades";

const TABS: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "attendance", label: "Davomat", icon: ClipboardCheck },
  { id: "dismissal", label: "Uyga ketish", icon: DoorOpen },
  { id: "grades", label: "Baholar", icon: BookOpenCheck },
];

const ATTENDANCE_OPTIONS = ATTENDANCE_STATUSES.map((s) => ({
  value: s,
  label: ATTENDANCE_LABELS[s],
  activeClass: ATTENDANCE_CLASSES[s],
}));

const DISMISSAL_OPTIONS = DISMISSAL_METHODS.map((m) => ({
  value: m,
  label: DISMISSAL_LABELS[m],
  activeClass: DISMISSAL_CLASSES[m],
}));

export function DailyClient({
  students,
  attendance,
  dismissals,
  grades,
  subjects,
}: {
  students: Student[];
  attendance: AttendanceRecord[];
  dismissals: DismissalRecord[];
  grades: GradeRecord[];
  subjects: string[];
}) {
  const [tab, setTab] = useState<Tab>("attendance");
  const [date, setDate] = useState(todayStr());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Local overrides give instant feedback until the server data refreshes.
  const [attOverride, setAttOverride] = useState<Record<string, AttendanceStatus>>({});
  const [disOverride, setDisOverride] = useState<Record<string, DismissalMethod>>({});

  const attByStudent = useMemo(() => {
    const m = new Map<string, AttendanceStatus>();
    for (const r of attendance) if (r.date === date) m.set(r.student_id, r.status);
    return m;
  }, [attendance, date]);

  const disByStudent = useMemo(() => {
    const m = new Map<string, DismissalMethod>();
    for (const r of dismissals) if (r.date === date) m.set(r.student_id, r.method);
    return m;
  }, [dismissals, date]);

  const dayGrades = useMemo(
    () =>
      grades
        .filter((g) => g.date === date)
        .sort((a, b) => a.subject.localeCompare(b.subject) || b.grade - a.grade),
    [grades, date]
  );

  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  function setStatus(studentId: string, status: AttendanceStatus) {
    setAttOverride((prev) => ({ ...prev, [studentId]: status }));
    setError(null);
    startTransition(async () => {
      try {
        const res = await markAttendance(studentId, date, status);
        if (res && res.ok === false) {
          setError(res.error + (res.hint ? " " + res.hint : ""));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Saqlashda xatolik");
      }
    });
  }

  function setMethod(studentId: string, method: DismissalMethod) {
    setDisOverride((prev) => ({ ...prev, [studentId]: method }));
    setError(null);
    startTransition(async () => {
      try {
        const res = await markDismissal(studentId, date, method);
        if (res && res.ok === false) {
          setError(res.error + (res.hint ? " " + res.hint : ""));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Saqlashda xatolik");
      }
    });
  }

  function handleAddGrade(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("date", date); // grades always belong to the selected day
    setError(null);
    startTransition(async () => {
      try {
        const res = await saveGrade(fd);
        if (res && res.ok === false) {
          setError(res.error + (res.hint ? " " + res.hint : ""));
          return;
        }
        form.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Saqlashda xatolik");
      }
    });
  }

  function handleDeleteGrade(id: string) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await deleteGrade(id);
        if (res && res.ok === false) {
          setError(res.error + (res.hint ? " " + res.hint : ""));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "O'chirishda xatolik");
      }
    });
  }

  // Summary chips for the selected day
  const dayStats = ATTENDANCE_STATUSES.map((s) => ({
    status: s,
    count: students.filter((st) => (attOverride[st.id] ?? attByStudent.get(st.id)) === s).length,
  }));
  const marked = dayStats.reduce((sum, s) => sum + s.count, 0);

  const birthdayStudents = students.filter((s) => isBirthdayToday(s.date_of_birth));

  return (
    <div className="space-y-5">
      {/* Date picker + summary */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Field label="Sana">
              <Input
                type="date"
                value={date}
                max={todayStr()}
                onChange={(e) => {
                  setDate(e.target.value);
                  setAttOverride({});
                  setDisOverride({});
                }}
                className="w-44"
              />
            </Field>
            <div className="hidden h-9 w-px bg-slate-200 sm:block" />
            <div className="flex flex-wrap gap-2">
              {dayStats.map(({ status, count }) => (
                <Badge key={status} className={ATTENDANCE_CLASSES[status]}>
                  {ATTENDANCE_LABELS[status]}: {count}
                </Badge>
              ))}
              <Badge className="border-slate-200 bg-slate-50 text-slate-600">
                Belgilangan: {marked}/{students.length}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {pending ? (
              <span className="inline-flex items-center gap-1.5 text-indigo-600">
                <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" /> Saqlanmoqda...
              </span>
            ) : (
              <span>{formatDateUz(date)}</span>
            )}
            {birthdayStudents.length > 0 ? (
              <Badge className="border-amber-300 bg-amber-100 text-amber-800">
                <Cake className="h-3 w-3" /> {birthdayStudents.length} ta tug'ilgan kun
              </Badge>
            ) : null}
          </div>
        </div>
        {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p> : null}
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              tab === id ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ------------------------------ DAVOMAT ------------------------------ */}
      {tab === "attendance" ? (
        <Card>
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">Davomat belgilash</h3>
            <p className="text-xs text-slate-500">
              Har bir o'quvchi uchun holatni tanlang — yozuv avtomatik saqlanadi
            </p>
          </div>
          {students.length === 0 ? (
            <EmptyState icon={<ClipboardCheck className="h-6 w-6" />} title="O'quvchilar yo'q" />
          ) : (
            <div className="thin-scroll overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-medium">O'quvchi</th>
                    <th className="px-4 py-3 font-medium">Sinf</th>
                    <th className="px-4 py-3 font-medium">Davomat holati</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => {
                    const current = attOverride[student.id] ?? attByStudent.get(student.id) ?? null;
                    return (
                      <tr key={student.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={student.full_name} />
                            <p className="font-medium text-slate-900">{student.full_name}</p>
                            {isBirthdayToday(student.date_of_birth) ? (
                              <Badge className="border-amber-300 bg-amber-100 text-amber-800">
                                <Cake className="h-3 w-3" /> 🎉
                              </Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{student.class_name}</td>
                        <td className="px-4 py-3">
                          <SegmentedControl
                            options={ATTENDANCE_OPTIONS}
                            value={current}
                            onChange={(value) => setStatus(student.id, value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {/* --------------------------- UYGA KETISH ----------------------------- */}
      {tab === "dismissal" ? (
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Uyga ketish usulini belgilash</h3>
              <p className="text-xs text-slate-500">
                O'zi ketdi / Olib ketishdi / Avtobusda — tanlov avtomatik saqlanadi
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <Bus className="h-4 w-4" />
            </div>
          </div>
          {students.length === 0 ? (
            <EmptyState icon={<DoorOpen className="h-6 w-6" />} title="O'quvchilar yo'q" />
          ) : (
            <div className="thin-scroll overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-medium">O'quvchi</th>
                    <th className="px-4 py-3 font-medium">Sinf</th>
                    <th className="px-4 py-3 font-medium">Uyga ketish usuli</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => {
                    const current = disOverride[student.id] ?? disByStudent.get(student.id) ?? null;
                    return (
                      <tr key={student.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={student.full_name} />
                            <p className="font-medium text-slate-900">{student.full_name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{student.class_name}</td>
                        <td className="px-4 py-3">
                          <SegmentedControl
                            options={DISMISSAL_OPTIONS}
                            value={current}
                            onChange={(value) => setMethod(student.id, value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {/* ------------------------------ BAHOLAR ------------------------------ */}
      {tab === "grades" ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Card className="xl:col-span-1">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900">Baho qo'yish</h3>
              <p className="text-xs text-slate-500">Baho 0 dan 100 gacha (raqamli tizim)</p>
            </div>
            <form onSubmit={handleAddGrade} className="space-y-4 p-5">
              <Field label="O'quvchi *">
                <Select name="student_id" required defaultValue="">
                  <option value="" disabled>
                    Tanlang...
                  </option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.class_name})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Fan *">
                <Input name="subject" required list="subject-list" placeholder="Matematika" />
              </Field>
              <datalist id="subject-list">
                {subjects.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <Field label="Baho (0–100) *">
                <Input name="grade" type="number" min={0} max={100} required placeholder="85" />
              </Field>
              <Button type="submit" className="w-full" disabled={pending}>
                <Plus className="h-4 w-4" /> {pending ? "Saqlanmoqda..." : "Bahoni saqlash"}
              </Button>
            </form>
          </Card>

          <Card className="xl:col-span-2">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900">
                {formatDateUz(date)} — qo'yilgan baholar
              </h3>
              <p className="text-xs text-slate-500">Jami {dayGrades.length} ta baho</p>
            </div>
            {dayGrades.length === 0 ? (
              <EmptyState
                icon={<BookOpenCheck className="h-6 w-6" />}
                title="Bu kunga baho qo'yilmagan"
                description="Chapdagi forma orqali baho qo'shing."
              />
            ) : (
              <div className="thin-scroll max-h-[560px] overflow-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="sticky top-0">
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3 font-medium">O'quvchi</th>
                      <th className="px-4 py-3 font-medium">Fan</th>
                      <th className="px-4 py-3 font-medium">Baho</th>
                      <th className="px-4 py-3 text-right font-medium">Amal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dayGrades.map((g) => {
                      const student = studentById.get(g.student_id);
                      return (
                        <tr key={g.id} className="hover:bg-slate-50/60">
                          <td className="px-5 py-3 font-medium text-slate-900">
                            {student?.full_name ?? "O'chirilgan"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{g.subject}</td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex h-7 min-w-[2.25rem] items-center justify-center rounded-lg px-2 text-xs font-bold",
                                g.grade >= 80
                                  ? "bg-emerald-100 text-emerald-700"
                                  : g.grade >= 60
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-red-100 text-red-700"
                              )}
                            >
                              {g.grade}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              className="p-2 text-red-500 hover:bg-red-50 hover:text-red-600"
                              title="O'chirish"
                              onClick={() => handleDeleteGrade(g.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      ) : null}

      {/* Recorded confirmation footer */}
      {marked > 0 && tab === "attendance" ? (
        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          Belgilangan holatlar avtomatik saqlanadi — jadvalni to'ldirib boring
        </p>
      ) : null}
    </div>
  );
}
