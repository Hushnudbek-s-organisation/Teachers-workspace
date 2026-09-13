"use client";

// ============================================================================
// O'qituvchi o'yinlari ro'yxati (o'chirish, o'ynash, havola olish)
// ============================================================================

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Check, Copy, Gamepad2, Pencil, Trash2 } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { SUBJECTS, type SubjectKey } from "@/lib/books/types";
import { actionDeleteCustomGame } from "@/app/games/actions";

export interface CustomGameRow {
  id: string;
  title: string;
  type: string;
  typeLabel: string;
  emoji: string;
  items: number;
  subject: SubjectKey;
  grade: number;
  note: string;
  createdAt: string;
  bookId?: string;
  bookTitle?: string;
}

export function CustomGameList({ games }: { games: CustomGameRow[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {games.map((g) => (
        <Row key={g.id} game={g} />
      ))}
    </div>
  );
}

function Row({ game }: { game: CustomGameRow }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subject = SUBJECTS[game.subject] ?? SUBJECTS.boshqa;

  const remove = async () => {
    setError(null);
    try {
      const res = await actionDeleteCustomGame(game.id);
      if (res && res.ok === false) {
        setError(res.error + (res.hint ? " " + res.hint : ""));
        setConfirming(false);
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "O'chirishda xatolik");
      setConfirming(false);
    }
  };

  const copy = async () => {
    const url = `${window.location.origin}/games/${game.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Havolani nusxalang:", url);
    }
  };

  return (
    <Card className="flex flex-col overflow-hidden p-4">
      <div className="flex items-start gap-3">
        <span className="text-3xl">{game.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{game.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <Badge className={subject.badge}>
              {subject.emoji} {subject.label}
            </Badge>
            <span>{game.grade}-sinf</span>
            <span>·</span>
            <span>{game.items} element</span>
          </p>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-500">{game.note}</p>

      {game.bookTitle ? (
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-indigo-600">
          <BookOpen className="h-3 w-3" /> {game.bookTitle}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge className="border-slate-200 bg-slate-50 text-slate-600">
          {game.emoji} {game.typeLabel}
        </Badge>
      </div>

      {error ? <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p> : null}

      <div className="mt-auto flex items-center gap-1.5 pt-3">
        <Link href={`/games/${game.id}`} className="flex-1">
          <Button className="w-full">
            <Gamepad2 className="h-4 w-4" /> O'ynash
          </Button>
        </Link>
        <Link href={`/games/${game.id}/edit`}>
          <Button variant="secondary" title="Tahrirlash">
            <Pencil className="h-4 w-4" />
          </Button>
        </Link>
        <Button variant="ghost" onClick={copy} title="Havolani nusxalash">
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </Button>
        {confirming ? (
          <>
            <Button variant="danger" className="px-2 py-1 text-xs" onClick={remove}>
              O'chirish
            </Button>
            <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setConfirming(false)}>
              Yo'q
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={() => setConfirming(true)} title="O'chirish">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}
