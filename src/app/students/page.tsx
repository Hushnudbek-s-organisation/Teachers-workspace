import { StudentsClient } from "@/components/students/StudentsClient";
import { PageHeader } from "@/components/PageHeader";
import { repo } from "@/lib/repo";
import { studentStats } from "@/lib/analytics";
import { addDays, todayStr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const monthAgo = addDays(todayStr(), -29);
  const [students, attendance, grades] = await Promise.all([
    repo.listStudents(),
    repo.listAttendance(monthAgo),
    repo.listGrades(monthAgo),
  ]);

  const stats = studentStats(students, attendance, grades);
  const classes = [...new Set(students.map((s) => s.class_name))].sort();

  return (
    <div>
      <PageHeader
        title="O'quvchilar"
        description="O'quvchilarni qo'shish, tahrirlash va o'chirish. Tug'ilgan kun nazorati avtomatik."
      />
      <StudentsClient stats={stats} classes={classes} />
    </div>
  );
}
