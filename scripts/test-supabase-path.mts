/**
 * Supabase yo'lini tekshirish: ilova Supabase rejimida to'g'ri ishlayaptimi?
 *
 * Supabase serverga haqiqiy so'rov yubormasdan, `fetch` ni almashtiramiz va
 * ilova yozadigan qatorlarni ushlab olamiz. Keyin o'sha qatorlarni PGlite'dagi
 * haqiqiy `schema.sql` jadvallariga insert qilib, sxema ularni qabul
 * qilishini tasdiqlaymiz.
 *
 *   npm run test:supabase
 *
 *   (ixtiyoriy) sxema qismini ham tekshirish uchun:
 *   npm i --no-save @electric-sql/pglite
 */
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://stub.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "stub-anon-key";

// ------------------------- Supabase'ni taqlid qiluvchi fetch -------------------------
type Captured = { method: string; table: string; body: unknown };
const captured: Captured[] = [];
let canned: Record<string, unknown[]> = {};

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const method = (init?.method ?? "GET").toUpperCase();
  const u = new URL(url);
  const table = u.pathname.replace("/rest/v1/", "");
  const headers = new Headers(init?.headers as HeadersInit);
  const prefer = headers.get("prefer") ?? "";
  const accept = headers.get("accept") ?? "";

  if (method === "GET") {
    const rows = canned[table] ?? [];
    if (accept.includes("application/vnd.pgrst.object+json")) {
      if (!rows.length) return new Response(JSON.stringify({ message: "no rows" }), { status: 406 });
      return new Response(JSON.stringify(rows[0]), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify(rows), { status: 200, headers: { "content-type": "application/json" } });
  }

  const body = init?.body ? JSON.parse(String(init.body)) : null;
  captured.push({ method, table, body });

  if (method === "DELETE") {
    if (prefer.includes("return=representation")) {
      return new Response(JSON.stringify([{ id: "deleted" }]), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(null, { status: 204 });
  }
  if (prefer.includes("return=representation")) {
    return new Response(JSON.stringify(Array.isArray(body) ? body : [body]), { status: 201, headers: { "content-type": "application/json" } });
  }
  return new Response(null, { status: 201 });
}) as typeof fetch;

const { ingestBook, listUploadedBooks, getBook, saveBook, deleteBook, listBookMetas, saveResult, listResults, leaderboard } =
  await import("../src/lib/books/store");
const { createCustomGame, listCustomGames, getCustomGame, updateCustomGame, deleteCustomGame } = await import("../src/lib/books/custom");

let fails = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(`${cond ? "✅" : "❌"} ${msg}`);
  if (!cond) fails++;
};

// --------------------------------- 1. Kitob ---------------------------------
const text = [
  "MUNDARIJA",
  "",
  "Sonlar bilan ishlash ........ 2",
  "Ko'paytirish va bo'lish ..... 3",
  "",
].join("\n");
const pages = [
  { page: 1, text },
  { page: 2, text: "SONLAR BILAN ISHLASH\n\nMisol: 245 + 132 = 377\nMisol: 460 - 125 = 335\nMasala: 345 ta daftardan 17 tasi sotildi. Nechta qoldi?\n345 - 17 = 328" },
  { page: 3, text: "KO'PAYTIRISH VA BO'LISH\n\nMisol: 12 x 4 = 48\nMisol: 72 : 8 = 9\nMisol: 25 x 3 = 75\nMisol: 96 : 6 = 16" },
];
const { book } = ingestBook({
  title: "Matematika (Supabase tekshiruvi)",
  grade: 4,
  subject: "matematika" as never,
  fileName: "test.pdf",
  sizeBytes: 1000,
  kind: "pdf",
  pages,
});

await saveBook(book);
const bookRow = captured.find((c) => c.table === "books")!.body as Record<string, unknown>;
ok(bookRow.id === book.id && bookRow.grade === 4, `saveBook → books jadvaliga yozdi (id=${String(bookRow.id)}, grade=${String(bookRow.grade)})`);
ok(JSON.stringify((bookRow.stats as { topics: number }).topics) === String(book.topics.length), `saveBook stats.topics = ${String((bookRow.stats as { topics: number }).topics)} (haqiqiy: ${book.topics.length})`);
ok(Array.isArray(bookRow.topic_titles), `saveBook topic_titles ustunini to'ldirdi (${(bookRow.topic_titles as string[]).length} ta)`);

canned = { books: [bookRow] };
const list = await listUploadedBooks();
ok(list.length === 1 && list[0].id === book.id, `listUploadedBooks → Supabase'dan o'qidi (${list.length} ta kitob)`);
ok(list[0].topics.length === book.topics.length, `topics maydoni to'g'ri o'girildi (${list[0].topics.length} mavzu)`);
ok(list[0].stats.games === book.stats.games, `stats.games = ${list[0].stats.games}`);

const metas = await listBookMetas();
ok(metas.length === 1 && metas[0].title === book.title, `listBookMetas → ${metas[0]?.title ?? "?"} (topics maydonisiz)`);

const one = await getBook(book.id);
ok(one?.id === book.id && one?.source.fileName === "test.pdf", `getBook → "${one?.title}" qaytardi`);

// -------------------------------- 2. Natija ---------------------------------
const saved = await saveResult({
  bookId: book.id,
  topicId: book.topics[0].id,
  topicTitle: book.topics[0].title,
  gameId: book.topics[0].games[0].id,
  gameTitle: book.topics[0].games[0].title,
  gameType: book.topics[0].games[0].type,
  studentId: null,
  studentName: "Test O'quvchi",
  score: 8,
  total: 10,
  timeSec: 42,
});
const resultRow = captured.filter((c) => c.table === "game_results").at(-1)!.body as Record<string, unknown>;
ok(resultRow.id === saved.id && resultRow.score === 8, `saveResult → game_results (id=${String(resultRow.id)})`);
canned = { books: [bookRow], game_results: [resultRow] };
const results = await listResults(book.id);
ok(results.length === 1 && results[0].studentName === "Test O'quvchi", `listResults → ${results.length} natija, "${results[0]?.studentName}"`);
const board = await leaderboard(book.id);
ok(board.length === 1 && board[0].percent === 80, `leaderboard → ${board[0]?.name}: ${board[0]?.percent}%`);

// ----------------------------- 3. O'qituvchi o'yini --------------------------
const game = await createCustomGame({
  title: "Mevalar",
  type: "matching",
  subject: "ona-tili",
  grade: 4,
  items: [
    { left: "olma", right: "apple" },
    { left: "uzum", right: "grapes" },
    { left: "sabzi", right: "carrot" },
    { left: "piyoz", right: "onion" },
  ] as never,
});
const gameRow = captured.filter((c) => c.table === "custom_games").at(-1)!.body as Record<string, unknown>;
ok(gameRow.id === game.id && gameRow.type === "matching", `createCustomGame → custom_games (id=${String(gameRow.id)}, type=${String(gameRow.type)})`);
ok(Array.isArray(gameRow.items) && (gameRow.items as unknown[]).length === 4, `items jsonb ga yozildi (${(gameRow.items as unknown[]).length} ta juftlik)`);
canned = { books: [bookRow], game_results: [resultRow], custom_games: [gameRow] };
const games = await listCustomGames();
ok(games.length === 1 && games[0].items.length === 4, `listCustomGames → ${games.length} o'yin, ${games[0]?.items.length} element`);
const got = await getCustomGame(game.id);
ok(got?.title === "Mevalar" && got?.custom === true, `getCustomGame → "${got?.title}" (custom=${String(got?.custom)})`);
const updated = await updateCustomGame(game.id, { title: "Mevalar (yangi)" });
ok(updated?.title === "Mevalar (yangi)" && updated.createdAt === game.createdAt, `updateCustomGame → "${updated?.title}", createdAt saqlandi`);

const delGame = await deleteCustomGame(game.id);
const delBook = await deleteBook(book.id);
ok(delGame && delBook, `deleteCustomGame/deleteBook → ${String(delGame)}/${String(delBook)}`);

// ---------------- 4. Yozilgan qatorlar haqiqiy sxemaga tushadimi? -------------
let PGlite: (new () => { exec: (sql: string) => Promise<unknown>; query: (sql: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> }) | null = null;
try {
  ({ PGlite } = (await import("@electric-sql/pglite")) as never);
} catch {
  console.log("\nℹ️  @electric-sql/pglite o'rnatilmagan — sxema tekshiruvi o'tkazib yuborildi.");
  console.log("    To'liq tekshirish: npm i --no-save @electric-sql/pglite && npm run test:supabase");
}
if (!PGlite) {
  console.log(fails === 0 ? "\n✅ Supabase yo'li ishlaydi" : `\n❌ ${fails} ta tekshiruv o'tmadi`);
  process.exit(fails === 0 ? 0 : 1);
}
const { readFileSync } = await import("node:fs");
const db = new PGlite();
await db.exec(`do $$ begin
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;`);
await db.exec(readFileSync("supabase/schema.sql", "utf8"));

const jsonbCols = new Set(["source", "stats", "topics", "groups", "items", "built_from"]);
const arrayCols = new Set(["topic_titles"]);
for (const c of captured.filter((x) => x.method === "POST" && !x.table.includes("?"))) {
  const rows = Array.isArray(c.body) ? c.body : [c.body];
  for (const row of rows as Record<string, unknown>[]) {
    const cols = Object.keys(row);
    const params = cols.map((col, i) => {
      if (jsonbCols.has(col)) return `$${i + 1}::jsonb`;
      if (arrayCols.has(col)) return `$${i + 1}::text[]`;
      return `$${i + 1}`;
    });
    const values = cols.map((col) => {
      const v = row[col];
      if (jsonbCols.has(col)) return v === null ? null : JSON.stringify(v);
      if (arrayCols.has(col)) return v as never; // pg drayveri massivni o'zi PG formatiga o'giradi
      return v as never;
    });
    try {
      // upsert bilan bir xil xatti-harakat (ilova ham onConflict: id ishlatadi)
      await db.query(
        `insert into ${c.table} (${cols.join(", ")}) values (${params.join(", ")}) on conflict (id) do update set ${cols[1]} = excluded.${cols[1]}`,
        values
      );
    } catch (e) {
      ok(false, `sxema ${c.table} qatorini rad etdi: ${(e as Error).message.split("\n")[0]}`);
    }
  }
}
ok(true, `ilova yozgan ${captured.filter((c) => c.method === "POST").length} so'rov sxema tomonidan qabul qilindi`);

const readB = (await db.query(`select id, title, grade from books`)).rows;
const readG = (await db.query(`select id, title, type from custom_games`)).rows;
const readR = (await db.query(`select id, score, total, student_name from game_results`)).rows;
ok(readB.length === 1 && readG.length === 1 && readR.length === 1, `PGlite'da o'qildi: kitob ${JSON.stringify(readB)}, o'yin ${JSON.stringify(readG)}, natija ${JSON.stringify(readR)}`);

globalThis.fetch = realFetch;
console.log(fails === 0 ? "\n✅ Supabase yo'li (kitob → o'yin natijasi → o'qituvchi o'yini) ishlaydi" : `\n❌ ${fails} ta tekshiruv o'tmadi`);
process.exit(fails === 0 ? 0 : 1);
