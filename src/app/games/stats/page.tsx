import Link from "next/link";
import { BarChart3, Gamepad2, Layers, Trophy, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge, Card, EmptyState } from "@/components/ui";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RecentResults } from "@/components/games/RecentResults";
import { GAME_TYPES } from "@/lib/books/types";
import { listBookMetas, listResults } from "@/lib/books/store";
import { listCustomGames } from "@/lib/books/custom";
import { formatDuration, formatWhen, summarizeGameResults } from "@/lib/books/game-stats";

export const dynamic = "force-dynamic";

// ============================================================================
// O'yinlar statistikasi
//
// Barcha saqlangan natijalar (kitob o'yinlari + o'qituvchi o'yinlari) shu
// yerda jamlanadi. Bir qurilmada 2–3 kishi o'ynalganda har o'yinchining
// natijasi ALOHIDA yozuv bo'lib saqlanadi, shuning uchun jadvalda har biri
// o'z ismi bilan ko'rinadi.
// ============================================================================

export default async function GameStatsPage() {
  const [results, books, customGames] = await Promise.all([
    listResults(),
    listBookMetas(),
    listCustomGames(),
  ]);

  const summary = summarizeGameResults(results, 60);
  const bookTitle = (id: string) => books.find((b) => b.id === id)?.title;

  const rows = summary.recent.map((r) => {
    const meta = GAME_TYPES[r.gameType] ?? { label: r.gameType, emoji: "🎮" };
    return {
      id: r.id,
      when: formatWhen(r.createdAt),
      playerName: (r.studentName ?? "").trim() || "Mehmon",
      studentId: r.studentId ?? null,
      gameTitle: r.gameTitle || bookTitle(r.bookId ?? "") || "O'yin",
      typeLabel: meta.label,
      emoji: meta.emoji,
      score: r.score,
      total: r.total,
      percent: r.total ? Math.round((r.score / r.total) * 100) : 0,
      timeLabel: formatDuration(r.timeSec),
    };
  });

  return (
    <>
      <PageHeader
        title="O'yinlar statistikasi"
        description="Kitob va o'qituvchi o'yinlari bo'yicha saqlangan natijalar — o'quvchilar, o'yinlar va turlar kesimida"
        action={
          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 sm:flex">
            <Gamepad2 className="h-4 w-4 text-indigo-600" />
            {customGames.length} o'qituvchi o'yini · {books.length} kitob
          </div>
        }
      />

      {summary.plays === 0 ? (
        <Card>
          <EmptyState
            icon={<BarChart3 className="h-5 w-5" />}
            title="Hozircha saqlangan natija yo'q"
            description="O'yinni o'ynab, oxirida «Saqlash» tugmasini bosing — natija shu sahifada ko'rinadi. Bir qurilmada 2–3 kishi o'ynalsa, har o'yinchi alohida qator bo'lib tushadi."
          />
          <div className="flex justify-center gap-2 border-t border-slate-100 px-4 py-3">
            <Link
              href="/games"
              className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              O'yinlarga o'tish
            </Link>
            <Link
              href="/books"
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Kitoblar
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Jami o'ynashlar"
              value={String(summary.plays)}
              hint={`${summary.games} ta o'yin o'ynalgan`}
              icon={<Gamepad2 className="h-5 w-5" />}
              tone="indigo"
            />
            <MetricCard
              label="O'rtacha natija"
              value={`${summary.percent}%`}
              hint={`${summary.score} / ${summary.total} to'g'ri`}
              icon={<Trophy className="h-5 w-5" />}
              tone="amber"
            />
            <MetricCard
              label="O'yinchilar"
              value={String(summary.players)}
              hint={`${summary.withStudent} yozuv o'quvchiga bog'langan`}
              icon={<Users className="h-5 w-5" />}
              tone="emerald"
            />
            <MetricCard
              label="Ko'p kishilik yozuvlar"
              value={String(summary.guest)}
              hint="Ism bilan saqlangan (o'quvchi tanlanmagan)"
              icon={<Layers className="h-5 w-5" />}
              tone="violet"
            />
          </div>

          <div className="mb-4 grid gap-4 lg:grid-cols-3">
            {/* -------------------------- Eng faol o'yinchilar -------------------------- */}
            <Card className="p-4 lg:col-span-1">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Trophy className="h-4 w-4 text-amber-500" /> Eng yaxshi o'yinchilar
              </h3>
              <div className="space-y-1.5">
                {summary.byPlayer.slice(0, 10).map((row, i) => (
                  <div key={`${row.name}-${i}`} className="flex items-center gap-3 text-sm">
                    <span
                      className={
                        i === 0
                          ? "flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700"
                          : i === 1
                            ? "flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600"
                            : i === 2
                              ? "flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700"
                              : "flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500"
                      }
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-slate-700">
                      {row.name}
                      {!row.studentId ? <span className="ml-1 text-[10px] text-slate-400">· ism</span> : null}
                    </span>
                    <span className="text-xs text-slate-400">{row.played} o'yin</span>
                    <span className="font-semibold text-emerald-600">{row.percent}%</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* ---------------------------- O'yinlar kesimida --------------------------- */}
            <Card className="overflow-hidden lg:col-span-2">
              <div className="border-b border-slate-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-900">O'yinlar kesimida</h3>
                <p className="text-xs text-slate-500">
                  Qaysi o'yin ko'p o'ynalgan va o'rtacha natija qanday
                </p>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">O'yin</th>
                      <th className="px-4 py-2 text-right font-medium">O'ynashlar</th>
                      <th className="px-4 py-2 text-right font-medium">O'yinchilar</th>
                      <th className="px-4 py-2 text-right font-medium">O'rtacha</th>
                      <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">Eng yaxshi</th>
                      <th className="hidden px-4 py-2 text-right font-medium md:table-cell">Oxirgi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.byGame.slice(0, 25).map((g) => {
                      const meta = GAME_TYPES[g.type] ?? { label: g.type, emoji: "🎮" };
                      return (
                        <tr key={g.gameId} className="hover:bg-slate-50/70">
                          <td className="max-w-[16rem] px-4 py-2">
                            <span className="block truncate font-medium text-slate-800">
                              {meta.emoji} {g.title}
                            </span>
                            <span className="text-[11px] text-slate-400">{meta.label}</span>
                          </td>
                          <td className="px-4 py-2 text-right text-slate-700">{g.played}</td>
                          <td className="px-4 py-2 text-right text-slate-700">{g.players}</td>
                          <td className="px-4 py-2 text-right">
                            <Badge
                              className={
                                g.percent >= 70
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : g.percent >= 40
                                    ? "border-amber-200 bg-amber-50 text-amber-700"
                                    : "border-slate-200 bg-slate-50 text-slate-600"
                              }
                            >
                              {g.percent}%
                            </Badge>
                          </td>
                          <td className="hidden px-4 py-2 text-right text-slate-600 sm:table-cell">{g.best}%</td>
                          <td className="hidden px-4 py-2 text-right text-xs text-slate-400 md:table-cell">
                            {formatWhen(g.lastAt).slice(0, 10)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* ---------------------------- Turlar kesimida ---------------------------- */}
          {summary.byType.length ? (
            <Card className="mb-4 p-4">
              <h3 className="mb-2.5 text-sm font-semibold text-slate-900">O'yin turlari kesimida</h3>
              <div className="flex flex-wrap gap-2">
                {summary.byType.map((t) => {
                  const meta = GAME_TYPES[t.type] ?? { label: t.type, emoji: "🎮", color: "border-slate-200 bg-slate-50 text-slate-600" };
                  return (
                    <span
                      key={t.type}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${meta.color}`}
                    >
                      {meta.emoji} {meta.label}
                      <span className="rounded-full bg-white/70 px-1.5 text-[10px] font-bold">
                        {t.played} · {t.percent}%
                      </span>
                    </span>
                  );
                })}
              </div>
            </Card>
          ) : null}

          <RecentResults rows={rows} />

          <p className="mt-4 text-center text-xs text-slate-400">
            Bir qurilmada 2–3 kishi o'ynalganda har o'yinchining natijasi alohida yozuv bo'lib saqlanadi —
            jadvalda har biri o'z ismi bilan ko'rinadi.
          </p>
        </>
      )}
    </>
  );
}
