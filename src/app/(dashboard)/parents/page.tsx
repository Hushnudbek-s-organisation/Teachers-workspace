import { ParentsClient } from "@/components/parents/ParentsClient";
import { PageHeader } from "@/components/PageHeader";
import { repo } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function ParentsPage() {
  const [parents, students] = await Promise.all([repo.listParents(), repo.listStudents()]);

  return (
    <div>
      <PageHeader
        title="Ota-onalar"
        description="Shartnoma ma'lumotlari va uy manzillari bilan ota-onalar bazasi."
      />
      <ParentsClient parents={parents} students={students} />
    </div>
  );
}
