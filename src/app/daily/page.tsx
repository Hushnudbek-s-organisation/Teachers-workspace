import { DailyClient } from "@/components/daily/DailyClient";
import { PageHeader } from "@/components/PageHeader";
import { repo } from "@/lib/repo";
import { addDays, todayStr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DailyPage() {
  // Fetch the last 45 days so the client date-picker can move back in time.
  const since = addDays(todayStr(), -44);
  const [students, attendance, dismissals, grades, teachers] = await Promise.all([
    repo.listStudents(),
    repo.listAttendance(since),
    repo.listDismissals(since),
    repo.listGrades(since),
    repo.listTeachers(),
  ]);

  const subjects = [
    ...new Set([...grades.map((g) => g.subject), ...teachers.map((t) => t.subject).filter(Boolean)]),
  ].sort();

  return (
    <div>
      <PageHeader
        title="Kunlik davomat"
        description="Davomat, uyga ketish usullari va baholarni bir joyda, interaktiv jadvallarda belgilang."
      />
      <DailyClient
        students={students}
        attendance={attendance}
        dismissals={dismissals}
        grades={grades}
        subjects={subjects}
      />
    </div>
  );
}
