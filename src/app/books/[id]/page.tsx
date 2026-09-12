import { notFound } from "next/navigation";
import { BookDetail, type BookPayload } from "@/components/books/BookDetail";
import { getBook, leaderboard } from "@/lib/books/store";
import { listCustomGames } from "@/lib/books/custom";
import { GAME_TYPES } from "@/lib/books/types";
import { BOOK_TEXT_PREVIEW_CHARS } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = await getBook(id);
  if (!book) notFound();

  const [leaders, custom] = await Promise.all([leaderboard(book.id, 5), listCustomGames(book.id)]);

  // Mijozga faqat kerakli qismini yuboramiz (200 betli kitobda matn juda katta)
  const payload: BookPayload = {
    id: book.id,
    title: book.title,
    grade: book.grade,
    subjectLabel: book.subjectLabel,
    author: book.author,
    stats: book.stats,
    source: book.source,
    topics: book.topics.map((t) => ({
      id: t.id,
      index: t.index,
      title: t.title,
      section: t.section,
      pageStart: t.pageStart,
      pageEnd: t.pageEnd,
      keywords: t.keywords,
      examples: t.examples.slice(0, 20),
      games: t.games,
      textPreview: t.text.slice(0, BOOK_TEXT_PREVIEW_CHARS),
    })),
  };

  return (
    <BookDetail
      book={payload}
      leaderboard={leaders}
      customGames={custom.map((g) => ({
        id: g.id,
        title: g.title,
        type: g.type,
        typeLabel: GAME_TYPES[g.type].label,
        emoji: GAME_TYPES[g.type].emoji,
        items: g.items.length,
        note: g.builtFrom.note,
      }))}
    />
  );
}
