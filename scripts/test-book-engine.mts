/**
 * Kitob → O'yin dvigatelini sinash (namuna kitoblar ustida).
 *   npx tsx scripts/test-book-engine.mts
 */
import { SAMPLE_BOOKS } from "../src/lib/books/samples";
import { segmentBook } from "../src/lib/books/segment";
import { GAME_TYPES } from "../src/lib/books/types";

const books = SAMPLE_BOOKS();
let totalGames = 0;
let totalItems = 0;

for (const b of books) {
  console.log(`\n=================================================================`);
  console.log(`${b.subjectLabel.toUpperCase()} — ${b.title}`);
  console.log(`Mavzular: ${b.stats.topics} · O'yinlar: ${b.stats.games} · Elementlar: ${b.stats.items}`);
  console.log(`=================================================================`);
  for (const t of b.topics) {
    console.log(`\n  ${t.index}. ${t.title}  [${t.pageStart}–${t.pageEnd}-bet]`);
    console.log(`     kalit so'zlar: ${t.keywords.slice(0, 6).join(", ")}`);
    console.log(`     misollar: ${t.examples.length} ta`);
    for (const g of t.games) {
      totalGames++;
      totalItems += g.items.length;
      const meta = GAME_TYPES[g.type];
      console.log(`     ${meta.emoji} ${g.title} (${g.items.length} element, qiyinlik ${g.difficulty})`);
      const sample = g.items[0] as Record<string, unknown>;
      const preview =
        "question" in sample
          ? `${sample.question} → ${(sample.options as string[])[sample.answer as number]}`
          : "expression" in sample
            ? `${sample.expression} → ${sample.answer}`
            : "sentence" in sample
              ? `${sample.sentence} → ${sample.answer}`
              : "statement" in sample
                ? `${sample.statement} → ${sample.isTrue ? "to'g'ri" : "noto'g'ri"}`
                : "tokens" in sample
                  ? `${sample.prompt}: ${(sample.tokens as string[]).join(" / ").slice(0, 70)}`
                  : `"${sample.left}" — "${sample.right}"`;
      console.log(`        misol: ${String(preview).slice(0, 120)}`);
    }
  }
}

console.log(`\n\n=== JAMI: ${books.length} kitob, ${totalGames} o'yin, ${totalItems} element ===\n`);

// ---------------------------------------------------------------------------
// Mundarijadan mavzularga bo'lish sinovi (sun'iy 200 betli kitob)
// ---------------------------------------------------------------------------
const pages = [];
for (let i = 1; i <= 200; i++) {
  if (i >= 5 && i <= 8) {
    const n = i - 4;
    pages.push({ page: i, text: `MUNDARIJA\n1-mavzu. Sonlar va amallar ......... ${20 + (n - 1) * 25}\n2-mavzu. Kasrlar ......... ${45 + (n - 1) * 25}\n3-mavzu. Geometriya ......... ${70 + (n - 1) * 25}\n4-mavzu. Masalalar ......... ${95 + (n - 1) * 25}\n5-mavzu. O'lchovlar ......... ${120 + (n - 1) * 25}\n6-mavzu. Takrorlash ......... ${145 + (n - 1) * 25}` });
    continue;
  }
  if (i > 10 && i % 25 === 11) {
    const n = Math.floor((i - 11) / 25) + 1;
    pages.push({ page: i, text: `${n}-MAVZU\n\nMisol: ${n * 10} + ${n * 5} = ${n * 15}\nQoida: Bu ${n}-mavzuning qoidasi shu yerda yozilgan.\n1. Hisoblang: ${n * 7} + ${n * 3} = ?\n2. Masala: ${n * 10} ta olma bor edi, ${n * 2} tasi yeyildi. Nechta qoldi?` });
    continue;
  }
  pages.push({ page: i, text: `${i}-bet matni. Bu yerda darslikning oddiy matni yozilgan va u bir necha gaplardan iborat. O'quvchilar bu matnni o'qib o'rganadilar.` });
}
const { topics, report } = segmentBook(pages, "Sinov kitobi");
console.log(`SEGMENT SINOVI: strategiya=${report.strategy}, mavzular=${topics.length}`);
topics.slice(0, 4).forEach((t) => console.log(`   • ${t.title} [${t.pageStart}–${t.pageEnd}]`));
console.log(`   ... oxirgisi: ${topics[topics.length - 1].title} [${topics[topics.length - 1].pageStart}–${topics[topics.length - 1].pageEnd}]`);
