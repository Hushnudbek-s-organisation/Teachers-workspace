import { TeachersClient } from "@/components/teachers/TeachersClient";
import { PageHeader } from "@/components/PageHeader";
import { repo } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function TeachersPage() {
  const [teachers, schedules] = await Promise.all([repo.listTeachers(), repo.listSchedules()]);

  return (
    <div>
      <PageHeader
        title="O'qituvchilar"
        description="O'qituvchilarni qo'shish, tahrirlash va o'chirish (telefon raqamlari bilan)."
      />
      <TeachersClient teachers={teachers} schedules={schedules} />
    </div>
  );
}
