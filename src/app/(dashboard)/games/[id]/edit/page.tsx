import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { GameBuilder } from "@/components/games/GameBuilder";
import { getCustomGame } from "@/lib/books/custom";
import { getBook, listBookMetas } from "@/lib/books/store";

export const dynamic = "force-dynamic";

export default async function EditGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await getCustomGame(id);
  if (!game) notFound();

  const metas = await listBookMetas();
  const books = await Promise.all(
    metas.slice(0, 20).map(async (m) => {
      const full = await getBook(m.id);
      return { id: m.id, title: m.title, topics: (full?.topics ?? []).map((t) => ({ id: t.id, title: t.title })) };
    })
  );

  return (
    <>
      <PageHeader title="O'yinni tahrirlash" description={game.title} />
      <GameBuilder
        books={books}
        initial={{
          id: game.id,
          title: game.title,
          type: game.type,
          subject: game.subject,
          grade: game.grade,
          instructions: game.instructions,
          note: game.builtFrom.note,
          items: game.items,
          groups: game.groups,
        }}
      />
    </>
  );
}
