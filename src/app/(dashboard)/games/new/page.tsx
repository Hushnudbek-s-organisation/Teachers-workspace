import { PageHeader } from "@/components/PageHeader";
import { GameBuilder } from "@/components/games/GameBuilder";
import { listBookMetas, getBook } from "@/lib/books/store";

export const dynamic = "force-dynamic";

export default async function NewGamePage() {
  const metas = await listBookMetas();

  // Mavzular ro'yxati kerak — faqat kichik xulosa olamiz
  const books = await Promise.all(
    metas.slice(0, 20).map(async (m) => {
      const full = await getBook(m.id);
      return {
        id: m.id,
        title: m.title,
        topics: (full?.topics ?? []).map((t) => ({ id: t.id, title: t.title })),
      };
    })
  );

  return (
    <>
      <PageHeader
        title="Yangi o'yin yasash"
        description="O'z so'zlaringiz, misollaringiz yoki savollaringiz bilan o'yin tuzing — kitob kerak emas"
      />
      <GameBuilder books={books} />
    </>
  );
}
