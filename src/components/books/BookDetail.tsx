"use client";

// ============================================================================
// Kitob sahifasi: mavzular ro'yxati va har bir mavzu ichidagi o'yinlar
// ============================================================================

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  FileText,
  Gamepad2,
  Layers,
  ListOrdered,
  Sparkles,
  Trophy,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EXAMPLE_LABELS,
  GAME_TYPES,
  SUBJECTS,
  type Book,
  type Game,
  type Topic,
} from "@/lib/books/types";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import type { LeaderRow } from "@/lib/books/store";

export type TopicCard = Omit<Topic, "text"> & { textPreview: string };

export interface BookPayload {
  id: string;
  title: string;
  grade: number;
  subjectLabel: string;
  author?: string;
  mode: string;
  stats: Book["stats"];
  source: Book["source"];
  topics: TopicCard[];
}

export interface CustomGameCard {
  id: string;
  title: string;
  type: string;
  typeLabel: string;
  emoji: string;
  items: number;
  note: string;
}

export function BookDetail({
  book,
  leaderboard,
  customGames = [],
}: {
  book: BookPayload;
  leaderboard: LeaderRow[];
  customGames?: CustomGameCard[];
}) {
  const subjectMeta = Object.values(SUBJECTS).find((s) => s.label === book.subjectLabel) ?? SUBJECTS.boshqa;
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className={cn("bg-gradient-to-r px-5 py-5 text-white", subjectMeta.gradient)}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-white/80">
                {subjectMeta.emoji} {book.subjectLabel} · {book.grade}-sinf
              </p>
              <h1 className="mt-1 text-2xl font-bold">{book.title}</h1>
              {book.author ? <p className="mt-1 text-xs text-white/80">{book.author}</p> : null}
            </div>
            <Link href="/books">
              <Button variant="secondary" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                ← Kitoblar
              </Button>
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Pill icon={<Layers className="h-3 w-3" />} text={`${book.stats.topics} mavzu`} />
            <Pill icon={<Gamepad2 className="h-3 w-3" />} text={`${book.stats.games} o'yin`} />
            <Pill icon={<Sparkles className="h-3 w-3" />} text={`${book.stats.items} savol`} />
            <Pill icon={<FileText className="h-3 w-3" />} text={`${book.stats.pages} bet · ${Math.round(book.stats.chars / 1000)} ming belgi`} />
            <Pill
              text={book.mode === "namuna" ? "Namuna kitob" : "Yuklangan kitob"}
            />
          </div>
        </div>

        {book.source.scanWarn ? (
          <div className="border-t border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-800">
            ⚠️ Bu PDF'dan matn juda kam chiqdi — kitob skanerlangan (rasm) bo'lishi mumkin. Bunday holda
            kitob matnini «matn joylash» usulida qo'lda kiritsangiz, o'yinlar to'liq yasaladi.
          </div>
        ) : null}
      </Card>

      {leaderboard.length ? (
        <Card className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Trophy className="h-4 w-4 text-amber-500" /> Eng yaxshi natijalar
          </h3>
          <div className="space-y-1.5">
            {leaderboard.slice(0, 5).map((row, i) => (
              <div key={row.name} className="flex items-center gap-3 text-sm">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                    i === 0
                      ? "bg-amber-100 text-amber-700"
                      : i === 1
                        ? "bg-slate-200 text-slate-600"
                        : i === 2
                          ? "bg-orange-100 text-orange-700"
                          : "bg-slate-100 text-slate-500"
                  )}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-slate-700">{row.name}</span>
                <span className="text-xs text-slate-400">{row.played} o'yin</span>
                <span className="font-semibold text-emerald-600">{row.percent}%</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {/* ------------------- O'qituvchi yasagan o'yinlar ---------------------- */}
      {customGames.length ? (
        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Wand2 className="h-4 w-4 text-violet-600" /> O'qituvchi yasagan o'yinlar ({customGames.length})
            </h3>
            <Link href="/games/new" className="text-xs font-medium text-indigo-600 hover:underline">
              + Yangi o'yin yasash
            </Link>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {customGames.map((g) => (
              <Link key={g.id} href={`/games/${g.id}`} className="group">
                <div className="flex h-full flex-col gap-1.5 rounded-xl border border-violet-200 bg-violet-50/40 p-3 transition-all group-hover:border-violet-400">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl">{g.emoji}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{g.title}</p>
                      <p className="text-[11px] text-slate-500">
                        {g.typeLabel} · {g.items} element
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">{g.note}</p>
                  <span className="mt-auto text-xs font-medium text-violet-600 group-hover:underline">
                    O'ynash →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      {/* ------------------------------ Mavzular ------------------------------ */}
      {book.topics.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Layers className="h-5 w-5" />}
            title="Mavzular topilmadi"
            description="Bu kitobdan matn ajratib bo'lmadi. Kitobni qayta yuklab ko'ring."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {book.topics.map((topic, i) => (
            <TopicBlock
              key={topic.id}
              bookId={book.id}
              topic={topic}
              open={open === i}
              onToggle={() => setOpen(open === i ? null : i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Pill({ icon, text }: { icon?: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 font-medium">
      {icon}
      {text}
    </span>
  );
}

function TopicBlock({
  bookId,
  topic,
  open,
  onToggle,
}: {
  bookId: string;
  topic: TopicCard;
  open: boolean;
  onToggle: () => void;
}) {
  const [showExtras, setShowExtras] = useState(false);
  const totalItems = topic.games.reduce((s, g) => s + g.items.length, 0);

  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm font-bold text-indigo-600">
          {topic.index}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-900">{topic.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {topic.section ? <span className="truncate">{topic.section}</span> : null}
            <span>
              {topic.pageStart}–{topic.pageEnd}-bet
            </span>
            <span className="text-emerald-600">{topic.games.length} o'yin</span>
            <span className="text-indigo-600">{totalItems} savol</span>
            {topic.examples.length ? <span>{topic.examples.length} misol</span> : null}
          </span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="border-t border-slate-100 px-4 py-4">
          {topic.games.length === 0 ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Bu mavzudan o'yin yasash uchun material topilmadi. Mavzu matnini ko'rib chiqing yoki kitobni
              boshqa fan bilan qayta tahlil qiling.
            </p>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {topic.games.map((game) => (
                <GameCard key={game.id} bookId={bookId} game={game} />
              ))}
            </div>
          )}

          <div className="mt-4">
            <button
              onClick={() => setShowExtras((v) => !v)}
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              {showExtras ? "− Mavzu tafsilotlarini yopish" : "+ Mavzu matni, misollar va kalit so'zlar"}
            </button>

            {showExtras ? (
              <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                {topic.keywords.length ? (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-slate-600">Kalit so'zlar</p>
                    <div className="flex flex-wrap gap-1.5">
                      {topic.keywords.map((k) => (
                        <span key={k} className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {topic.examples.length ? (
                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <ListOrdered className="h-3.5 w-3.5" /> Kitobdan olingan misollar ({topic.examples.length})
                    </p>
                    <ul className="space-y-1">
                      {topic.examples.slice(0, 12).map((ex) => (
                        <li key={ex.id} className="flex gap-2 text-xs text-slate-600">
                          <span className="shrink-0 rounded bg-indigo-50 px-1.5 text-[10px] font-medium text-indigo-600">
                            {EXAMPLE_LABELS[ex.kind]}
                          </span>
                          <span className="flex-1">{ex.text}</span>
                          <span className="shrink-0 text-slate-400">{ex.page}-bet</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div>
                  <p className="mb-1.5 text-xs font-semibold text-slate-600">Mavzu matni (qisqartirilgan)</p>
                  <p className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-xs leading-relaxed text-slate-600">
                    {topic.textPreview}
                    {topic.textPreview.length >= 1200 ? "…" : ""}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function GameCard({ bookId, game }: { bookId: string; game: Game }) {
  const meta = GAME_TYPES[game.type];
  return (
    <Link href={`/books/${bookId}/play/${game.id}`} className="group block">
      <div className="flex h-full flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 transition-all group-hover:border-indigo-300 group-hover:shadow-sm">
        <div className="flex items-start gap-2">
          <span className="text-2xl">{meta.emoji}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">{game.title}</p>
            <p className="text-[11px] text-slate-500">
              {game.items.length} savol · {"⭐".repeat(game.difficulty)}
            </p>
          </div>
        </div>
        <p className="text-[11px] leading-snug text-slate-500">{game.builtFrom.note}</p>
        <div className="mt-auto flex items-center justify-between">
          <Badge className={meta.color}>{meta.label}</Badge>
          <span className="text-xs font-medium text-indigo-600 group-hover:underline">O'ynash →</span>
        </div>
      </div>
    </Link>
  );
}
