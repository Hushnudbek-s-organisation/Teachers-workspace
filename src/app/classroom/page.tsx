import { PageHeader } from "@/components/PageHeader";
import { ClassroomTabs } from "@/components/classroom/ClassroomTabs";
import { getBook, listBookMetas } from "@/lib/books/store";
import { collectQuestions } from "@/lib/books/quiz-pool";
import { repo } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function ClassroomPage() {
  const [metas, students] = await Promise.all([listBookMetas(), repo.listStudents()]);

  // Kitoblardan savollar va so'zlarni yig'amiz (doskada o'ynash uchun)
  const booksFull = await Promise.all(metas.map((m) => getBook(m.id)));

  const questionPools = booksFull
    .filter((b): b is NonNullable<typeof b> => !!b)
    .map((b) => {
      const games = b.topics.flatMap((t) => t.games.map((g) => ({ type: g.type, title: g.title, items: g.items })));
      return { bookId: b.id, bookTitle: b.title, questions: collectQuestions(games) };
    })
    .filter((p) => p.questions.length >= 4);

  const bookWords = booksFull
    .filter((b): b is NonNullable<typeof b> => !!b)
    .map((b) => ({
      book: b.title,
      words: [...new Set(b.topics.flatMap((t) => t.keywords))].filter((w) => w.length >= 3).slice(0, 60),
    }));

  const names = students.map((s) => s.full_name).sort((a, b) => a.localeCompare(b));

  return (
    <>
      <PageHeader
        title="Sinf bilan o'ynash"
        description="Charxpalak, guruhlar viktorinasi va bingo kartalari — doskaga chiqarib, butun sinf bilan o'ynang"
      />
      <ClassroomTabs
        studentNames={names}
        questionPools={questionPools}
        bookWords={bookWords}
      />
    </>
  );
}
