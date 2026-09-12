import Link from "next/link";
import { Gamepad2, Plus, Sparkles, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button, Card, EmptyState } from "@/components/ui";
import { Badge } from "@/components/ui";
import { GAME_TYPES } from "@/lib/books/types";
import { listCustomGames } from "@/lib/books/custom";
import { listBookMetas } from "@/lib/books/store";
import { CustomGameList } from "@/components/games/CustomGameList";

export const dynamic = "force-dynamic";

export default async function GamesPage() {
  const [games, books] = await Promise.all([listCustomGames(), listBookMetas()]);

  return (
    <>
      <PageHeader
        title="O'qituvchi o'yinlari"
        description="O'z so'zlaringiz, misollaringiz va savollaringiz bilan o'yin yasang — yoki sinf bilan o'ynaladigan formatlardan foydalaning"
        action={
          <Link href="/games/new">
            <Button>
              <Plus className="h-4 w-4" /> Yangi o'yin yasash
            </Button>
          </Link>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Link href="/games/new" className="group">
          <Card className="h-full p-4 transition-all group-hover:border-indigo-300 group-hover:shadow-sm">
            <div className="mb-2 inline-flex rounded-xl bg-indigo-50 p-2 text-indigo-600">
              <Wand2 className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-slate-900">O'z o'yiningizni yasang</p>
            <p className="mt-0.5 text-xs text-slate-500">
              12 xil o'yin turi · o'z so'zlaringiz, misollaringiz, savollaringiz bilan
            </p>
          </Card>
        </Link>
        <Link href="/classroom" className="group">
          <Card className="h-full p-4 transition-all group-hover:border-violet-300 group-hover:shadow-sm">
            <div className="mb-2 inline-flex rounded-xl bg-violet-50 p-2 text-violet-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-slate-900">Sinf bilan o'ynash</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Charxpalak · Guruhlar viktorinasi · Bingo kartalari
            </p>
          </Card>
        </Link>
        <Link href="/books" className="group">
          <Card className="h-full p-4 transition-all group-hover:border-emerald-300 group-hover:shadow-sm">
            <div className="mb-2 inline-flex rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <Gamepad2 className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-slate-900">Kitoblardan o'yinlar</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {books.length} kitob · avtomatik yasalgan {books.reduce((s, b) => s + b.stats.games, 0)} o'yin
            </p>
          </Card>
        </Link>
      </div>

      <h2 className="mb-3 text-sm font-semibold text-slate-900">
        Mening o'yinlarim {games.length ? `(${games.length})` : ""}
      </h2>

      {games.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wand2 className="h-5 w-5" />}
            title="Hozircha o'z o'yiningiz yo'q"
            description="«Yangi o'yin yasash» tugmasini bosing: o'yin turini tanlang, so'zlaringizni yozing — tizim qolganini o'zi qiladi."
          />
        </Card>
      ) : (
        <CustomGameList
          games={games.map((g) => ({
            id: g.id,
            title: g.title,
            type: g.type,
            typeLabel: GAME_TYPES[g.type].label,
            emoji: GAME_TYPES[g.type].emoji,
            items: g.items.length,
            subject: g.subject,
            grade: g.grade,
            note: g.builtFrom.note,
            createdAt: g.createdAt ?? "",
            bookId: g.bookId,
            bookTitle: books.find((b) => b.id === g.bookId)?.title,
          }))}
        />
      )}

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Kitob o'yinlaridagi namunalar</h2>
        <div className="flex flex-wrap gap-1.5">
          {Object.values(GAME_TYPES).map((t) => (
            <Badge key={t.key} className={t.color}>
              {t.emoji} {t.label}
            </Badge>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Har bir tur o'qituvchi muharririda ham mavjud — o'z materialingiz bilan xuddi shunday o'yin yasashingiz mumkin.
        </p>
      </div>
    </>
  );
}
