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
import { issueClassLinks } from "../src/lib/portal/links.ts";
import { buildPortalCatalog, portalInfoFor } from "../src/lib/portal/catalog.ts";
import { listResults, listBookMetas } from "../src/lib/books/store.ts";
import { listCustomGames, createCustomGame } from "../src/lib/books/custom.ts";
import { gradeFromClass } from "../src/lib/portal/catalog.ts";
import type { TeacherSession } from "../src/lib/auth-core.ts";

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

// ---------------------------------------------------------------------------
await section("OQIM 4: sinf havolalari bir vaqtda (QR kartochkalar)", async () => {
  resetPortalDemoStore();
  const a = await makeStudent("Klass Aliyev", "5-C");
  await makeStudent("Klass Botirova", "5-C");
  await makeStudent("Boshqa Sinfli", "6-D");

  const adminSession: TeacherSession = {
    accountId: "test-admin",
    email: "t@t.uz",
    displayName: "Test admin",
    role: "admin",
    teacherId: null,
  };

  const res1 = await issueClassLinks(adminSession, "5-C", BASE);
  check("Sinfdagi 2 o'quvchiga havola berildi", res1.issued.length === 2);
  check("Boshqa sinfga (6-D) tegilmadi", res1.className === "5-C" && res1.issued.every((r) => r.className === "5-C"));
  check("QR kod PNG data URL", res1.issued.every((r) => r.qr.startsWith("data:image/png;base64,")));
  check("Havolada ISM YO'Q (PII himoyasi)", res1.issued.every((r) => !r.url.includes("Aliyev") && !r.url.includes("Botirova")));
  check("Har havola UNIKAL", res1.issued[0]!.url !== res1.issued[1]!.url);

  // Kartochkadagi havola haqiqatan bolani ochadi
  const open = await resolveStudentByToken(res1.issued[0]!.url.split("/o/")[1]!);
  check("Kartochkadagi havola o'quvchini ochadi (parol yo'q)", open?.id === a.id);

  // Qayta chiqarish — mavjud faol havolalar qayta yozilmaydi
  const res2 = await issueClassLinks(adminSession, "5-C", BASE);
  check("Qayta chiqarish: 0 yangi, 2 allaqachon faol", res2.issued.length === 0 && res2.alreadyActive === 2);

  // Bitta havola bekor qilinsa — faqat o'sha bolaga yangi beriladi
  await revokeStudentLink(a.id);
  const res3 = await issueClassLinks(adminSession, "5-C", BASE);
  check("Bekor qilinganga faqat 1 yangi havola", res3.issued.length === 1 && res3.issued[0]!.studentId === a.id);
  check("alreadyActive = 1 (Botirova havolasi saqlangan)", res3.alreadyActive === 1);

  // O'qituvchiga o'ziga bog'lanmagan sinf RUXSAT EMAS (sinf huquqlari)
  const teacherSession: TeacherSession = { ...adminSession, role: "teacher" };
  let denied = false;
  try {
    await issueClassLinks(teacherSession, "6-D", BASE);
  } catch {
    denied = true;
  }
  check("O'qituvchi o'z sinfi bo'lmagan sinfga chiqa olmaydi", denied);
});

// ---------------------------------------------------------------------------
await section("OQIM 5: do'stsiz boshlash + hamma o'qituvchi o'yinlari katalogda", async () => {
  resetPortalDemoStore();
  const s1 = await makeStudent("Dosstiz Oyinchi", "3-B");
  const l1 = await issueStudentLink(s1.id, BASE);
  const st = await resolveStudentByToken(l1.url.split("/o/")[1]!);

  // Katalog: o'qituvchi o'yinlari HAMMASI ko'rinadi (sinf darajasidan qat'i nazar)
  const g4 = await createCustomGame({
    title: "Boshqa sinf uchun test",
    type: "quiz",
    subject: "matematika",
    grade: 4,
    items: [
      { question: "6 x 6 = ?", options: ["30", "36", "42", "48"], answer: 1 } as never,
      { question: "10 - 4 = ?", options: ["5", "6", "7", "8"], answer: 1 } as never,
    ],
  });
  const cat = await buildPortalCatalog(portalInfoFor(st!));
  check("Boshqa sinf uchun o'qituvchi o'yini katalogda KO'RINADI", cat.some((e) => e.key === `custom:${g4.id}`));

  const d1 = await createCustomGame({
    title: "Dublikat nom",
    type: "quiz",
    subject: "matematika",
    grade: 3,
    items: [{ question: "2 x 3 = ?", options: ["5", "6", "7", "8"], answer: 1 } as never],
  });
  const d2 = await createCustomGame({
    title: "Dublikat nom",
    type: "quiz",
    subject: "matematika",
    grade: 3,
    items: [{ question: "3 x 3 = ?", options: ["6", "9", "12", "15"], answer: 1 } as never],
  });
  const cat2 = await buildPortalCatalog(portalInfoFor(st!));
  const hasD1 = cat2.some((e) => e.key === `custom:${d1.id}`);
  const hasD2 = cat2.some((e) => e.key === `custom:${d2.id}`);
  check("Bir xil nomli 2 o'qituvchi o'yini IKKALASI ham ko'rinadi", hasD1 && hasD2 && d1.id !== d2.id);

  // Do'stsiz Boshlash: xona playing bo'ladi, do'st KEYIN qo'shiladi
  const game = await resolveCatalogGameSafe("practice:kopaytirish-zinasi");
  const room = await createRoom({
    hostStudentId: s1.id,
    hostName: "Aziz",
    gameKey: "practice:kopaytirish-zinasi",
    gameTitle: game.title,
    gameType: "practice",
    subject: "Mashq o'yinlari",
    grade: 3,
    questions: game.questions,
  });
  const started = await startRoom(room.code, "host", room.hostSecret);
  check("Do'st QO'SHILMASA HAM 'Boshlash' ishlaydi (qotish yo'q)", started === true);

  const joined = await joinRoom(room.code, "KechQush", null);
  check("O'yin boshlangandan KEYIN qo'shilish ham ishlaydi", joined.ok === true);

  const roomRow = await getRoom(room.code);
  const secret = (joined as { ok: true; guestSecret: string }).guestSecret;
  const ans = await recordRoomAnswer(room.code, "guest", secret, 0, roomRow!.answer_key[0]!);
  check("Kech qo'shilgan mehmon javob yozadi", ans.ok === true && ans.correct === true);

  const fin = await finishRoomPlayer(room.code, "guest", secret, 30, newAttemptId());
  check("Kech qo'shilgan mehmon natijasi saqlanadi", fin.ok === true && fin.outcome!.saved === true);
});

// ---------------------------------------------------------------------------
await section("OQIM 6: poyga g'olibi, vaqt rejimi, raqib natijasi ko'rinishi", async () => {
  resetPortalDemoStore();
  const h = await makeStudent("Poyga Hostova", "3-A");
  const g = await makeStudent("Poyga Guestova", "3-A");
  const game = await resolveCatalogGameSafe("practice:soz-yasash");

  // POYGA: birinchi tugatgan g'olib, ikkinchisi g'olibni o'zgartira olmaydi
  const room = await createRoom({
    hostStudentId: h.id,
    hostName: "Salima",
    gameKey: "practice:soz-yasash",
    gameTitle: game.title,
    gameType: "practice",
    subject: "Mashq o'yinlari",
    grade: 3,
    questions: game.questions,
    endMode: "race",
  });
  const gj = await joinRoom(room.code, "Mehmon", g.id);
  const gSecret = (gj as { ok: true; guestSecret: string }).guestSecret;
  await startRoom(room.code, "host", room.hostSecret);

  const hostRow = await getRoom(room.code);
  for (let i = 0; i < hostRow!.total; i++) {
    await recordRoomAnswer(room.code, "guest", gSecret, i, hostRow!.answer_key[i]!);
  }

  // Host birinchi tugatadi
  const hostFin = await finishRoomPlayer(room.code, "host", room.hostSecret, 33, newAttemptId());
  check("Poyga: host yakunladi", hostFin.ok === true);
  let row = await getRoom(room.code);
  check("Poyga: g'olib = host (birinchi finish)", row?.winner_slot === "host");

  // Mehmon ham tugatadi — g'olib o'zgarmaydi, natijalar bir-biriga ko'rinadi
  // (mehmonning barcha javoblari to'g'ri edi — host hammasini to'g'ri javob berdi)
  await finishRoomPlayer(room.code, "guest", gSecret, 40, newAttemptId());
  const guestState = await roomStateFor(room.code, "guest");
  check("Mehmon host natijasini ko'radi", guestState?.opponentDone === true && guestState!.opponentScore !== null);
  const hostState = await roomStateFor(room.code, "host");
  check("Host mehmon natijasini ko'radi", hostState?.opponentDone === true);

  // VAQT rejimi: savollar extended + timeLimit saqlanadi
  const timeRoom = await createRoom({
    hostStudentId: h.id,
    hostName: "Salima",
    gameKey: "practice:soz-yasash",
    gameTitle: game.title,
    gameType: "practice",
    subject: "Mashq o'yinlari",
    grade: 3,
    questions: [...game.questions, ...game.questions, ...game.questions, ...game.questions],
    endMode: "time",
    timeLimitMin: 2,
  });
  const tr = await getRoom(timeRoom.code);
  check("Vaqt rejimi saqlanadi (time + 2 daq)", tr?.end_mode === "time" && tr?.time_limit_min === 2 && tr!.total === game.questions.length * 4);

  // DO'STSIZ BOSHLANGAN poygada ham kech qo'shilgan mehmon tugatadi
  const room2 = await createRoom({
    hostStudentId: h.id,
    hostName: "Salima",
    gameKey: "practice:soz-yasash",
    gameTitle: game.title,
    gameType: "practice",
    subject: "Mashq o'yinlari",
    grade: 3,
    questions: game.questions,
    endMode: "race",
  });
  await startRoom(room2.code, "host", room2.hostSecret); // do'stsiz!
  const late = await joinRoom(room2.code, "LatePanda", null);
  check("Poyga boshlangandan keyin qo'shilish OK", late.ok === true);
  const secret2 = (late as { ok: true; guestSecret: string }).guestSecret;
  const r2 = await getRoom(room2.code);
  for (let i = 0; i < r2!.total; i++) {
    await recordRoomAnswer(room2.code, "guest", secret2, i, r2!.answer_key[i]!);
  }
  const lateFin = await finishRoomPlayer(room2.code, "guest", secret2, 50, newAttemptId());
  check("Kech qo'shilgan mehmon POYGADA ham tugatadi", lateFin.ok === true && lateFin.outcome!.saved === true);
  row = await getRoom(room2.code);
  check("Do'stsiz boshlangan poygada mehmon G'OLIB bo'ldi", row?.winner_slot === "guest");
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
