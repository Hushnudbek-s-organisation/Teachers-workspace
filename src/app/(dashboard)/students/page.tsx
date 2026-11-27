import { StudentsClient } from "@/components/students/StudentsClient";
import { PageHeader } from "@/components/PageHeader";
import { repo } from "@/lib/repo";
import { studentStats } from "@/lib/analytics";
import { addDays, todayStr } from "@/lib/utils";
import { allowedClasses } from "@/lib/auth";
import { getLinkStatuses } from "@/lib/portal/store";
import { requireTeacher } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ============================================================================
// O'quvchilar sahifasi:
//   • Sessiya (dashboard layout) + sinf bo'yicha huquq tekshiriladi
//   • Link holatlari serverdan olinadi (bazada faqat token xeshi bor)
// ============================================================================

export default async function StudentsPage() {
  const session = await requireTeacher();
  const scope = await allowedClasses(session);

  const monthAgo = addDays(todayStr(), -29);
  const [students, attendance, grades] = await Promise.all([
    repo.listStudents(),
    repo.listAttendance(monthAgo),
    repo.listGrades(monthAgo),
  ]);

  // Sinf bo'yicha huquq: admin hamma sinfni ko'radi, o'qituvchi — faqat
  // aniq berilgan sinflarni (server tomonda filtrlanadi)
  const visible = scope === null ? students : students.filter((s) => scope.includes(s.class_name));

  const stats = studentStats(visible, attendance, grades);
  const classes = [...new Set(visible.map((s) => s.class_name))].sort();

  const linkStatuses = await getLinkStatuses(visible.map((s) => s.id));

  return (
    <div>
      <PageHeader
        title="O'quvchilar"
        description="O'quvchilarni qo'shish, tahrirlash, shaxsiy o'yin linklarini boshqarish. Tug'ilgan kun nazorati avtomatik."
      />
      <StudentsClient stats={stats} classes={classes} linkStatuses={Object.fromEntries(linkStatuses)} />
    </div>
  );
}
