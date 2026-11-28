# 🎓 Teachers Workspace — Maktab boshqaruv tizimi

Teacher & Admin Dashboard for a school management platform:
**Next.js (App Router) · TypeScript · Tailwind CSS · Recharts · Supabase**

| Bo'lim | Nima bor |
| --- | --- |
| **`supabase/schema.sql`** | **To'liq o'rnatish** — ENUM'lar, 10 jadval (maktab + `books`/`custom_games`/`game_results`), 7 VIEW, 2 funksiya, 40 RLS siyosati. **Qayta run qilish xavfsiz** (`create if not exists`) |
| **`supabase/schema-portal.sql`** | **Portal sxemasi** — `student_links` (faqat SHA-256 hash), `game_sessions` (3 soat TTL), `game_rooms` (2 soat TTL), `room_progress`, natijalarda `mode/percent/source`, `custom_games.for_students`. **Qayta run qilish xavfsiz** |
| **`supabase/seed.sql`** | Namoyish ma'lumotlari: 6 o'qituvchi, 11 o'quvchi (3-sinf portal uchun 3 ta qo'shimcha), davomat/baholar, bugun tug'ilgan kuni bo'lgan o'quvchi, 1 namuna kitob (5 mavzu / 17 o'yin) va 4 ta o'qituvchi o'yini. **Qayta run qilish xavfsiz** |
| **`src/app/*` + `src/components/*`** | **Task 2** — Students / Parents / Teachers / Schedule CRUD, kunlik davomat, uyga ketish, baholash, birthday alert |
| **`src/app/page.tsx` + `src/app/analytics`** | **Task 3** — Recharts dashboard: KPI kartalar, haftalik davomat grafigi, fanlar kesimida baholar, dismissal pie, hisobotlar |
| **`src/lib/books/*` + `src/app/books/*`** | **Kitob → O'yin** — o'qituvchi yuklagan darslikni (PDF/matn) o'qib mavzularga bo'ladi va har bir mavzudan o'yinlar yasaydi (sinf va fan o'qituvchi tanlaydi) |
| **`src/lib/books/custom*` + `src/app/games/*`** | **O'qituvchi o'yin yasash** — 13 xil o'yin turi, o'z so'zlari/misollari bilan (matn yoki jadval orqali) |
| **`src/app/classroom`** | **Sinf bilan o'ynash** — 🎡 charxpalak, 🏆 guruhlar viktorinasi (Kahoot uslubida), 🎟 bingo kartalari (chop etish) |
| **`src/lib/books/multiplayer.ts` + `src/components/books/Multiplayer*`** | **Bir qurilmada 1/2/3 kishi o'ynash** — bo'lingan ekran (portrait/landscape), har o'yinchiga har xil savol, «savollar soni» yoki «vaqt bo'yicha» rejim |
| **`src/app/games/stats`** | **O'yinlar statistikasi** — saqlangan natijalar: o'yinchilar, o'yinlar va turlar kesimida, oxirgi natijalar (filtr bilan) |
| **`src/lib/auth.ts`** | **Yagona o'qituvchi sessiyasi** — login yo'q, hamma sahifa ochiq; yagona o'qituvchi «Muxlisa» (barcha sinflar) |
| **`src/lib/portal/*` + `src/app/o/*`** | **O'quvchi portali** — shaxsiy havola bilan parolsiz kirish, katta tugmalar, 3-sinf mashq o'yinlari, do'stim bilan o'yin (2 qurilma), server tekshiradigan natijalar |

---

## ⚡ Tez start (Supabase'siz — Demo rejimi)

```bash
npm install
npm run dev          # http://localhost:3000
```

Agar `.env.local` da Supabase kalitlari **bo'lmasa**, ilova avtomatik **Demo rejimi**ga
o'tadi: xotiradagi realistik namoyish ma'lumotlari bilan to'liq CRUD va grafiklar
ishlaydi (server qayta ishga tushganda yangilanadi). **Login olib tashlangan** —
sayt shaxsiy: sahifalar to'g'ridan-to'g'ri ochiladi, yagona o'qituvchi **Muxlisa**
(barcha sinflar). O'quvchi portali havolalari baribir maxfiy (token bazada faqat
xesh bo'lib saqlanadi).

## 🔌 Supabase'ni ulash (real ma'lumotlar)

1. [supabase.com](https://supabase.com) da yangi project yarating.
2. **SQL Editor** → **New query** → `supabase/schema.sql` tarkibini to'liq qo'yib **Run** qiling.
   Fayl oxirida **tekshiruv so'rovi** bor (8-bo'lim) — Run qilgach 13 qator chiqadi va
   har biri ✅/❌ ko'rsatadi (jadvallar, VIEW'lar, funksiyalar, trigger'lar, RLS, ustunlar).
   Hammasi ✅ bo'lsa — sxema to'liq tayyor.
   Faylni **qayta run qilish ham xavfsiz** (hech narsa o'chirilmaydi).
   Noldan boshlash kerak bo'lsa — fayldagi `FRESH RESET` bloki (kommentdan chiqarib run qilinadi).
3. (Ixtiyoriy) `supabase/seed.sql` ni run qiling — namoyish ma'lumotlari uchun.
4. `.env.local.example` faylini `.env.local` deb nusxalab to'ldiring:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...   # faqat server uchun
   ```

5. `npm run dev` — yon panel'da **«Supabase ulangan»** belgisi paydo bo'ladi.
6. Ishlayotganini ko'rish: `/books` sahifasida kitob yuklang, so'ng SQL Editor'da
   `select id, title, stats from books;` — qator paydo bo'lsa yozish ham ishlayapti.
7. Tekshirish: `npm run test:supabase` — kitob → o'yin → natija zanjiri Supabase
   yo'lidan o'tishini (so'rovlarni ushlab) va yozilgan qatorlarni sxema qabul
   qilishini ko'rsatadi. Qo'shimcha: `npm i --no-save @electric-sql/pglite`.

> **Xavfsizlik:** o'qituvchi autentifikatsiyasi SERVER tomonda — cookie sessiya +
> scrypt parollar (`src/lib/auth-core.ts`); barcha dashboard sahifalari, server
> action'lar va `/api/*` yo'llari `requireTeacher` / `requireTeacherAction` bilan
> himoyalangan. DB yozishlari serverdan `SUPABASE_SERVICE_ROLE_KEY` bilan ketadi
> (kalit brauzerga chiqmaydi); portal havolalari esa hash'langan token orqali
> o'z chegarasida ishlaydi (`supabase/schema-portal.sql` — alohida portal sxemasi).

---

## 🩺 Ishlamayaptimi? — Sozlash tekshiruvi (`/setup`)

Production'da sahifa ochilmasa (masalan **"An error occurred in the Server Components
render"** + `digest`), endi taxmin qilish shart emas:

| Qayerda | Nima ko'rinadi |
| --- | --- |
| `/setup` | Ulanish holati, **10 jadval + 7 VIEW** alohida tekshiriladi, xatoning **haqiqiy matni** va tuzatish yo'li |
| `/api/health` | Xuddi shu holat JSON ko'rinishida (monitoring uchun; muammo bo'lsa **HTTP 503**) |
| Har sahifa tepasi | `DbAlert` ogohlantirishi: nima buzilgani va `/setup` havolasi |
| Xato sahifasi | `error.tsx` / `global-error.tsx`: `digest`, 3 asosiy sabab, «Qayta urinish», `/setup` |
| Server logi | Vercel → Logs: xato matni + `digest` + maslahat (`src/instrumentation.ts`) |

**Eng ko'p uchraydigan 3 sabab:**

1. **URL/kalit noto'g'ri yoki loyiha pauzada** — Supabase Dashboard'ni oching (loyiha
   30–60 soniyada «uyg'onadi»), so'ng `/setup` dagi «Qayta tekshirish» tugmasini bosing.
2. **`supabase/schema.sql` ishga tushirilmagan** — `/setup` qaysi jadval/VIEW yo'qligini
   nomma-nom ko'rsatadi (`relation "books" does not exist` kabi xato bilan).
3. **Kod xatosi** — `/setup` hammasi ✅ ko'rsatsa, `digest` ni Vercel logidagi yozuv bilan solishtiring.

**Ilova qanday qulaydi (yoki qulamasligi):**

- **O'qish** so'rovlari xatoga chidamli: baza javob bermasa sahifa **yiqilmaydi** —
  bo'sh ro'yxat + tepada ogohlantirish (`src/lib/db-status.ts`).
- **Yozish** so'rovlari xatoni yashirmaydi: foydalanuvchi «saqlanmadi»ni aniq ko'radi.
- Har so'rovga **10 soniya taymer** (`src/lib/supabase-fetch.ts`) — sahifa cheksiz kutmaydi;
  `fetch failed` kabi xabarlar sabab + maslahatga aylantiriladi.
- Ulanish uzilganidan keyin **30 soniya** tarmoqqa chiqilmaydi (sahifalar 7–10 soniya
  kutib qolmasligi uchun), so'ng so'rovlar avtomatik qayta uriniladi.
- Ulanish xatosi bo'lsa `/setup` **bitta** xato bilan to'xtaydi — 17 ta so'rovni behuda kutmaydi.

---

## 📊 Funksiyalar

### 1. Dinamik ma'lumotlar (to'liq CRUD + tahlil)
- **O'quvchilar** — F.I.Sh, tug'ilgan sana (birthday tracking), sinf, telefon, izoh.
- **Ota-onalar** — shartnoma raqami/sanasi, uy manzili, o'quvchiga bog'lanish.
- **Dars jadvali** — fan, o'qituvchi, kun (Dushanba–Shanba), vaqt, xona; sinflar bo'yicha filtr.
- **O'qituvchilar** — F.I.Sh, telefon, fan.

### 2. Statik/kategorik ma'lumotlar (ENUM)
- **Davomat:** `keldi` · `kelmadi` · `sababli` · `sababsiz`
- **Uyga ketish:** `o'zi ketdi` · `olib ketishdi` · `avtobusda`
- **Baholash:** raqamli (0–100)

### 3. Tahlil va hisobotlar
- KPI kartalar: o'quvchilar, o'qituvchilar, bugungi davomat %, o'rtacha baho.
- Haftalik davomat grafigi (stacked bar + % line), fanlar bo'yicha o'rtacha baholar,
  uyga ketish pie chart'i, sinflar jadvali, oylik va o'quvchilar kesimidagi hisobotlar.
- **Birthday alert** — bugun tug'ilgan kuni bo'lgan o'quvchilar dashboard, o'quvchilar
  va kunlik davomat sahifalarida 🎂 belgisi bilan ko'rinadi.

---

# 🔐 Kirish va xavfsizlik

- **Login olib tashlangan** (foydalanuvchi tanlovi): sayt shaxsiy — hamma sahifa
  to'g'ridan-to'g'ri ochiladi, yagona o'qituvchi **Muxlisa** (barcha sinflar).
  Eski `/login` va `/setup-access` manzillari `/` ga yo'naltiriladi.
- **O'quvchi portali baribir maxfiy**: har havola tasodifiy token, bazada FAQAT
  SHA-256 xesh saqlanadi — linkini bilmasa hech kim o'quvchi sahifasiga kira olmaydi.
- `auth-core.ts`da hisob/parol (scrypt) funksiyalari saqlangan — kelajakda login
  qayta qo'shilishi kerak bo'lsa tayyor.

# 📱 O'quvchi portali (`/o/...`)

O'qituvchi **O'quvchilar** sahifasida har bir bola uchun **shaxsiy havola** beradi:

- Havola ko'rinishi: `https://sayt.uz/o/<tasodifiy-token>` — ichida **ism, telefon,
  tug'ilgan sana, oddiy ID YO'Q**; bazada faqat **SHA-256 hash** saqlanadi.
- O'quvchi havolani ochadi — **parol so'ralmaydi**, katta kartalardan o'yin tanlaydi.
- Katalog serverda avtomatik yig'iladi: **o'qituvchi yasagan HAMMA o'yinlar**
  (sinf darajasidan qat'i nazar; «Faqat sinf uchun» belgilanganlar va bingo
  bundan mustasno) + darslik o'yinlari (sinf darajasiga mos) + 3 ta tayyor
  mashq o'yini (**«Mashq o'yinlari»** blokda: «Ko'paytirish zinasi», «So'z
  yasash», «Soatni top»). Yangi o'yin qo'shilsa — ro'yxatga O'ZI chiqadi.
  Bingo kabi doska vositalari portaldan yashirin (eski `/classroom` joyida).
- Har o'yin: bitta qisqa yo'riqnoma, katta javob tugmalari, «Savol 2/5» progress,
  to'g'ri/noto'g'ri **rang + ✅/❌ belgi** bilan, oxirida «Yana o'ynash». Vaqt
  bosimi majburiy emas. Har o'ynashda savollar aralashadi (2 o'yinchi bir xonada
  — bir xil savollar).
- **Natijani server tasdiqlaydi**: javob kaliti brauzerga yuborilmaydi, ball
  serverda hisoblanadi, har yakun `game_results` ga (student, game, score, total,
  percent, time, mode) avtomatik yoziladi va «O'yin statistikasi»da darhol
  ko'rinadi. Takroriy so'rov (tarmoq retry) yozuvni ikkilantirmaydi.
- Havolani **yangilash** (eski havola o'ladi) yoki **bekor qilish** — O'quvchilar
  sahifasida, har bir qator
  🔗 tugmalari orqali.

## 📲 Bolalarga havolani qanday yuborish

**Havola = bolaning akkaunti**: parol yo'q, faqat o'z havolasi bilan kiradi.

1. **Bitta bolaga** — O'quvchilar sahifasida qatorni toping → **«Link berish» /
   «Yangilash»** → ochilgan oynada havolani nusxalab **WhatsApp / Telegram**
   tugmasi bilan ota-onasiga yuboring yoki QR'ni telefon kamerasiga skanerlating.
2. **Butun sinfga bir yo'la** — **«Havolalarni chiqarish»** tugmasi → sinf
   tanlanadi → har havola-siz bola uchun **QR kartochka** yasaladi →
   **🖨 Chop etish** bilan kesib tarqating (yoki bolaga skanerlating).
   Allaqachon faol havolasi bor bolalarga tegilmaydi.
3. **Havola yo'qoldi** — qatordagi **«Yangilash»** eski havolani o'chirib yangisini
   bir marta ko'rsatadi; **«Bekor»** esa umuman yopadi.
4. Havolalar FAQAT berilgan paytda ko'rinadi (bazada faqat maxfiy xesh saqlanadi)
   — nusxalash/chop etishni o'sha oynada bajarish shart.

## 🤝 «Do'stim bilan o'ynash» (2 qurilma)

1. O'quvchi portaldan «Do'stim bilan o'ynash» → **taklif havolasi** yasaladi
   (`/o/duo/<kod>`, 2 soat yashaydi) va «Taklif linkini nusxalash» bilan beriladi.
2. Do'st O'Z havolasini ochib, portal bosh sahifasidagi **«Do'stim bilan o'ynash»**
   bo'limiga xona **KODINI** kiritsin (yoki taklif havolasini ochsin). O'z
   akkauntidan kirgani uchun ismi DARHOL ko'rinadi, natija o'z profiliga yoziladi.
   Xona egasi «Boshlash» bosadi (do'st qo'shilmasa ham bosish MUMKIN).
3. **Yakunlanish rejimlari** (o'qituvchi ko'p kishilik rejimlari kabi):
   🎯 Savollar soni · 🏁 Poyga (birinchi tugatgan g'olib) · ⏱ Vaqt bo'yicha
   (1/2/3/5 daqiqa, vaqt tugaguncha savollar davom etadi).
4. Yakunda raqiblar natijasi BIR-BIRIGA avtomatik ko'rinadi (polling);
   poygada g'olib ko'rsatiladi.
3. Uchinchi qurilma qo'shilmaydi; do'st faqat **taxallusni** ko'radi (ism/telefon
   emas). Ochiq chat yoki umumiy reyting yo'q.
4. Sahifa yangilansa yoki tarmoq uzilsa — holat tiklanadi («Qayta ulanmoqda...»).
5. Yakunda natija **har bir o'yinchining O'Z profiliga** yoziladi; sessiyasiz
   mehmon natijasi HECH QAYSI o'quvchiga bog'lanmaydi (faqat taxallus bilan saqlanadi).

**Vercel muhit o'zgaruvchilari:** `NEXT_PUBLIC_SITE_URL` (portal havolalari shu
manzildan yasaladi) + 3 ta Supabase kaliti (yuqorida). Havolalarda ism/telefon
yo'qligi uchun `NEXT_PUBLIC_SITE_URL` aniq ko'rsatilishi tavsiya etiladi.

## ⭐ Ballar, kunlik majburiy o'yin va o'qituvchi nazorati (yangi)

**Ballar tizimi** — har bir tugatgan o'yin uchun avtomatik ball:

| Fan | Ball |
|---|---|
| ⭐ Kunlik MAJBURIY o'yin | **+6** (fandan qat'i nazar) |
| Ona tili va o'qish | **+4** |
| Matematika | **+2** |
| Boshqa fanlar | +2 |

Ballar serverda hisoblanadi (mijoz yuboradigan ball ishonchsiz; kunlik
majburiylik ham serverda qayta tekshiriladi), natija statistikada
«Jami ballar» ustunida va o'yin kartalarida ko'rinadi.

**Har kuni birinchi MAJBURIY o'yin** — bola portallarga kirganda tepada
«⭐ Bugungi majburiy o'yin» banneri chiqadi. Uni tugatmaguncha boshqa o'yinlar
🔒 berkilgan holda ko'rinadi (mashq o'yinlari doim ochiq). Kunlik o'yin
Toshkent vaqti bilan sana + sinf darajasiga qarab tasodifiy tanlanadi va
**~6/10 ehtimol bilan ona tili/o'qish** o'yini chiqadi (qolganlari 4/10).
Tanlov server tomonda qilinadi — bolada almashtirish tugmasi yo'q. Majburiy
o'yin sahifasi ham serverda qayta tekshiriladi: havolani bilib olsa ham,
bajarilmaguncha boshqa o'yin ochilmaydi.

**O'qituvchi nazorati** (/games sahifasida):

- **«Bolalarga ko'rsatish»** tugmasi — har bir o'yin yonida. O'chirilsa o'yin
  bolalar portalida UMUMAN ko'rinmaydi; faqat o'qituvchi qayta yoqadi.
  Mashq o'yinlari doim ochiq.
- **«Statistikani tozalash»** — statistika sahifasidagi tugma. Bosing,
  tasdiqlash oynasida **O'CHIR** deb yozing — hamma o'yin natijalari o'chadi
  (o'quvchilar, linklar, ballar uchun xavfsiz: faqat natijalar tozalanadi).
- Statistikada **mehmon yozuvlari ko'rinmaydi** — faqat ro'yxatga kiritilgan
  o'quvchilar ismlari bilan.

**Sayt tezligi** — ko'p bolalar bir vaqtda o'ynasa: kitob/o'yin kataloglari,
natijalar, yopilgan o'yinlar va javob tekshiruvlari ishlatiladigan ma'lumotlar
qisqa muddatli keshlanadi (har qanday yozish amali keshni darhol yangilaydi,
eski ma'lumot ko'rinmaydi). **Javob tekshirish** odatda 4 ta baza so'rovi
o'rniga 1 taga tushdi (token/sessiya/progress keshlari + guarded yozuv —
parallel holatda ham ball TO'G'RI hisoblanadi). Kitoblar bir vaqtda (parallel)
o'qiladi va katalog sinf bo'yicha keshlanadi. Bazada o'quvchi+vaqt indeksi bor
(migration v4). Qo'shimcha sozlama: Vercel funksiya regioni Supabase loyiha
regioni bilan BIR XIL qilinsa (masalan, Frankfurt) har amal ~0,2–0,5 s tezlashadi.

**Supabase migratsiyasi (v4)** — `supabase/schema-portal.sql` ni to'liq run
qiling YOKI faqat `supabase/migration-v4-points-closed.sql` ni SQL Editor'da
Run qiling. Run qilinmasa: ballar saqlanmaydi va «Bolalarga ko'rsatish»
amali real bazada xato beradi (demo rejimda hammasi ishlaydi).

## Portal testlari

```bash
npm run test:portal    # 148 tekshiruv: havola xavfsizligi, ruxsatlar, ballar, kunlik majburiy, duo xonalar
npm run test:flows     # 73 tekshiruv: to'liq oqimlar — qo'shish→link→o'yin→statistika, 2 qurilma, filtrlar
npm run test:games     # o'yin dvigateli + ko'p kishilik
npm run test:supabase  # Supabase yo'li (kitob→o'yin→natija)
```

---

## 🗂 Loyiha tuzilishi

```
supabase/
  schema.sql          # Task 1: ENUM, jadvallar, VIEW'lar, funksiya, RLS
  seed.sql            # namoyish ma'lumotlari
src/
  app/
    page.tsx          # Task 3: Boshqaruv paneli (dashboard)
    students/         # Task 2: o'quvchilar CRUD
    parents/          # Task 2: ota-onalar CRUD
    teachers/         # Task 2: o'qituvchilar CRUD
    schedule/         # Task 2: dars jadvali CRUD
    daily/            # Task 2: davomat + uyga ketish + baholar (interaktiv)
    analytics/        # Task 3: batafsil hisobotlar
    actions.ts        # Server Actions (barcha mutatsiyalar)
  components/
    ui.tsx            # Tailwind UI kit (Modal, Button, SegmentedControl...)
    Sidebar.tsx
    students/ parents/ teachers/ schedule/ daily/   # sahifa komponentlari
    dashboard/        # Recharts grafiklar, KPI, birthday banner
  lib/
    types.ts          # domen tiplari + Repository interfeysi
    repo/             # supabase.ts | demo.ts (avtomatik tanlov)
    analytics.ts      # SQL VIEW'lar bilan bir xil formuladagi agregatsiyalar
    demo-data.ts      # deterministik demo seed
    utils.ts          # o'zbekcha yorliqlar, sana yordamchilari
```

## 🔁 Ma'lumot oqimi

```
UI (client) ──Server Actions──▶ Repository ──▶ Supabase (yoki Demo xotira)
   ▲                                │
   └──────── revalidatePath ────────┘
```

Barcha mutatsiyalar `src/app/actions.ts` orqali o'tadi, so'ng tegishli sahifalar
`revalidatePath` bilan yangilanadi — demak CRUD → tahlil bir zumda aks etadi.


---

# 📚 Kitob → O'yin moduli

Darslikni (PDF yoki matn) yuklaysiz — tizim uni **mavzularga bo'ladi** va har bir mavzu
ichidagi **misol, masala, qoida, ta'rif, lug'at va matnlardan o'yinlar yasaydi**.
200 betli kitob ham qabul qilinadi.

## Qanday ishlaydi

```
PDF ──(brauzerda pdf.js)──▶ matn ──▶ MUNDARIJA/SARLAVHA tahlili ──▶ mavzular
                                                                      │
     o'yinlar ◀── fan bo'yicha generator ◀── misol/qoida/ta'rif ajratish
```

1. **Matn ajratish** — `src/lib/books/pdf-client.ts` PDF'ni **brauzerda** o'qiydi
   (serverga 30 MB'lik fayl yuklanmaydi, faqat matn yuboriladi).
2. **Mavzularga bo'lish** — `segment.ts` uch usulni ketma-ket sinaydi:
   - **Mundarija** (`Mavzu nomi ..... 12`) — eng aniq usul, sahifa siljishini (offset)
     avtomatik hisoblaydi;
   - **Sarlavhalar** (`12-MAVZU`, `1-dars`, KATTA HARFLI sarlavhalar);
   - **Fallback** — sahifa hajmi bo'yicha teng bo'laklarga bo'lish (har doim ishlaydi).
3. **Material ajratish** — `extract.ts`: arifmetik misollar (`20 · 3 = 60`), masalalar,
   topshiriqlar, `Termin — izoh` juftliklari, o'lchov birliklari, lug'atlar, ro'yxatlar.
4. **O'yin yasash** — `generate.ts`, fan bo'yicha alohida strategiya:

| Fan | O'yinlar |
| --- | --- |
| 🔢 **Matematika** | ⚡ Tez hisob, ⚖️ Tenglamani tekshir, 🔗 O'lchov birliklari, ❓ Masalani yech, 🔀 Sonlarni tartibla |
| 📗 **Ona tili** | ✏️ Bo'sh joyni to'ldir, 🔗 Tushuncha va izoh, ⚖️ Qoidani tekshir, 🔀 Alifbo tartibi, ❓ Imlo testi |
| 📚 **O'qish** | ✏️ Matn bo'yicha to'ldir, 🔀 Gaplar tartibi, ⚖️ Matn bo'yicha savollar, 🔗 Asar va muallif, ❓ Matndagi so'z |
| 🌱 **Tabiiy fanlar** | 🔗 Tushuncha va izoh, ❓ Test, ⚖️ Faktni tekshir, 🧠 Xotira kartalari, ✏️ To'ldirish |
| 🇬🇧 **Ingliz tili** | 🔗 So'z va tarjima, 🧠 Xotira kartalari, ❓ Tarjima testi, 🔀 So'z tuzing, ✏️ To'ldirish |

Har bir o'yin **kitobning qaysi betlaridan** yasalganini ko'rsatadi (`builtFrom`),
o'quvchilar natijalari esa kitob sahifasidagi **leaderboard**da yig'iladi.

## Ishlatish

### 1. Ilova orqali (o'qituvchi uchun)

1. Chap menyudan **«Kitoblar & O'yinlar»** ni oching.
2. **Sinf** va **fanni** tanlang (fan fayl nomidan taxmin qilinadi, lekin siz
   o'zgartira olasiz), so'ng PDF'ni burab tashlang yoki matnni joylang.
   Bir nechta faylni birdan yuklash mumkin.
3. Tahlil tugagach kitob kartasi paydo bo'ladi → **«O'yinlarni ko'rish»**.
4. Mavzuni ochib, o'yinni tanlang va sinfda o'ynang. Natijani o'quvchi ismiga
   saqlash mumkin.

**Skanerlangan (rasm) PDF bo'lsa** — «Matnni qo'lda joylang» bo'limidan kitob
matnini joylashtirib, o'shandan o'yin yasash mumkin.

### 2. CLI orqali (bir nechta kitobni tayyorlash)

```bash
npm run dev                       # server ishga tushgan bo'lishi kerak
node scripts/ingest-pdf.mjs kitob.pdf --subject matematika --grade 3
node scripts/ingest-pdf.mjs kitob.pdf --dry-run      # faqat matn ajratishni sinash
```

### 3. HTTP API

```bash
# Kitoblar ro'yxati
curl http://localhost:3000/api/books/ingest

# Matn yuborib kitob yasash
curl -X POST http://localhost:3000/api/books/ingest \
  -H "Content-Type: application/json" \
  -d '{"title":"Matematika 3-sinf","grade":3,"subject":"matematika","text":"1-MAVZU. ..."}'
```

### 4. Ma'lumotlar faqat yuklangan kitoblardan olinadi

Ilovada kodi ichiga "qotirib" qo'yilgan namuna kitob, tayyor savol yoki darslik
matni **yo'q** — barcha mavzular, so'zlar va o'yinlar siz yuklagan kitobdan
yasaydi. Kitob yuklanmagan bo'lsa, «Kitoblar» sahifasi shunchaki bo'sh holatni
ko'rsatadi. Doimiy sozlamalar (sinf oralig'i, chegaralar, alifbo) — bitta joyda:
`src/lib/config.ts`.

## Dvigatelni sinash

```bash
npm run test:books                          # yuklangan hamma kitob ustida hisobot
npx tsx scripts/test-book-engine.mts .data/books/<id>.json
```

Skript `.data/books/*.json` dagi kitoblarni o'qib, mavzu → o'yin → element
hisobini chiqaradi. Kitob hali yuklanmagan bo'lsa, shuni aytadi.

## Ma'lumotlar qayerda saqlanadi

| Nima | Supabase ulangan | Supabase'siz (demo) |
| --- | --- | --- |
| Maktab ma'lumotlari | `students`, `teachers`, ... | xotiradagi namoyish ma'lumotlari |
| Yuklangan kitoblar | `books` jadvali (`topics` = jsonb) | `.data/books/*.json` (git'ga tushmaydi) |
| O'yin natijalari | `game_results` jadvali | xotira (portal + fayl `.data/game-results.json`) |
| O'qituvchi o'yinlari | `custom_games` jadvali | `.data/custom-games.json` |
| Portal havolalari | `student_links` (faqat hash) | xotira (`demo().links`) |
| Portal sessiyalari/xonalar | `game_sessions` (3 soat) / `game_rooms` (2 soat) | xotira (`demo().sessions` / `demo().rooms`) |

> **Vercel/read-only muhitda** fayl tizimi ishlamaydi — shuning uchun Supabase
> kalitlarini qo'ying: `src/lib/books/db.ts` (Supabase qatlami) avtomatik yoqiladi,
> fayllar esa faqat Supabase sozlanmagan demo rejimda ishlatiladi. Interfeys bir xil.

## Fayl tuzilishi (kitoblar moduli)

```
src/lib/books/
  types.ts         # tiplar: Book, Topic, Game, 13 o'yin turi, fanlar
  text.ts          # matnni tozalash, gaplarga bo'lish, kalit so'zlar, seed'li RNG
  segment.ts       # kitob → mavzular (mundarija / sarlavha / fallback)
  extract.ts       # misol, masala, qoida, ta'rif, lug'at, ro'yxat ajratish
  generate.ts      # fan bo'yicha o'yin generatorlari
  store.ts         # ingest orkestratsiyasi, saqlash (Supabase yoki fayl), yuklash sessiyalari
  db.ts            # Supabase qatlami: books / custom_games / game_results
  pdf-client.ts    # brauzerda PDF o'qish (pdf.js)

src/app/books/
  page.tsx                     # kitoblar ro'yxati + yuklash paneli
  [id]/page.tsx                # kitob: mavzular va o'yinlar
  [id]/play/[gameId]/page.tsx  # o'yin maydoni
  actions.ts                   # server amallari (yuklash, o'chirish, natija)
src/app/api/books/ingest/route.ts   # HTTP API

src/components/books/
  BooksClient.tsx  # yuklash paneli, kitob kartalari
  BookDetail.tsx   # mavzu akkordeoni, o'yin kartalari, leaderboard
  GamePlayer.tsx   # 13 xil o'yin interfeysi

src/lib/config.ts              # doimiy qiymatlar (sinflar, alifbo, limitlar, taymerlar)
src/lib/books/custom.ts        # o'qituvchi o'yinlari: Supabase `custom_games` yoki `.data/custom-games.json`
src/lib/books/custom-parse.ts  # matn → o'yin elementlari (+ normallashtirish)
src/lib/books/quiz-pool.ts     # doska viktorinasi uchun savollar havzasi

src/app/games/                 # o'qituvchi o'yinlari (ro'yxat, yangi, o'ynash, tahrirlash)
src/app/classroom/             # sinf bilan o'ynash: charxpalak, viktorina, bingo
src/app/api/games/custom/      # o'yin yasash API

src/components/games/          # GameBuilder (muharrir), CustomGameList
src/components/classroom/      # Wheel, TeamQuiz, BingoGenerator
src/components/books/GameBoards.tsx  # yangi taxtalar: balon, puzzle, harf, guruh, bingo

scripts/
  ingest-pdf.mjs        # CLI: PDF → server
  test-book-engine.mts  # dvigatel testi
```

> **Eslatma:** `public/pdf.worker.min.mjs` — pdf.js ishchi fayli (brauzerda PDF o'qish uchun).
> `npm ci` dan keyin kerak bo'lsa qayta nusxalang:
> `cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/`


---

# 🎮 O'yin turlari (13 xil)

| O'yin | Belgisi | Nima qiladi | Qaysi fanga mos |
| --- | --- | --- | --- |
| **Test** | ❓ | Savolga 4 variantdan bittasi | hammasi |
| **To'g'ri / noto'g'ri** | ⚖️ | Fikrni ✅ yoki ❌ bilan belgilash | matematika, tabiiy fan, qoidalar |
| **Juftini top** | 🔗 | Chap va o'ng ustunni **sudrab** ulash | chet tili, ta'riflar |
| **Xotira kartalari** | 🧠 | Kartalarni ochib juftlikni topish | so'z boyligi, formulalar |
| **Bo'sh joyni to'ldir** | ✏️ | Gapdagi tushib qolgan so'z | ona tili, o'qish |
| **Tartibla** | 🔀 | So'z/gap/sonlarni tartibga solish | ona tili, o'qish |
| **Bo'laklardan yig' (puzzle)** | 🧩 | Bo'g'in/bo'laklardan so'z yasash | ona tili, o'qish, chet tili |
| **Tushib qolgan harf** | 🔤 | `k_tob` → `kitob` | alifbe, imlo, chet tili |
| **Xatoni top** | 🔍 | To'g'ri yozilganini topish | imlo, gap tuzilishi |
| **Guruhlarga ajrat** | 🗂 | So'zlarni **sudrab** guruhga tashlash | tabiiy fan, so'z turkumlari |
| **Tez hisob** | ⚡ | Misolni yechish | matematika |
| **Balonni ot** | 🎈 | To'g'ri javobli balonni yorish (**vaqt bilan**) | matematika |
| **Bingo kartasi** | 🎟 | Sinf bilan: o'qituvchi aytadi, o'quvchi belgilaydi | hammasi |

Har bir tur **kitobdan avtomatik** ham, **o'qituvchi qo'li bilan** ham yasalishi mumkin.

---

# 👥 Bir qurilmada 1 / 2 / 3 kishi o'ynash

Har qanday o'yin ochilganda (kitob o'yini `/books/[id]/play/[gameId]` yoki o'qituvchi
o'yini `/games/[id]`) avval **«Nech kishi o'ynaydi?»** so'raladi: **1** (standart), **2** yoki **3**.

| Nima | Qanday ishlaydi |
| --- | --- |
| **1 kishi** | Avvalgi oqim o'zgarmagan: butun ekran, bitta hisob, natijani o'quvchiga saqlash |
| **2–3 kishi** | Ekran bo'linadi — har o'yinchining **o'z maydoni, o'z holati va o'z hisobi**; ismi yoziladi yoki o'quvchilar ro'yxatidan tanlanadi (standart: «1-o'yinchi», «2-o'yinchi», «3-o'yinchi») |
| **Birga boshlash** | Hamma **bir vaqtda** boshlaydi va bir vaqtda o'ynaydi: kim o'z savolini bitirdi — keyingisiga o'tadi, boshqalar o'zinikini davom ettiradi |
| **Har xil savol** | Bir xil misol ikki o'yinchiga tushmaydi — to'plam o'yinchilar orasida adolatli bo'linadi (har birida elementlar soni teng). To'plam kichik bo'lsa har kimga bir xil to'plam **har xil tartibda** beriladi, bingo'da har kimda **o'z kartasi** |
| **🔢 Savollar soni** | Har o'yinchiga nechta savol (taxta o'yinlarida — nechta taxta) berilishi kirishda sozlanadi. Yakunlanishi: **birinchi tugatgan** (poyga) yoki **hammasi tugatguncha** |
| **⏱ Vaqt bo'yicha** | Minut tanlanadi (1 / 2 / 3 / 5 / 10) — vaqt tugaguncha savollar ketma-ket kelib turadi, oxirida kim nechta ishlagani chiqadi |
| **Joylashuv** | Telefonda (**portrait**) maydonlar ustma-ust, keng ekranda (**landscape**) yonma-yon — `tailwind.config.ts`ga qo'shilgan `orientation` media query, ekran aylanganda o'zi qayta quriladi |
| **Avto-moslashuv** | Taxtalar o'z konteyneriga kichrayib sig'adi (`FitBox`), ichki scroll/overflow bo'lmaydi, sensorli (touch) boshqaruv har maydonda ishlaydi |
| **Faol o'yinchi** | Maydon romi va yorlig'i rang bilan ajratiladi (🦊 indigo / 🐼 yashil / 🦁 sariq), oxirgi harakat qilgan o'yinchi «Faol» deb belgilanadi |
| **Natija** | Hisoblar yonma-yon (telefonda ustma-ust), **«G'olib: X 🏆»** yoki **«Durrang!»**, har birida ball / bajarilgan savollar / foiz / yulduz / vaqt |
| **Saqlash** | Har o'yinchining natijasi `game_results`ga **alohida yozuv** bo'lib tushadi: o'quvchi tanlangan bo'lsa `student_id` bilan, tanlanmagan bo'lsa kiritilgan ism bilan |

> **Texnik:** rejim tanlash `GamePlayer` darajasida umumiy — taxta komponentlari
> duplikatlanmagan. Bitta `<PlayArea>` har maydonda o'z `items` / `compact` /
> `onProgress` props'lari bilan render bo'ladi. Sof mantiq (tarqatish, raundlar,
> o'rinlar) `src/lib/books/multiplayer.ts`da, hisobot `src/lib/books/game-stats.ts`da —
> ikkalasi ham `npm run test:games` bilan tekshiriladi. `/classroom` vositalari
> (charxpalak, guruhlar viktorinasi, bingo generatori) sinf uchun — bu rejim ularga tegishli emas.

---

# 📈 O'yinlar statistikasi (`/games/stats`)

Barcha saqlangan natijalar bir joyda (yon panel: **«O'yin statistikasi»**):

- **umumiy**: jami o'ynashlar, o'rtacha natija, o'yinchilar soni, ko'p kishilik yozuvlar;
- **eng yaxshi o'yinchilar** — foiz va o'yinlar soni bo'yicha;
- **o'yinlar kesimida** — nechta o'ynalgan, nechta o'yinchi, o'rtacha va eng yaxshi natija, oxirgi o'yin;
- **o'yin turlari kesimida** — har tur uchun o'ynashlar va o'rtacha foiz;
- **oxirgi natijalar** — ism/o'yin bo'yicha qidiruv va tur filtri bilan.

2–3 kishilik o'yinda har o'yinchi alohida qator bo'lib tushadi. O'quvchi tanlanmagan
bo'lsa, yozuv kiritilgan ism bilan saqlanadi va «(ism bilan)» belgisi qo'yiladi.

---

# 🎡 Sinf bilan o'ynash (`/classroom`)

| Format | Tavsif |
| --- | --- |
| **🎡 Charxpalak** | Navbat bilan o'quvchi chaqirish (sinf ro'yxatidan) yoki savol/so'z tanlash. Chiqqanlar ro'yxatdan chiqib ketadi — takrorlanmaydi. |
| **🏆 Guruhlar viktorinasi** | Kahoot uslubida: savol doskada katta ko'rinadi, taymer ishlaydi, 2–4 guruhga ball qo'yiladi. Savollar kitob o'yinlaridan avtomatik yig'iladi. |
| **🎟 Bingo kartalari** | O'z so'zlaringiz yoki kitob mavzusidan 1–20 ta unikal karta. 3×3, 4×4, 5×5. **Chop etib o'quvchilarga tarqatish** mumkin (Ctrl+P → PDF). |
| Kitob o'yinlarida **🎟 Bingo** | Doskada o'ynaladigan interaktiv bingo: o'qituvchi paneli, belgilash, avtomatik BINGO aniqlash. |

---

# ✏️ O'qituvchi o'z o'yinini yasashi (`/games`)

Kitob ham kerak emas — o'qituvchi o'z materialini kiritadi.

### Tez usul (matn yozish)

O'yin turini tanlab, qatorlarga yozadi — tizim o'zi tahlil qiladi:

```
matching / memory :   kitob — book
grouping          :   olma — Mevalar
truefalse         :   Suv 100°C da qaynaydi | to'g'ri
fill              :   Kitob — bilim ______ | manbai
missingletter     :   k_tob | kitob
puzzle            :   kitob | ki,tob
order             :   Gapni tartibla | Bugun | havo | issiq
math / pop        :   24 + 38 = 62
quiz              :   Poytaxti qaysi shahar? | Toshkent | Samarqand | Buxoro
findmistake       :   kitob | kitab | ktob   (birinchi so'z — to'g'ri yozilgani)
bingo             :   olma   (har bir qator — bitta karta)
```

Tizim **o'zi** qolganini qiladi:
- test savollariga **chalg'ituvchi variantlar** yasaydi (sonlar uchun yaqin sonlar, so'zlar uchun o'xshash variantlar);
- `k_tob` uchun **4 ta harf varianti** tayyorlaydi;
- bo'laklar ko'rsatilmagan bo'lsa, so'zni **bo'g'inlarga** bo'ladi;
- o'qituvchi yozgan variantlarni **saqlab qoladi**, yetmaganini o'zi qo'shadi;
- javob variantlarini **aralashtiradi** (to'g'ri javob doim birinchi turmaydi);
- tushunilmagan qatorlarni **ko'rsatib beradi** (o'yinda ishlatilmaydi).

Matn kiritilganda natija **darhol** ko'rinadi (brauzerda tahlil qilinadi, server kutilmaydi).

### Jadval usuli

Har bir savol/juftlikni alohida maydonlarda kiritish, to'g'ri javobni belgilash (**A/B/C/D**),
qiyinlikni tanlash. Ikkala usulni almashtirib ishlatsa bo'ladi.

### Boshqa imkoniyatlar
- O'yinni **kitob va mavzuga bog'lash** — u holda kitob sahifasida ham ko'rinadi.
- Har bir o'yinni **tahrirlash**, **o'chirish**, **havolasini ulashish** (o'quvchilarga yuborish).
- Natijalar o'quvchi ismiga saqlanadi, **leaderboard**ga va **`/games/stats`** sahifasiga tushadi.

### API orqali (bir nechta o'yinni birdan)

```bash
curl -X POST http://localhost:3000/api/games/custom \
  -H "Content-Type: application/json" \
  -d '{"games":[
        {"title":"Mevalar","type":"grouping","subject":"tabiiy-fanlar","text":"olma — Mevalar\nkartoshka — Sabzavotlar"},
        {"title":"Imlo","type":"missingletter","subject":"ona-tili","text":"k_tob | kitob"}
      ]}'
```
