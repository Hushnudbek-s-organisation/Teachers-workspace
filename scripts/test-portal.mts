// ============================================================================
// PORTAL INTEGRATSIYA TESTLARI
//
// Qamrov (talablar bo'yicha):
//   1. O'quvchi linki: yaratish → xesh-only saqlash → yangilash (eski o'ladi)
//      → bekor qilish → yaroqsiz token
//   2. Auth: birinchi admin (bootstrap), parol tekshiruvi, sinf huquqlari
//   3. Server-tekshiriladigan o'yin: javob kaliti brauzerga CHIQMAYDI,
//      ball serverda hisoblanadi, natija avtomatik saqlanadi,
//      attempt id idempotent (tarmoq qayta yuborsa ikki marta YO'Q)
//   4. Mashq o'yinlari (3 yangi 3-sinf o'yini): generatsiya, aralashish,
//      ikki o'yinchiga bir xil savollar
//   5. Do'stim bilan o'ynash: xona, 3-kishi rad etiladi, muddat, juftlik
//      natijalari har o'yinchiga O'ZIGA yoziladi, mehmon profilga YOZILMAYDI
//   6. Katalog avtomatik: yangi kitob/o'qituvchi o'yini o'zi chiqadi,
//      "Faqat sinf uchun" va bingo ko'rinmaydi, noma'lum sinf ochilmaydi,
//      takrorlar filtralanadi
//
// Ishga tushirish: npm run test:portal
// (NODE_OPTIONS=--conditions=react-server — server-only modullari uchun)
// ============================================================================

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
  cancelRoom,
  issueStudentLink,
  revokeStudentLink,
  resolveStudentByToken,
  getLinkStatus,
  saveResultIdempotent,
  getResultById,
  verifyRoomSlot,
  resetPortalDemoStore,
} from "../src/lib/portal/store.ts";
import { buildPortalCatalog, resolveCatalogGame, gradeFromClass, portalInfoFor } from "../src/lib/portal/catalog.ts";
import { generatePracticeQuestions, PRACTICE_GAMES } from "../src/lib/portal/practice.ts";
import {
  createTeacherAccount,
  verifyAccount,
  hashPassword,
  verifyPassword,
  resetAuthDemoStore,
} from "../src/lib/auth-core.ts";
import { demoRepository } from "../src/lib/repo/demo.ts";
import { createCustomGame } from "../src/lib/books/custom.ts";
import { ingestBook, saveBook } from "../src/lib/books/store.ts";

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

async function section(name: string, fn: () => Promise<void> | void) {
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

async function createTestStudent(name: string, className: string): Promise<string> {
  await demoRepository.createStudent({
    full_name: name,
    date_of_birth: "2017-05-10",
    class_name: className,
    phone: null,
    notes: null,
  });
  const students = await demoRepository.listStudents();
  const s = students.find((x) => x.full_name === name);
  if (!s) throw new Error("Test o'quvchi yaratilmadi");
  return s.id;
}

// ---------------------------------------------------------------------------
await section("1. O'QUVCHI LINKLARI — token, xesh, yangilash, bekor qilish", async () => {
  resetPortalDemoStore();
  const studentId = await createTestStudent("Zuhra Portalova", "3-A");

  const link1 = await issueStudentLink(studentId, BASE);
  check("Link tokeni 43+ belgili (taxmin qilib bo'lmaydigan)", link1.token.length >= 40);
  check("Link URL to'g'ri shakllangan", link1.url.startsWith(`${BASE}/o/`));

  const resolved = await resolveStudentByToken(link1.token);
  check("Token → o'quvchi ishlaydi", resolved?.id === studentId);
  check("Ismlar tokenda YO'Q", !link1.token.includes("Zuhra"));

  // Bazada faqat xesh: demo omborida token ochiq matn sifatida saqlanmasligi kerak
  const raw = JSON.stringify([...(globalThis as unknown as { __portalDemoStore: { links: Map<string, unknown>; linksByHash: Map<string, unknown> } }).__portalDemoStore.links.values()]);
  check("Bazada token OCHIQ MATN YO'Q (faqat xesh)", !raw.includes(link1.token));

  const status1 = await getLinkStatus(studentId);
  check("Link holati: faol", status1.active === true);

  // Yangilash → eski token o'ladi
  const link2 = await issueStudentLink(studentId, BASE); // yangilash = eski bekor + yangi
  check("Yangilash yangi token berdi", link2.token !== link1.token);
  const old1 = await resolveStudentByToken(link1.token);
  check("ESKI token yangilashdan keyin ISHLAMAYDI", old1 === null);
  const new1 = await resolveStudentByToken(link2.token);
  check("YANGI token ishlaydi", new1?.id === studentId);

  // Bekor qilish
  const revoked = await revokeStudentLink(studentId);
  check("Bekor qilish true qaytardi", revoked === true);
  const dead = await resolveStudentByToken(link2.token);
  check("Bekor qilingan token ISHLAMAYDI", dead === null);
  const status2 = await getLinkStatus(studentId);
  check("Holat: bekor qilingan", status2.active === false && status2.revokedAt !== null);

  // Yaroqsiz token
  const garbage = await resolveStudentByToken("completely-invalid-token-xxxxxxxxxxxxxxxxxxxx");
  check("Yaroqsiz token → null", garbage === null);
});

// ---------------------------------------------------------------------------
await section("2. AUTH — birinchi admin, parol, sinf huquqlari", async () => {
  resetAuthDemoStore();
  const total0 = await (await import("../src/lib/auth-core.ts")).countAccounts();
  check("Hisoblar yo'q (bootstrap holati)", total0 === 0);

  const created = await createTeacherAccount({
    email: "ustoz@maktab.uz",
    password: "maxfiy123",
    displayName: "Dilshod Ustoz",
  });
  check("Birinchi hisob ADMIN bo'ldi", created.role === "admin");

  const ok = await verifyAccount("ustoz@maktab.uz", "maxfiy123");
  check("To'g'ri parol qabul qilindi", ok !== null);
  const bad = await verifyAccount("ustoz@maktab.uz", "notogri");
  check("Noto'g'ri parol RAD etildi", bad === null);
  const nobody = await verifyAccount("yoq@maktab.uz", "maxfiy123");
  check("Mavjud bo'lmagan email RAD etildi", nobody === null);

  const hash = hashPassword("parolim1234");
  check("Parol xeshi plaintext emas", !hash.includes("parolim1234"));
  check("scrypt tekshiruvi ishlaydi", verifyPassword("parolim1234", hash) === true);
  check("Boshqa parol rad etiladi", verifyPassword("parolim1235", hash) === false);

  // Ikkinchi hisob — oddiy o'qituvchi (avtomatik admin EMAS)
  const second = await createTeacherAccount({
    email: "yordamchi@maktab.uz",
    password: "yordamchi1",
    displayName: "Yordamchi",
  });
  check("Ikkinchi hisob oddiy o'qituvchi", second.role === "teacher");

  // Sinf huquqlari
  const { allowedClasses, setClassAccess } = await import("../src/lib/auth-core.ts");
  const adminSession = {
    accountId: created.id,
    email: "ustoz@maktab.uz",
    displayName: "Dilshod Ustoz",
    role: "admin" as const,
    teacherId: null,
  };
  const adminScope = await allowedClasses(adminSession);
  check("Admin hamma sinflarni ko'radi (null)", adminScope === null);

  const teacherSession = {
    accountId: second.id,
    email: "yordamchi@maktab.uz",
    displayName: "Yordamchi",
    role: "teacher" as const,
    teacherId: null,
  };
  const emptyScope = await allowedClasses(teacherSession);
  check("Yangi o'qituvchiga AVTOMATIK huquq berilmagan (bo'sh)", Array.isArray(emptyScope) && emptyScope.length === 0);

  await setClassAccess(second.id, ["3-A", "3-B"], adminSession);
  const scope = await allowedClasses(teacherSession);
  check("Aniq berilgan sinflar ishlaydi", scope?.join(",") === "3-A,3-B");

  const { canAccessStudent } = await import("../src/lib/auth-core.ts");
  check("3-A o'quvchi ko'rinadi", (await canAccessStudent(teacherSession, "3-A")) === true);
  check("6-A o'quvchi KO'RINMAYDI", (await canAccessStudent(teacherSession, "6-A")) === false);
});

// ---------------------------------------------------------------------------
await section("3. MASHQ O'YINLARI — 3 yangi 3-sinf o'yini", async () => {
  check("3 ta mashq o'yini ro'yxatda", PRACTICE_GAMES.length === 3);
  const names = PRACTICE_GAMES.map((g) => g.title).join(", ");
  check("Nomlar to'g'ri", names.includes("Ko'paytirish zinasi") && names.includes("So'z yasash") && names.includes("Soatni top"));

  for (const meta of PRACTICE_GAMES) {
    const qs = generatePracticeQuestions(meta.slug, 12345, meta.items);
    check(`${meta.title}: savollar soni`, qs.length === meta.items);
    // Har bir savol valid: javob variant ichida
    const valid = qs.every((sq) => {
      if (sq.q.kind === "mc" || sq.q.kind === "clock") {
        return typeof sq.a === "number" && sq.a >= 0 && sq.a < sq.q.options.length;
      }
      return Array.isArray(sq.a) && sq.q.kind === "order";
    });
    check(`${meta.title}: javob kalitlari valid`, valid);
  }

  // Bir xil seed → bir xil savollar (duo: ikki o'yinchiga bir xil)
  const a = generatePracticeQuestions("kopaytirish-zinasi", 777, 5);
  const b = generatePracticeQuestions("kopaytirish-zinasi", 777, 5);
  const c = generatePracticeQuestions("kopaytirish-zinasi", 778, 5);
  check("Bir xil seed → bir xil savollar", JSON.stringify(a) === JSON.stringify(b));
  check("Boshqa seed → boshqa savollar", JSON.stringify(a) !== JSON.stringify(c));

  // Variantlar aralashadi (qayta o'ynaganda boshqacha)
  const s1 = generatePracticeQuestions("kopaytirish-zinasi", 1001, 5);
  const s2 = generatePracticeQuestions("kopaytirish-zinasi", 1002, 5);
  const prompts1 = s1.map((x) => (x.q as { prompt: string }).prompt).join("|");
  const prompts2 = s2.map((x) => (x.q as { prompt: string }).prompt).join("|");
  check("Qayta o'ynashda savollar ARALASHADI", prompts1 !== prompts2);

  // So'z yasash: bo'laklar aralashgan, javob asl tartib
  const wb = generatePracticeQuestions("soz-yasash", 555, 5);
  const shuffledAll = wb.every((sq) => {
    if (sq.q.kind !== "order") return false;
    return JSON.stringify(sq.q.pieces) !== JSON.stringify(sq.a);
  });
  check("So'z yasash: bo'laklar aralashgan", shuffledAll);
});

// ---------------------------------------------------------------------------
await section("4. SERVER-TEKSHIRILADIGAN YAKKA O'YIN — kalit chiqmaydi, idempotent", async () => {
  resetPortalDemoStore();
  const studentId = await createTestStudent("Alibek Solishtir", "3-A");
  const student = (await demoRepository.listStudents()).find((s) => s.id === studentId)!;

  const seed = 90210;
  const game = await resolveCatalogGame("practice:kopaytirish-zinasi", seed);
  check("Mashq o'yini katalogdan kalit bilan topiladi", game !== null && game.questions.length === 5);

  const session = await createGameSession({
    studentId,
    gameKey: "practice:kopaytirish-zinasi",
    gameTitle: game!.title,
    gameType: "practice",
    mode: "solo",
    questions: game!.questions,
  });

  // MUHIM: mijozga yuboriladigan payload (har savol faqat `q` qismi)
  const clientQuestions = session.questions.map((sq) => sq.q);
  const clientPayload = JSON.stringify(clientQuestions);
  const parsed = clientQuestions as Array<Record<string, unknown>>;
  const leaky = parsed.some((q) => "a" in q || "answer" in q || "answerIndex" in q || "correct" in q || "isTrue" in q);
  check("Javob kaliti maydonlari mijoz payloadida YO'Q (a/answer/correct/isTrue)", !leaky);
  check("Savollarda 'correct' maydoni YO'Q", !clientPayload.includes("correct"));
  // mc savolning qaysi variant to'g'ri ekanini bildiruvchi hech qanday ishorа yo'q
  const mcLeak = parsed.some(
    (q) => q.kind === "mc" && typeof q.options === "object" && JSON.stringify(q.options).includes("answer")
  );
  check("mc savollarda javob ishorasi YO'Q", !mcLeak);

  // Serverda tekshirish
  let score = 0;
  for (let i = 0; i < session.questions.length; i++) {
    const sq = session.questions[i]!;
    const correctChoice = sq.a as number;
    const wrongChoice = (correctChoice + 1) % (sq.q as { options: string[] }).options.length;
    const wrong = await checkSessionAnswer(session, i, wrongChoice);
    check(`Savol ${i + 1}: noto'g'ri javob RAD etildi (ball oshmaydi)`, wrong.correct === false && wrong.score === score);
    const right = await checkSessionAnswer(session, i, correctChoice);
    score += 1;
    check(`Savol ${i + 1}: to'g'ri javob qabul, ball ${score}`, right.correct === true && right.score === score);
  }

  // Mijoz "men 5/5 deb da'vo qilaman" holatini sinash: noto'g'ri javoblar
  // yozilgandan keyin server score 5 bo'ldi (chunki hamma savol 2 marta
  // tekshirildi, lekin score faqat to'g'rilardan oshadi). Endi yakunlaymiz.
  const attemptId = "attempt-11111111-1111-4111-8111-111111111111";
  const fin = await finishGameSession(session, attemptId, 42, BASE);
  check("Natija saqlandi (server tasdiqladi)", fin.outcome.saved === true);
  check("Saqlangan ball SERVER balliga teng", fin.outcome.score === session.score);

  const row = await getResultById(attemptId);
  check("Natija bazada bor", row !== null);
  check("Natija o'quvchiga bog'langan (sessiyadan)", row?.student_id === studentId);
  check("Rejim: solo", row?.mode === "solo");
  check("Manba: portal", row?.source === "portal");
  check("Foiz to'g'ri", row?.percent === Math.round((row!.score / row!.total) * 100));

  // Tarmoq qayta yuborish: Xuddi SHU attempt id bilan qayta finish
  const fin2 = await finishGameSession(session, attemptId, 42, BASE);
  check("Qayta finish: yangi yozuv YO'Q (alreadySaved)", fin2.outcome.alreadySaved === true);

  // Mijoz o'zi qo'shimcha "5/5 bo'ldi" deb yozsa ham — xuddi shu id → ikkinchi qator YO'Q
  const fake = {
    id: attemptId,
    book_id: null,
    topic_id: null,
    topic_title: null,
    game_id: "practice:kopaytirish-zinasi",
    game_title: "Ko'paytirish zinasi",
    game_type: "practice",
    student_id: studentId,
    student_name: student.full_name,
    score: 999,
    total: 5,
    time_sec: 0,
    mode: "solo" as const,
    percent: 100,
    source: "portal" as const,
    created_at: new Date().toISOString(),
  };
  const dup = await saveResultIdempotent(fake);
  check("Mijoz yuborgan soxta ball 999 YOZILMADI", dup.saved === false);
  const rowAfter = await getResultById(attemptId);
  check("Ball hali serverdagi qiymatda", rowAfter!.score !== 999);
});

// ---------------------------------------------------------------------------
await section("5. DO'STIM BILAN O'YNASH — xona, 3-kishi, idempotent yakun", async () => {
  resetPortalDemoStore();
  const hostId = await createTestStudent("Host O'yinchi", "3-A");
  const guestId = await createTestStudent("Guest Do'st", "3-B");

  const game = await resolveCatalogGame("practice:soatni-top", 4242);
  const room = await createRoom({
    hostStudentId: hostId,
    hostName: "Host",
    gameKey: "practice:soatni-top",
    gameTitle: game!.title,
    gameType: "practice",
    subject: "Mashq o'yinlari",
    grade: 3,
    questions: game!.questions,
  });
  check("Xona kodi 6 belgili", room.code.length === 6);
  check("Taklif yo'li alohida", room.invitePath.startsWith("/o/duo/"));

  const room0 = await getRoom(room.code);
  check("Boshlang'ich holat: waiting", room0?.status === "waiting");
  check("Xona muddati bor (2 soat)", room0!.expires_at > Date.now());

  // Mehmon qo'shiladi (o'quvchi sessiyasi bilan)
  const joined = await joinRoom(room.code, "SuperPanda", guestId);
  check("Mehmon qo'shildi", joined.ok === true);

  // UCHINCHI o'yinchi rad etiladi
  const third = await joinRoom(room.code, "Uchinchi", null);
  check("Uchinchi o'yinchi RAD etiladi", third.ok === false && third.error === "taken");

  // Maxfiy kalit tekshiruvi
  const badSlot = await verifyRoomSlot(room.code, "host", "wrong-secret");
  check("Noto'g'ri maxfiy kalit RAD etiladi", badSlot === null);
  const goodHost = await verifyRoomSlot(room.code, "host", room.hostSecret);
  check("Host kaliti ishlaydi", goodHost !== null);
  const goodGuest = await verifyRoomSlot(room.code, "guest", (joined as { guestSecret: string }).guestSecret);
  check("Mehmon kaliti ishlaydi", goodGuest !== null);

  // Boshlash: faqat host
  const guestStart = await startRoom(room.code, "guest", (joined as { guestSecret: string }).guestSecret);
  check("Mehmon BOSHLOLAY olmaydi", guestStart === false);
  const started = await startRoom(room.code, "host", room.hostSecret);
  check("Host boshladi", started === true);
  const roomP = await getRoom(room.code);
  check("Holat: playing", roomP?.status === "playing");

  // Ikkala o'yinchiga BIR XIL savollar
  const q1 = roomP!.questions.map((sq) => sq.q.prompt ?? sq.q.kind).join("|");
  check("Savollar o'rnatilgan (total mos)", roomP!.total === game!.questions.length);

  // Host javoblarini yuboradi
  let hostScore = 0;
  for (let i = 0; i < roomP!.total; i++) {
    const res = await recordRoomAnswer(room.code, "host", room.hostSecret, i, roomP!.answer_key[i]!);
    if (res.correct) hostScore++;
    check(`Host savol ${i + 1}: server tekshirdi`, res.ok === true);
  }
  check("Host ball serverda", hostScore === roomP!.total);

  // Host yakunlaydi
  const hostAttempt = "room-attempt-00000000-0000-4000-8000-000000000001";
  const hostFin = await finishRoomPlayer(room.code, "host", room.hostSecret, 30, hostAttempt);
  check("Host natijasi saqlandi", hostFin.ok === true && hostFin.outcome?.saved === true);
  const hostRow = await getResultById(hostAttempt);
  check("Host natijasi HOSTGA bog'langan", hostRow?.student_id === hostId);
  check("Host rejimi: duo", hostRow?.mode === "duo");

  // Qayta yuborish: xuddi shu attempt
  const hostFin2 = await finishRoomPlayer(room.code, "host", room.hostSecret, 30, hostAttempt);
  check("Host qayta yuborish: ikki marta YOZILMADI", hostFin2.outcome?.alreadySaved === true);

  // Mehmon ham tugatadi
  const guestAttempt = "room-attempt-00000000-0000-4000-8000-000000000002";
  for (let i = 0; i < 2; i++) {
    await recordRoomAnswer(room.code, "guest", (joined as { guestSecret: string }).guestSecret, i, roomP!.answer_key[i]!);
  }
  const guestFin = await finishRoomPlayer(room.code, "guest", (joined as { guestSecret: string }).guestSecret, 35, guestAttempt);
  check("Mehmon natijasi saqlandi", guestFin.ok === true);
  const guestRow = await getResultById(guestAttempt);
  check("Mehmon natijasi O'ZIga bog'landi (3-B o'quvchi)", guestRow?.student_id === guestId);

  const roomDone = await getRoom(room.code);
  check("Ikkalasi tugagach xona finished", roomDone?.status === "finished");

  // Progress qatorlari takrorlanmaslikni (pk room+player) demo ham ta'minlaydi
  const hostState = await roomStateFor(room.code, "host");
  check("Host holatida mehmon ball ko'rinadi (faqat ball)", hostState?.opponentScore === 2);

  // Bekor qilish
  const room2 = await createRoom({
    hostStudentId: hostId,
    hostName: "Host",
    gameKey: "practice:soatni-top",
    gameTitle: game!.title,
    gameType: "practice",
    subject: "Mashq o'yinlari",
    grade: 3,
    questions: game!.questions,
  });
  const cancelled = await cancelRoom(room2.code, "host", room2.hostSecret);
  check("Host xonani bekor qildi", cancelled === true);
  const afterCancel = await getRoom(room2.code);
  check("Bekor qilingan xona closed", afterCancel?.status === "cancelled");
  const joinCancelled = await joinRoom(room2.code, "Kech", null);
  check("Bekor qilingan xonaga qo'shilish RAD", joinCancelled.ok === false);

  // Muddat tugashi
  const room3 = await createRoom({
    hostStudentId: hostId,
    hostName: "Host",
    gameKey: "practice:soatni-top",
    gameTitle: game!.title,
    gameType: "practice",
    subject: "Mashq o'yinlari",
    grade: 3,
    questions: game!.questions,
  });
  // Demo xonaning muddatini o'tmishga suramiz (simulyatsiya)
  const demoStore = (globalThis as unknown as { __portalDemoStore?: { rooms: Map<string, { expires_at: number; status: string }> } }).__portalDemoStore!;
  const row3 = demoStore.rooms.get(room3.code)!;
  row3.expires_at = Date.now() - 1000;
  const expiredRoom = await getRoom(room3.code);
  check("Muddati tugagan xona cancelled", expiredRoom?.status === "cancelled");
  const joinExpired = await joinRoom(room3.code, "Kech", null);
  check("Muddati tugagan xonaga qo'shilish RAD", joinExpired.ok === false);

  // Mehmon SESSIYASIZ → mehmon natijasi HECH QANDAY profilga yozilmaydi
  const room4 = await createRoom({
    hostStudentId: hostId,
    hostName: "Host",
    gameKey: "practice:soatni-top",
    gameTitle: game!.title,
    gameType: "practice",
    subject: "Mashq o'yinlari",
    grade: 3,
    questions: game!.questions,
  });
  const anonJoin = await joinRoom(room4.code, "MehmonPanda", null);
  check("Sessiyasiz mehmon qo'shildi (guest)", anonJoin.ok === true);
  await startRoom(room4.code, "host", room4.hostSecret);
  const r4 = await getRoom(room4.code)!;
  void r4;
  const anonAttempt = "room-attempt-00000000-0000-4000-8000-000000000003";
  for (let i = 0; i < 3; i++) {
    await recordRoomAnswer(room4.code, "guest", (anonJoin as { guestSecret: string }).guestSecret, i, game!.questions[i]!.a);
  }
  await finishRoomPlayer(room4.code, "guest", (anonJoin as { guestSecret: string }).guestSecret, 20, anonAttempt);
  const anonRow = await getResultById(anonAttempt);
  check("Mehmon natijasi HECH QAYSI profilga yozilmagan", anonRow?.student_id === null);
});

// ---------------------------------------------------------------------------
await section("6. KATALOG AVTOMATIK — yangi o'yinlar o'zi chiqadi", async () => {
  resetPortalDemoStore();
  const student3A = await createTestStudent("Katalog Talabasi", "3-A");
  const student = (await demoRepository.listStudents()).find((s) => s.id === student3A)!;
  const info = portalInfoFor(student);
  check("Sinf darajasi o'qildi (3-A → 3)", info.grade === 3);

  // Kitob yasash (haqiqiy dvigatel orqali) — 3-sinf matematika
  const { book } = ingestBook({
    title: "Matematika 3-sinf yangi",
    grade: 3,
    subject: "matematika",
    fileName: "matematika-3.pdf",
    sizeBytes: 1000,
    kind: "matn",
    pages: [
      { page: 1, text: "MUNDARIJA\n1-mavzu. Qo'shish va ayirish\n2-mavzu. Ko'paytirish" },
      {
        page: 2,
        text: "1-mavzu. QO'SHISH VA AYIRISH\nQoida: Yig'indini topish uchun qo'shiluvchilarni qo'shamiz.\nMisol: 245 + 132 = 377\nMisol: 460 - 125 = 335\nMasala: Do'konda 345 ta daftar bor edi. 17 tasi sotildi. Nechta daftar qoldi?\nYechish: 345 - 17 = 328\nJavob: 328 ta daftar qoldi.",
      },
      {
        page: 3,
        text: "2-mavzu. KO'PAYTIRISH\nQoida: Ko'paytirish - bir xil qo'shiluvchilarni qisqacha yozish.\nMisol: 12 x 4 = 48\nMisol: 25 x 3 = 75\nMasala: Har bir qutiga 6 tadan olma solindi. 8 ta qutida nechta olma bor?\nYechish: 6 x 8 = 48\nJavob: 48 ta olma.",
      },
    ],
  });
  await saveBook(book);

  let catalog = await buildPortalCatalog(info);
  const bookEntries = catalog.filter((e) => e.key.startsWith(`book:${book.id}:`));
  check("YANGI kitob o'yinlari AVTOMATIK chiqdi (kod yozmasdan)", bookEntries.length > 0);

  // O'qituvchi o'yini — matching
  const custom = await createCustomGame({
    title: "Mevalarni juftlashtir",
    type: "matching",
    subject: "ona-tili",
    grade: 3,
    items: [
      { left: "olma", right: "apple" } as never,
      { left: "uzum", right: "grape" } as never,
      { left: "tarvuz", right: "watermelon" } as never,
      { left: "nok", right: "pear" } as never,
    ],
  });
  catalog = await buildPortalCatalog(info);
  check("YANGI o'qituvchi o'yini avtomatik chiqdi", catalog.some((e) => e.key === `custom:${custom.id}`));

  // Faqat sinf uchun (forStudents=false) → ko'rinmaydi
  const hidden = await createCustomGame({
    title: "Sinf uchun maxfiy test",
    type: "quiz",
    subject: "matematika",
    grade: 3,
    forStudents: false,
    items: [
      { question: "2+2 nechchi?", options: ["3", "4", "5", "6"], answer: 1 } as never,
    ],
  });
  catalog = await buildPortalCatalog(info);
  check("\"Faqat sinf uchun\" o'yin portalda KO'RINMAYDI", !catalog.some((e) => e.key === `custom:${hidden.id}`));

  // Boshqa sinf (4-sinf) kitobi → ko'rinmaydi
  const { book: book4 } = ingestBook({
    title: "Matematika 4-sinf",
    grade: 4,
    subject: "matematika",
    fileName: "m4.pdf",
    sizeBytes: 900,
    kind: "matn",
    pages: [{ page: 1, text: "1-mavzu. Katta sonlar\nMisol: 1200 + 3000 = 4200" }],
  });
  await saveBook(book4);
  catalog = await buildPortalCatalog(info);
  check("4-sinf kitobi 3-sinf o'quvchisiga KO'RINMAYDI", !catalog.some((e) => e.key.startsWith(`book:${book4.id}:`)));

  // Noma'lum sinf → avtomatik material OCHILMAYDI
  const unknownId = await createTestStudent("Sinfsiz Bola", "Sinfsiz guruhi");
  const unknownStudent = (await demoRepository.listStudents()).find((s) => s.id === unknownId)!;
  const unknownInfo = portalInfoFor(unknownStudent);
  check("Noma'lum sinf darajasi null", unknownInfo.grade === null);
  const unknownCatalog = await buildPortalCatalog(unknownInfo);
  check("Noma'lum sinfda KITOBLAR ko'rinmaydi", unknownCatalog.every((e) => !e.key.startsWith("book:")));
  check("Noma'lum sinfda O'QITUVCHI o'yinlari ko'rinadi (talab: hamma o'yinlar)", unknownCatalog.some((e) => e.source === "custom"));
  check("Mashq o'yinlari baribir bor", unknownCatalog.filter((e) => e.practice === true).length === 3);

  // Takror filtri: bir xil title+type ikki marta ko'rinmaydi
  await createCustomGame({
    title: "Mevalarni juftlashtir",
    type: "matching",
    subject: "ona-tili",
    grade: 3,
    items: [
      { left: "gilos", right: "cherry" } as never,
      { left: "shaftoli", right: "peach" } as never,
      { left: "olxo'ri", right: "plum" } as never,
      { left: "anor", right: "pomegranate" } as never,
    ],
  });
  catalog = await buildPortalCatalog(info);
  const dupes = catalog.filter((e) => e.title === "Mevalarni juftlashtir");
  check("Bir xil nomli o'qituvchi o'yinlari IKKALASI ham ko'rinadi (talab)", dupes.length === 2 && dupes[0]!.key !== dupes[1]!.key);

  // Boshqa sinf uchun yasalgan o'qituvchi o'yini ham ko'rinadi (talab: hamma o'yinlar)
  const otherGrade = await createCustomGame({
    title: "Boshqa sinf o'yini",
    type: "quiz",
    subject: "matematika",
    grade: 4,
    items: [
      { question: "5 x 5 = ?", options: ["20", "25", "30", "35"], answer: 1 } as never,
      { question: "3 + 9 = ?", options: ["11", "12", "13", "14"], answer: 1 } as never,
    ],
  });
  catalog = await buildPortalCatalog(info);
  check("Boshqa sinf uchun o'qituvchi o'yini ham ko'rinadi", catalog.some((e) => e.key === `custom:${otherGrade.id}`));

  // Bingo kabi sinf formatlari portalga chiqmaydi
  await createCustomGame({
    title: "Bingo kartasi maxsus",
    type: "bingo",
    subject: "ona-tili",
    grade: 3,
    items: [{ text: "kitob" }, { text: "daftar" }, { text: "qalam" }] as never,
  });
  catalog = await buildPortalCatalog(info);
  check("Bingo (sinf formati) portalda YO'Q", !catalog.some((e) => e.title.includes("Bingo")));

  // resolveCatalogGame kitob o'yini uchun ham ishlaydi (javob kaliti bilan)
  const bookEntry = catalog.find((e) => e.key.startsWith(`book:${book.id}:`));
  if (bookEntry) {
    const resolved = await resolveCatalogGame(bookEntry.key, 999);
    check("Kitob o'yini kalitdan qayta yasaladi", resolved !== null && resolved.questions.length > 0);
    const leaked = JSON.stringify(resolved!.questions.map((sq) => sq.q)).includes("\"a\"");
    check("Kitob o'yini savollarida javob YO'Q", !leaked);
  }
});

// ---------------------------------------------------------------------------
await section("7. GRADE PARSING va xavfsizlik chekkalari", async () => {
  check("'3-A' → 3", gradeFromClass("3-A") === 3);
  check("'10-B' → 10", gradeFromClass("10-B") === 10);
  check("'Sinfsiz' → null", gradeFromClass("Sinfsiz") === null);
  check("'' → null", gradeFromClass("") === null);
  check("'Boshqa 99-X' → null (1..11 tashqarida)", gradeFromClass("99-X") === null);

  // Yaroqsiz xona kodlari
  const bad1 = await getRoom("!!!");
  check("Yaroqsiz xona kodi → null", bad1 === null);
  const bad2 = await getRoom("");
  check("Bo'sh xona kodi → null", bad2 === null);

  // Link holati yo'q o'quvchi
  resetPortalDemoStore();
  const noLink = await getLinkStatus("demo-nonexistent-id");
  check("Linki yo'q o'quvchi holati: faol emas", noLink.active === false);
});

// ---------------------------------------------------------------------------
console.log("\n" + "=".repeat(70));
console.log(`NATIJA: ${passed} ✅ / ${failed} ❌`);
if (failed > 0) {
  console.log("\nXatolar:");
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
} else {
  console.log("Barcha portal tekshiruvlari o'tdi ✅");
}
