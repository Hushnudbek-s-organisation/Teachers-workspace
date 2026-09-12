import { NextResponse, type NextRequest } from "next/server";
import type { GameType, SubjectKey } from "@/lib/books/types";
import { createCustomGame, listCustomGames, normalizeItems, parseCustomItems } from "@/lib/books/custom";

// ============================================================================
// POST /api/games/custom
//   O'qituvchi o'z o'yinini yasaydi (matn yoki tayyor elementlar bilan).
//
//   { "title": "Mevalar", "type": "matching", "subject": "ona-tili", "grade": 3,
//     "text": "olma — apple\nuzum — grape" }
//
//   yoki bir nechta o'yinni birdan:
//   { "games": [ {...}, {...} ] }
//
// GET /api/games/custom → o'qituvchi o'yinlari ro'yxati
// ============================================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface GameInput {
  title?: string;
  type?: GameType;
  subject?: SubjectKey;
  grade?: number;
  text?: string;
  groups?: string[];
  bookId?: string;
  topicId?: string;
  note?: string;
  instructions?: string;
}

async function createFromInput(input: GameInput) {
  const type = (input.type ?? "matching") as GameType;
  const parsed = input.text ? parseCustomItems(input.text, type) : { items: [], problems: [] };
  const items = normalizeItems(parsed.items, type);

  if (!items.length) {
    return { error: "Materialdan hech narsa o'qilmadi.", problems: parsed.problems };
  }

  const game = await createCustomGame({
    title: input.title ?? "Nomsiz o'yin",
    type,
    subject: (input.subject ?? "boshqa") as SubjectKey,
    grade: Number(input.grade) || 3,
    instructions: input.instructions,
    groups: input.groups,
    items,
    note: input.note,
    bookId: input.bookId,
    topicId: input.topicId,
  });

  return {
    id: game.id,
    title: game.title,
    type: game.type,
    items: game.items.length,
    problems: parsed.problems,
    url: `/games/${game.id}`,
  };
}

export async function GET() {
  const games = await listCustomGames();
  return NextResponse.json({
    count: games.length,
    games: games.map((g) => ({
      id: g.id,
      title: g.title,
      type: g.type,
      subject: g.subject,
      grade: g.grade,
      items: g.items.length,
      createdAt: g.createdAt,
      bookId: g.bookId,
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GameInput & { games?: GameInput[] };

    if (Array.isArray(body.games) && body.games.length) {
      const results = [];
      for (const g of body.games.slice(0, 50)) {
        results.push(await createFromInput(g));
      }
      return NextResponse.json({ created: results.filter((r) => !("error" in r)).length, results });
    }

    const result = await createFromInput(body);
    if ("error" in result) return NextResponse.json(result, { status: 400 });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "O'yin yasashda xato" },
      { status: 500 }
    );
  }
}
