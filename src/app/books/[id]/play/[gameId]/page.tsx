import Link from "next/link";
import { notFound } from "next/navigation";
import { GamePlayer } from "@/components/books/GamePlayer";
import { GAME_TYPES } from "@/lib/books/types";
import { getBook } from "@/lib/books/store";
import { repo } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string; gameId: string }>;
}) {
  const { id, gameId } = await params;
  const book = await getBook(id);
  if (!book) notFound();

  const topic = book.topics.find((t) => t.games.some((g) => g.id === gameId));
  const game = topic?.games.find((g) => g.id === gameId);
  if (!topic || !game) notFound();

  const students = (await repo.listStudents())
    .map((s) => ({ id: s.id, full_name: s.full_name }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  const otherGames = book.topics
    .filter((t) => t.id === topic.id)
    .flatMap((t) => t.games.filter((g) => g.id !== game.id))
    .slice(0, 4);

  return (
    <>
      <GamePlayer
        game={game}
        bookId={book.id}
        bookTitle={book.title}
        topicId={topic.id}
        topicTitle={topic.title}
        students={students}
        saveBookId={book.id}
      />

      {otherGames.length ? (
        <div className="mx-auto mt-8 max-w-3xl">
          <p className="mb-3 text-sm font-semibold text-slate-700">Shu mavzudagi boshqa o'yinlar</p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {otherGames.map((g) => {
              const meta = GAME_TYPES[g.type];
              return (
                <Link
                  key={g.id}
                  href={`/books/${book.id}/play/${g.id}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-all hover:border-indigo-300 hover:shadow-sm"
                >
                  <span className="text-xl">{meta.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">{g.title}</span>
                    <span className="text-xs text-slate-500">
                      {meta.label} · {g.items.length} savol
                    </span>
                  </span>
                  <span className="text-xs font-medium text-indigo-600">O'ynash →</span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </>
  );
}
