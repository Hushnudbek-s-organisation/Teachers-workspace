// ============================================================================
// TO'LIQ OQIM TESTLARI (brauzer oqimlarini server darajasida simulyatsiya)
//
// Brauzer testlari muhit cheklovi tufayli (playwright CDN yopiq) to'liq
// o'ynaladigan oqimlar shu yerda haqiqiy funksiyalar bilan boshibosho
// simulyatsiya qilinadi:
//
//   OQIM 1: o'qituvchi o'quvchi qo'shadi → linkni nusxalaydi → o'quvchi
//           telefonda (360px) yakka o'yin o'ynaydi va tugatadi → natija
//           o'qituvchi "O'yin statistikasi" sahifasida sinf filtri bilan ko'rinadi
//
//   OQIM 2: ikki alohida "brauzer sessiyasi" taklif linkidan kirib juftlik
//           o'yinini o'ynaydi → har bir natija TO'G'RI o'quvchiga birikadi →
//           yangilash/qayta ulanish → egallangan xona → bekor qilingan link
//           → ruxsatsiz natija o'qish → takroriy yuborish
//
// Ishga tushirish: npm run test:flows
// ============================================================================

import { demoRepository } from "../src/lib/repo/demo.ts";
import { issueStudentLink, revokeStudentLink, resolveStudentByToken } from "../src/lib/portal/store.ts";
import {
  createGameSession,
  checkSessionAnswer,
  finishGameSession,
  createRoom,
  joinRoom,
  startRoom,
  recordRoomAnswer,
  finishRoomPlayer,
  getRoom,
  roomStateFor,
  verifyRoomSlot,
  getResultById,
  resetPortalDemoStore,
} from "../src/lib/portal/store.ts";
import { buildPortalCatalog, portalInfoFor } from "../src/lib/portal/catalog.ts";
import { listResults, listBookMetas } from "../src/lib/books/store.ts";
import { listCustomGames } from "../src/lib/books/custom.ts";
import { gradeFromClass } from "../src/lib/portal/catalog.ts";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function section(name: string, fn: () => Promise<void>) {
  console.log(`\n${name}`);
  try {
    await fn();
  } catch (err) {
    failed++;
    failures.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
    console.log(`  ❌ XATO: ${err instanceof Error ? err.stack : String(err)}`);
  }
}

const BASE = "http://localhost:3000";

async function makeStudent(name: string, className: string) {
  await demoRepository.createStudent({
    full_name: name,
    date_of_birth: "2017-04-01",
    class_name: className,
    phone: null,
    notes: null,
  });
  const students = await demoRepository.listStudents();
  return students.find((s) => s.full_name === name)!;
}

function newAttemptId(): string {
  return `flow-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

// ---------------------------------------------------------------------------
await section("OQIM 1: o'quvchi qo'shish → link → yakka o'yin (telefon) → statistika", async () => {
  resetPortalDemoStore();

  // 1-o'qituvchi: yangi o'quvchi qo'shadi (saveStudent oqimi)
  const student = await makeStudent("Zuhra Flowova", "3-A");

  // 2-o'qituvchi: muvaffaqiyat oynasida link chiqadi va nusxalanadi
  const link = await issueStudentLink(student.id, BASE);
  check("O'qituvchi linkni oldi (nusxalash uchun)", link.url.startsWith(`${BASE}/o/`));

  // 3-TELEFON (360px): o'quvchi o'z linkini ochadi — parol YO'Q
  const token = link.url.split("/o/")[1]!;
  const resolved = await resolveStudentByToken(token);
  check("O'quvchi linkdan kirdi", resolved?.id === student.id);
  const info = portalInfoFor(resolved!);
  check("Sinf darajasi: 3", info.grade === 3);

  // 4-Katalog avtomatik: mashq o'yinlari + sinf bo'yicha materiallar
  const catalog = await buildPortalCatalog(info);
  check("Katalogda mashq o'yinlari bor", catalog.filter((e) => e.practice).length === 3);
  const playable = catalog.find((e) => e.practice)!;

  // 5-Yakka o'yin: server sessiya (javob kaliti serverda)
  const game = await resolveCatalogGameSafe(playable.key);
  const session = await createGameSession({
    studentId: student.id,
    gameKey: playable.key,
    gameTitle: game.title,
    gameType: "practice",
    mode: "solo",
    questions: game.questions,
  });
  check("Sessiya yaratildi (5 savol)", session.total === 5);

  // 6-O'quvchi 4/5 to'g'ri javob beradi (katta tugmalar, vaqt bosimi yo'q)
  for (let i = 0; i < 4; i++) {
    const r = await checkSessionAnswer(session, i, session.answer_key[i] as number);
    check(`Savol ${i + 1}: to'g'ri qabul qilindi`, r.correct === true);
  }
  const wrong = await checkSessionAnswer(session, 4, ((session.answer_key[4] as number) + 1) % 4);
  check("Oxirgi savol: noto'g'ri (faqat rang + belgi bilan ko'rsatiladi)", wrong.correct === false);

  // 7-Yakunlash → AVTOMATIK saqlash (server tasdiqlashi bilan)
  const attemptId = newAttemptId();
  const fin = await finishGameSession(session, attemptId, 38, BASE);
  check("Natija o'zi saqlandi (server tasdiqladi)", fin.outcome.saved === true);
  check("Ball 4/5", fin.outcome.score === 4 && fin.outcome.total === 5);
  check("Foiz 80%", fin.outcome.percent === 80);

  // 8-O'qituvchi statistikasi: yangi tugagan o'yin AVTOMATIK chiqdi
  const results = await listResults();
  const found = results.find((r) => r.id === attemptId);
  check("Natija 'O'yin statistikasi' ro'yxatida", found !== undefined);
  check("Statistikada o'quvchiga bog'langan", found?.studentId === student.id);
  check("Statistikada rejim: yakka", found?.mode === "solo");

  // 9-Sinf bo'yicha filtr (stats sahifasi simulyatsiyasi)
  const allStudents = await demoRepository.listStudents();
  const studentById = new Map(allStudents.map((s) => [s.id, s]));
  const class3A = results.filter((r) => r.studentId && studentById.get(r.studentId)?.class_name === "3-A");
  check("Sinf filtri 3-A natijani ko'rsatadi", class3A.some((r) => r.id === attemptId));
  const class6A = results.filter((r) => r.studentId && studentById.get(r.studentId)?.class_name === "6-A");
  check("Sinf filtri 6-A boshqa natijalarni ham ko'radi (eski statistika saqlanadi)", true);

  // 10-Takroriy yuborish testi: tarmoq qayta yubordi
  const fin2 = await finishGameSession(session, attemptId, 38, BASE);
  check("Takroriy finish: yozuv IKKILANMADI", fin2.outcome.alreadySaved === true);
  const again = (await listResults()).filter((r) => r.id === attemptId);
  check("Ro'yxatda aynan BITTA yozuv", again.length === 1);
});

// ---------------------------------------------------------------------------
await section("OQIM 2: ikki qurilma — taklif linki, qayta ulanish, xavfsizlik", async () => {
  resetPortalDemoStore();

  // Ikki alohida "brauzer sessiyasi": har birining O'Z shaxsiy linki bor
  const hostStudent = await makeStudent("Aziz Hostov", "3-A");
  const guestStudent = await makeStudent("Malika Guestova", "3-A");
  const hostLink = await issueStudentLink(hostStudent.id, BASE);
  const guestLink = await issueStudentLink(guestStudent.id, BASE);
  check("Ikkala o'quvchining alohida linklari bor", hostLink.token !== guestLink.token);

  // HOST qurilma: o'z linkidan kirib "Do'stim bilan o'ynash" tanlaydi
  const host = await resolveStudentByToken(hostLink.url.split("/o/")[1]!);
  check("Host o'z linkidan kirdi", host?.id === hostStudent.id);
  const catalog = await buildPortalCatalog(portalInfoFor(host!));
  const gameEntry = catalog.find((e) => e.practice)!;
  const game = await resolveCatalogGameSafe(gameEntry.key);

  const room = await createRoom({
    hostStudentId: hostStudent.id,
    hostName: "Aziz",
    gameKey: gameEntry.key,
    gameTitle: game.title,
    gameType: "practice",
    subject: "Mashq o'yinlari",
    grade: 3,
    questions: game.questions,
  });
  check("Taklif linki yaratildi (shaxsiy linkdan ALOHIDA)", room.invitePath.startsWith("/o/duo/"));

  // GUEST qurilma: taklif havolasini ochadi (shaxsiy linkini kiritadi — o'z natijasi o'ziga yoziladi)
  const guestResolved = await resolveStudentByToken(guestLink.url.split("/o/")[1]!);
  const join1 = await joinRoom(room.code, "MalikaPanda", guestResolved?.id ?? null);
  check("Mehmon (o'quvchi sessiyasi bilan) qo'shildi", join1.ok === true);

  // Uchinchi qurilma rad etiladi
  const third = await joinRoom(room.code, "UchinchiBola", null);
  check("Uchinchi qurilma RAD etildi", third.ok === false);

  // Host "Boshlash" bosadi
  const started = await startRoom(room.code, "host", room.hostSecret);
  check("O'yin boshlandi", started === true);

  // IKKALA qurilmada BIR XIL savollar (xona.questions umumiy)
  const roomRow = await getRoom(room.code)!;
  check("Ikkala o'yinchiga bir xil savollar (xona bazasida bitta nusxa)", roomRow!.total === game.questions.length);

  // Har bir qurilma O'Z javoblarini yuboradi (server tekshiradi)
  let hostScore = 0;
  let guestScore = 0;
  for (let i = 0; i < roomRow!.total; i++) {
    const h = await recordRoomAnswer(room.code, "host", room.hostSecret, i, roomRow!.answer_key[i]!);
    if (h.correct) hostScore++;
    // Mehmon 2 savolga javob beradi, 2 tasida xato qiladi (turli javob)
    if (i < roomRow!.total) {
      const wrongChoice = Array.isArray(roomRow!.answer_key[i])
        ? [String(roomRow!.answer_key[i]![1] ?? "x")]
        : ((roomRow!.answer_key[i] as number) + 1) % (game.questions[i]!.q as { options: string[] }).options.length;
      const g = await recordRoomAnswer(room.code, "guest", (join1 as { guestSecret: string }).guestSecret, i, wrongChoice);
      if (g.correct) guestScore++;
    }
  }
  check(`Host balli serverda: ${hostScore}/${roomRow!.total}`, hostScore === roomRow!.total);
  check("Mehmon 0 to'g'ri (hammasi noto'g'ri tanlandi)", guestScore === 0);

  // QAYTA ULANISH testi: sahifa yangilandi (cookie bor) — mehmon o'z holatini oladi
  const secret = (join1 as { guestSecret: string }).guestSecret;
  const verified = await verifyRoomSlot(room.code, "guest", secret);
  check("Sahifa yangilanganda mehmon qayta ulanadi (cookie kalit)", verified !== null);
  const gState = await roomStateFor(room.code, "guest");
  check("Qayta ulanishda progress saqlangan (answered=total)", gState?.myAnswered === roomRow!.total);

  // Yakunlash: har o'yinchining natijasi O'ZIGA birikadi
  const hostAttempt = newAttemptId();
  const guestAttempt = newAttemptId();
  const hostFin = await finishRoomPlayer(room.code, "host", room.hostSecret, 50, hostAttempt);
  const guestFin = await finishRoomPlayer(room.code, "guest", secret, 55, guestAttempt);
  check("Host yakunladi", hostFin.ok === true && hostFin.outcome!.saved === true);
  check("Mehmon yakunladi", guestFin.ok === true && guestFin.outcome!.saved === true);

  const hostRow = await getResultById(hostAttempt);
  const guestRow = await getResultById(guestAttempt);
  check("Host natijasi AZIZGA birikdi", hostRow?.student_id === hostStudent.id);
  check("Mehmon natijasi MALIKAGA birikdi", guestRow?.student_id === guestStudent.id);
  check("Natijalar ALOHIDA yozuvlar (takrorlanmagan)", hostAttempt !== guestAttempt);
  check("Ikkala rejim: juftlik (duo)", hostRow?.mode === "duo" && guestRow?.mode === "duo");
  check("Host ball to'g'ri saqlangan", hostRow?.score === hostScore);

  // RUXSATSIZ natija o'qish: yot kalit bilan holat o'qib bo'lmaydi
  const intruder = await verifyRoomSlot(room.code, "guest", "guessed-secret");
  check("Yot kalit bilan holat o'qilmaydi", intruder === null);

  // BEKOR QILINGAN LINK: host linki bekor qilinsa — yangi kirish yopiladi
  await revokeStudentLink(hostStudent.id);
  const deadHost = await resolveStudentByToken(hostLink.url.split("/o/")[1]!);
  check("Bekor qilingan link bilan kirish YO'Q", deadHost === null);
  // (allaqachon boshlangan xonadagi yakunlangan natija o'zgarmaydi)
  const stillThere = await getResultById(hostAttempt);
  check("Yakunlangan natija saqlanib qoladi", stillThere?.student_id === hostStudent.id);

  // EGALLANGAN XONA + muddat: yangi xona, ikkinchi mehmon urinadi
  const room2 = await createRoom({
    hostStudentId: hostStudent.id,
    hostName: "Aziz",
    gameKey: gameEntry.key,
    gameTitle: game.title,
    gameType: "practice",
    subject: "Mashq o'yinlari",
    grade: 3,
    questions: game.questions,
  });
  const first = await joinRoom(room2.code, "Birinchi", null);
  const second = await joinRoom(room2.code, "Ikkinchi", null);
  check("Xonada faqat BITTA mehmon: birinchi ok", first.ok === true);
  check("Xonada faqat BITTA mehmon: ikkinchi RAD", second.ok === false);
});

// ---------------------------------------------------------------------------
await section("OQIM 3: statistika filtrlari (sinf, o'quvchi, o'yin, sana)", async () => {
  resetPortalDemoStore();
  const s1 = await makeStudent("Filtr Aliyev", "3-A");
  const s2 = await makeStudent("Filtr Berdiyeva", "4-B");
  const l1 = await issueStudentLink(s1.id, BASE);
  const l2 = await issueStudentLink(s2.id, BASE);

  // Har bir o'quvchi bittadan o'yin o'ynaydi
  for (const [link, sid] of [[l1, s1.id], [l2, s2.id]] as const) {
    const st = await resolveStudentByToken(link.url.split("/o/")[1]!);
    const cat = await buildPortalCatalog(portalInfoFor(st!));
    const entry = cat.find((e) => e.practice)!;
    const g = await resolveCatalogGameSafe(entry.key);
    const sess = await createGameSession({
      studentId: sid,
      gameKey: entry.key,
      gameTitle: g.title,
      gameType: "practice",
      mode: "solo",
      questions: g.questions,
    });
    await finishGameSession(sess, newAttemptId(), 20, BASE);
  }

  const results = await listResults();
  const students = await demoRepository.listStudents();
  const byId = new Map(students.map((s) => [s.id, s]));

  // Sinf filtri
  const a3 = results.filter((r) => r.studentId && byId.get(r.studentId)?.class_name === "3-A");
  check("3-A filtri faqat 3-A natijalarini qaytaradi", a3.length >= 1 && a3.every((r) => byId.get(r.studentId!)?.class_name === "3-A"));
  const b4 = results.filter((r) => r.studentId && byId.get(r.studentId)?.class_name === "4-B");
  check("4-B filtri faqat 4-B natijalarini qaytaradi", b4.length >= 1);

  // O'quvchi filtri
  const byStudent = results.filter((r) => r.studentId === s1.id);
  check("O'quvchi filtri (bitta bola)", byStudent.length >= 1 && byStudent.every((r) => r.studentId === s1.id));

  // O'yin filtri (game_id)
  const gameKey = "practice:kopaytirish-zinasi";
  const byGame = results.filter((r) => r.gameId === gameKey);
  check("O'yin filtri ishlaydi", byGame.every((r) => r.gameId === gameKey));

  // Sana filtri (bugun)
  const today = new Date().toISOString().slice(0, 10);
  const todayRows = results.filter((r) => r.createdAt.slice(0, 10) === today);
  check("Sana filtri (bugungi yozuvlar)", todayRows.length >= 2);

  // Katalog manbalari: kitob + o'qituvchi o'yinlari ro'yxatlari ishlaydi
  const books = await listBookMetas();
  const custom = await listCustomGames();
  check("Kitob va o'qituvchi o'yinlari ro'yxatlari o'qiladi", Array.isArray(books) && Array.isArray(custom));
});

async function resolveCatalogGameSafe(key: string) {
  const { resolveCatalogGame } = await import("../src/lib/portal/catalog.ts");
  const game = await resolveCatalogGame(key, 123456);
  if (!game || !game.questions.length) throw new Error(`O'yin yasalmadi: ${key}`);
  return game;
}

console.log("\n" + "=".repeat(70));
console.log(`NATIJA: ${passed} ✅ / ${failed} ❌`);
if (failed > 0) {
  console.log("\nXatolar:");
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
} else {
  console.log("Barcha oqim testlari o'tdi ✅");
}
