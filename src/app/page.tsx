// ============================================================================
// Boshqaruv paneli — Dashboard Overview (Task 3)
// KPI cards + attendance trend + grade analysis + dismissal breakdown.
// ============================================================================

import Link from "next/link";
import {
  ArrowRight,
  Award,
  CalendarRange,
  ClipboardCheck,
  DoorOpen,
  GraduationCap,
  TrendingUp,
  Users,
  UserRound,
} from "lucide-react";
import { BirthdayBanner } from "@/components/dashboard/BirthdayBanner";
import {
  AttendanceTrendChart,
  DismissalPieChart,
  SubjectGradesChart,
} from "@/components/dashboard/DashboardCharts";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Card, CardHeader } from "@/components/ui";
import { repo } from "@/lib/repo";
import {
  attendanceRateOn,
  averageGrade,
  birthdaysToday,
  classPerformance,
  dailyAttendance,
  dismissalBreakdown,
  latestDismissalDate,
  subjectPerformance,
  upcomingBirthdays,
} from "@/lib/analytics";
import { addDays, cn, pct, todayStr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const today = todayStr();
  const monthAgo = addDays(today, -29);
  const weekAgo = addDays(today, -6);

  const [students, teachers, parents, attendance, grades, dismissals] = await Promise.all([
    repo.listStudents(),
    repo.listTeachers(),
    repo.listParents(),
    repo.listAttendance(monthAgo),
    repo.listGrades(monthAgo),
    repo.listDismissals(weekAgo),
  ]);

  const todayRate = attendanceRateOn(attendance, today);
  const avgGrade = averageGrade(grades);
  const weekTrend = dailyAttendance(attendance, 7, today);
  const subjects = subjectPerformance(grades);
  const classes = classPerformance(students, grades, attendance);
  const dismissalDate = latestDismissalDate(dismissals) ?? today;
  const dismissalData = dismissalBreakdown(dismissals, dismissalDate);
  const bdays = birthdaysToday(students, today);
  const upcoming = upcomingBirthdays(students, 7, today);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Boshqaruv paneli</h1>
          <p className="mt-1 text-sm text-slate-500">Maktab faoliyatining umumiy ko'rinishi va tahlili</p>
        </div>
        <Link
          href="/daily"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          Bugungi davomatni belgilash <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <BirthdayBanner birthdays={bdays} upcoming={upcoming} />

      {/* ------------------------------- KPI cards ------------------------------ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="O'quvchilar" value={String(students.length)} icon={<Users className="h-5 w-5" />} tone="indigo" hint={`${new Set(students.map((s) => s.class_name)).size} sinf`} />
        <MetricCard label="O'qituvchilar" value={String(teachers.length)} icon={<GraduationCap className="h-5 w-5" />} tone="emerald" />
        <MetricCard label="Ota-onalar" value={String(parents.length)} icon={<UserRound className="h-5 w-5" />} tone="violet" hint={`${parents.filter((p) => p.contract_number).length} ta shartnoma`} />
        <MetricCard
          label="Bugungi davomat"
          value={todayRate == null ? "—" : `${todayRate}%`}
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone={todayRate == null ? "sky" : todayRate >= 90 ? "emerald" : todayRate >= 75 ? "amber" : "sky"}
          hint={todayRate == null ? "Bugun uchun yozuv yo'q" : "Keldi / belgilangan"}
        />
        <MetricCard label="O'rtacha baho (30 kun)" value={avgGrade == null ? "—" : String(avgGrade)} icon={<Award className="h-5 w-5" />} tone="amber" hint={grades.length > 0 ? `${grades.length} ta baho asosida` : "Baho yo'q"} />
      </div>

      {/* ------------------------------- Charts -------------------------------- */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Haftalik davomat dinamikasi"
            subtitle="So'nggi 7 kun: Keldi / Kelmadi / Sababli / Sababsiz nisbati"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          {weekTrend.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-slate-400">Davomat ma'lumotlari yo'q</p>
          ) : (
            <AttendanceTrendChart data={weekTrend} />
          )}
        </Card>

        <Card>
          <CardHeader
            title="Uyga ketish usullari"
            subtitle={dismissalDate === today ? "Bugungi taqsimot" : `Oxirgi yozuv: ${dismissalDate}`}
            icon={<DoorOpen className="h-4 w-4" />}
          />
          {dismissalData.every((d) => d.count === 0) ? (
            <p className="px-5 py-16 text-center text-sm text-slate-400">Ma'lumot yo'q</p>
          ) : (
            <DismissalPieChart data={dismissalData} />
          )}
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Fanlar bo'yicha o'rtacha baholar"
            subtitle="So'nggi 30 kun ichidagi baholar tahlili"
            icon={<Award className="h-4 w-4" />}
          />
          {subjects.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-slate-400">Baholar yo'q</p>
          ) : (
            <SubjectGradesChart data={subjects} />
          )}
        </Card>

        <Card>
          <CardHeader
            title="Sinflar kesimi"
            subtitle="O'rtacha baho va davomat"
            icon={<CalendarRange className="h-4 w-4" />}
          />
          <div className="thin-scroll max-h-72 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0">
                <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5 font-medium">Sinf</th>
                  <th className="px-3 py-2.5 font-medium">O'quvchi</th>
                  <th className="px-3 py-2.5 font-medium">Baho</th>
                  <th className="px-5 py-2.5 font-medium">Davomat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classes.map((c) => (
                  <tr key={c.class_name}>
                    <td className="px-5 py-2.5 font-semibold text-slate-800">{c.class_name}</td>
                    <td className="px-3 py-2.5 text-slate-600">{c.student_count}</td>
                    <td className="px-3 py-2.5 text-slate-600">{c.average_grade ?? "—"}</td>
                    <td className="px-5 py-2.5">
                      <span
                        className={cn(
                          "font-medium",
                          c.attendance_rate == null
                            ? "text-slate-400"
                            : c.attendance_rate >= 90
                              ? "text-emerald-600"
                              : c.attendance_rate >= 75
                                ? "text-amber-600"
                                : "text-red-600"
                        )}
                      >
                        {pct(c.attendance_rate)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
