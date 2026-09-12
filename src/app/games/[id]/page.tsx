import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { GamePlayer } from "@/components/books/GamePlayer";
import { GAME_TYPES } from "@/lib/books/types";
import { getCustomGame } from "@/lib/books/custom";
import { getBook } from "@/lib/books/store";
import { repo } from "@/lib/repo";
import { Button } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CustomGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await getCustomGame(id);
  if (!game) notFound();

  const students = (await repo.listStudents())
    .map((s) => ({ id: s.id, full_name: s.full_name }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  const book = game.bookId ? await getBook(game.bookId) : null;

  return (
    <>
      <div className="mx-auto mb-3 flex max-w-3xl items-center justify-between">
        <span className="text-xs font-medium text-slate-500">
          O'qituvchi o'yini · {GAME_TYPES[game.type].label}
          {book ? ` · ${book.title}` : ""}
        </span>
        <Link href={`/games/${game.id}/edit`}>
          <Button variant="secondary" className="px-2.5 py-1.5 text-xs">
            <Pencil className="h-3.5 w-3.5" /> Tahrirlash
          </Button>
        </Link>
      </div>
      <GamePlayer
        game={game}
        bookId={game.bookId ?? `custom-${game.id}`}
        bookTitle={book?.title ?? "O'qituvchi o'yini"}
        topicId={game.topicId ?? "custom"}
        topicTitle={game.builtFrom.note}
        students={students}
      />
    </>
  );
}
