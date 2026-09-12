import { NextResponse, type NextRequest } from "next/server";
import { ingestBook, listBookMetas, saveBook } from "@/lib/books/store";
import type { BookPage } from "@/lib/books/segment";
import type { SubjectKey } from "@/lib/books/types";
import { normalizeGrade, TEXT_PAGE_CHARS } from "@/lib/config";

// ============================================================================
// POST /api/books/ingest
//   Kitob matnini yuborib, mavzular va o'yinlar yaratish.
//
//   { "title": "Matematika 3-sinf",
//     "grade": 3,
//     "subject": "matematika",           // ixtiyoriy (bo'lmasa nomdan taxmin qilinadi)
//     "text": "1-MAVZU ..." }            // butun kitob matni
//
//   yoki PDF'dan olingan sahifalar bilan:
//   { "pages": [{ "page": 1, "text": "..." }, ...] }
//
// GET /api/books/ingest → barcha kitoblar ro'yxati (meta)
// ============================================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const books = await listBookMetas();
  return NextResponse.json({
    count: books.length,
    books: books.map((b) => ({
      id: b.id,
      title: b.title,
      subject: b.subject,
      grade: b.grade,
      topics: b.stats.topics,
      games: b.stats.games,
      items: b.stats.items,
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      title?: string;
      grade?: number;
      subject?: SubjectKey;
      fileName?: string;
      text?: string;
      pages?: BookPage[];
    };

    let pages: BookPage[] = [];
    let chars = 0;

    if (Array.isArray(body.pages) && body.pages.length) {
      pages = body.pages
        .filter((p) => p && typeof p.text === "string")
        .map((p) => ({ page: Number(p.page) || 1, text: p.text }));
      chars = pages.reduce((s, p) => s + p.text.length, 0);
    } else if (typeof body.text === "string" && body.text.trim()) {
      const text = body.text;
      chars = text.length;
      for (let i = 0, page = 1; i < text.length; i += TEXT_PAGE_CHARS, page++) {
        const chunk = text.slice(i, i + TEXT_PAGE_CHARS);
        if (chunk.trim()) pages.push({ page, text: chunk });
      }
    }

    if (!pages.length) {
      return NextResponse.json({ error: "Kitob matni yuborilmadi (text yoki pages kerak)." }, { status: 400 });
    }

    const title = body.title?.trim() || body.fileName?.replace(/\.[^.]+$/, "") || "Nomsiz kitob";
    const { book, report } = ingestBook({
      title,
      grade: normalizeGrade(body.grade),
      subject: body.subject,
      fileName: body.fileName || `${title}.txt`,
      sizeBytes: chars,
      kind: Array.isArray(body.pages) ? "pdf" : "matn",
      pages,
    });

    await saveBook(book);

    return NextResponse.json({
      bookId: book.id,
      title: book.title,
      subject: book.subject,
      strategy: report.strategy,
      notes: report.notes,
      scannedPdf: report.scannedPdf,
      stats: book.stats,
      topics: book.topics.map((t) => ({
        index: t.index,
        title: t.title,
        pages: `${t.pageStart}-${t.pageEnd}`,
        games: t.games.map((g) => ({
          id: g.id,
          type: g.type,
          title: g.title,
          items: g.items.length,
        })),
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Kitobni qayta ishlashda xato" },
      { status: 500 }
    );
  }
}
