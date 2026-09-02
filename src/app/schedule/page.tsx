import { ScheduleClient } from "@/components/schedule/ScheduleClient";
import { PageHeader } from "@/components/PageHeader";
import { repo } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const [schedules, teachers, students] = await Promise.all([
    repo.listSchedules(),
    repo.listTeachers(),
    repo.listStudents(),
  ]);
  const classes = [...new Set([...students.map((s) => s.class_name), ...schedules.map((s) => s.class_name)])].sort();

  return (
    <div>
      <PageHeader
        title="Dars jadvali"
        description="Fan, o'qituvchi va vaqt bo'yicha haftalik dars jadvalini boshqarish."
      />
      <ScheduleClient schedules={schedules} teachers={teachers} classes={classes} />
    </div>
  );
}
