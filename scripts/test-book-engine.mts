/**
 * Kitob → O'yin dvigatelini tekshirish: YUKLANGAN kitoblar ustida.
 *
 *   npx tsx scripts/test-book-engine.mts                    # .data/books ichidagi hammasi
 *   npx tsx scripts/test-book-engine.mts .data/books/x.json # bitta kitob
 *
 * Namuna kitoblar olib tashlangan (v3): endi manba — o'qituvchi yuklagan
 * kitoblar. Agar hali kitob yuklanmagan bo'lsa, skript shuni aytadi.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { Book } from "../src/lib/books/types";
import { GAME_TYPES } from "../src/lib/books/types";

const BOOKS_DIR = path.join(process.cwd(), ".data", "books");

async function loadBooks(): Promise<Book[]> {
  const arg = process.argv.slice(2).find((a) => !a.startsWith("--"));
  const files = arg
    ? [arg]
    : (await readdir(BOOKS_DIR).catch(() => [] as string[]))
        .filter((f) => f.endsWith(".json"))
        .map((f) => path.join(BOOKS_DIR, f));

  const books: Book[] = [];
  for (const file of files) {
    try {
      books.push(JSON.parse(await readFile(file, "utf8")) as Book);
    } catch (err) {
      console.warn(`⚠️  ${file} o'qilmadi: ${(err as Error).message}`);
    }
  }
  return books;
}

const books = await loadBooks();

if (!books.length) {
  console.log("Kitob yuklanmagan.");
  console.log("Kitob yuklash: /books sahifasi (PDF yoki matn) yoki npm run dev + /books");
  console.log("Shundan keyin bu skript dvigatelni yuklangan kitoblar ustida sinaydi.");
  process.exit(0);
}

let totalTopics = 0;
let totalGames = 0;
let totalItems = 0;
const byType = new Map<string, number>();

for (const b of books) {
  console.log(`\n=================================================================`);
  console.log(`${b.title} · ${b.grade}-sinf · ${b.subjectLabel}`);
  console.log(`Manba: ${b.source.kind === "pdf" ? "PDF" : "matn"} (${b.source.fileName})`);
  console.log(
    `Mavzular: ${b.stats.topics} · O'yinlar: ${b.stats.games} · Elementlar: ${b.stats.items}`
  );
  console.log(`=================================================================`);
  totalTopics += b.stats.topics;
  for (const t of b.topics) {
    console.log(`\n  ${t.index}. ${t.title}  [${t.pageStart}–${t.pageEnd}-bet]`);
    console.log(`     kalit so'zlar: ${t.keywords.slice(0, 6).join(", ") || "—"}`);
    console.log(`     misollar: ${t.examples.length} ta`);
    for (const g of t.games) {
      totalGames++;
      totalItems += g.items.length;
      byType.set(g.type, (byType.get(g.type) ?? 0) + 1);
      const meta = GAME_TYPES[g.type];
      console.log(`     ${meta.emoji} ${g.title} (${g.items.length} element, qiyinlik ${g.difficulty})`);
      const sample = g.items[0] as Record<string, unknown>;
      const preview =
        "question" in sample
          ? `${sample.question} → ${(sample.options as string[])[sample.answer as number]}`
          : JSON.stringify(sample).slice(0, 90);
      console.log(`        misol: ${preview}`);
    }
  }
}

console.log(`\n================= JAMI =================`);
console.log(`Kitoblar: ${books.length} · Mavzular: ${totalTopics} · O'yinlar: ${totalGames} · Elementlar: ${totalItems}`);
console.log("O'yin turlari bo'yicha:");
for (const [type, count] of [...byType].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${GAME_TYPES[type as keyof typeof GAME_TYPES].emoji} ${type}: ${count}`);
}
