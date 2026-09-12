# 🎓 Teachers Workspace — Maktab boshqaruv tizimi

Teacher & Admin Dashboard for a school management platform:
**Next.js (App Router) · TypeScript · Tailwind CSS · Recharts · Supabase**

| Bo'lim | Nima bor |
| --- | --- |
| **`supabase/schema.sql`** | **Task 1** — ENUM'lar, barcha jadvallar (FK + `ON DELETE CASCADE`), tahlil VIEW'lari, yordamchi funksiya, RLS |
| **`supabase/seed.sql`** | Namoyish ma'lumotlari (shu jumladan bugun tug'ilgan kuni bo'lgan o'quvchi) |
| **`src/app/*` + `src/components/*`** | **Task 2** — Students / Parents / Teachers / Schedule CRUD, kunlik davomat, uyga ketish, baholash, birthday alert |
| **`src/app/page.tsx` + `src/app/analytics`** | **Task 3** — Recharts dashboard: KPI kartalar, haftalik davomat grafigi, fanlar kesimida baholar, dismissal pie, hisobotlar |
| **`src/lib/books/*` + `src/app/books/*`** | **Kitob → O'yin** — darslikni PDF'dan o'qib mavzularga bo'ladi va har bir mavzudan o'yinlar yasaydi (5 fan uchun namuna kitoblar bilan) |
| **`src/lib/books/custom*` + `src/app/games/*`** | **O'qituvchi o'yin yasash** — 13 xil o'yin turi, o'z so'zlari/misollari bilan (matn yoki jadval orqali) |
| **`src/app/classroom`** | **Sinf bilan o'ynash** — 🎡 charxpalak, 🏆 guruhlar viktorinasi (Kahoot uslubida), 🎟 bingo kartalari (chop etish) |

---

## ⚡ Tez start (Supabase'siz — Demo rejimi)

```bash
npm install
npm run dev          # http://localhost:3000
```

Agar `.env.local` da Supabase kalitlari **bo'lmasa**, ilova avtomatik **Demo rejimi**ga
o'tadi: xotiradagi realistik namoyish ma'lumotlari bilan to'liq CRUD va grafiklar
ishlaydi (server qayta ishga tushganda yangilanadi).

## 🔌 Supabase'ni ulash (real ma'lumotlar)

1. [supabase.com](https://supabase.com) da yangi project yarating.
2. **SQL Editor** → `supabase/schema.sql` tarkibini to'liq run qiling.
3. (Ixtiyoriy) `supabase/seed.sql` ni run qiling — namoyish ma'lumotlari uchun.
4. `.env.local.example` faylini `.env.local` deb nusxalab to'ldiring:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...   # faqat server uchun
   ```

5. `npm run dev` — yon panel'da **«Supabase ulangan»** belgisi paydo bo'ladi.

> **RLS:** sxemada `authenticated` role uchun to'liq CRUD politikalari bor.
> Auth qo'shilgach, `SUPABASE_SERVICE_ROLE_KEY`'ni olib tashlab, `@supabase/ssr` +
> aniq rollarga asoslangan politikalarga o'ting.

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
2. PDF'ni burab tashlang (bir nechta faylni birdan yuklash mumkin).
   Fan nomi fayl nomidan avtomatik aniqlanadi.
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

### 4. Namuna kitoblar

Tizimda 3-sinfning **5 fani** bo'yicha rasmiy mundarija asosida tayyorlangan namuna
kitoblar bor (`src/lib/books/samples.ts`): Matematika, Ona tili, O'qish savodxonligi,
Tabiatshunoslik, Ingliz tili — jami **100+ o'yin, 600+ savol**. Ular yuklashsiz
darhol sinab ko'rish uchun kerak.

## Dvigatelni sinash

```bash
npm run test:books     # namuna kitoblar + 200 betli sun'iy kitob segmentatsiyasi
```

## Ma'lumotlar qayerda saqlanadi

| Nima | Joy |
| --- | --- |
| Namuna kitoblar | kod ichida (`samples.ts`) |
| Yuklangan kitoblar | `.data/books/*.json` (git'ga tushmaydi) |
| O'yin natijalari | `.data/game-results.json` |

> **Vercel/read-only muhitda** fayl tizimi ishlamaydi — bu holda `src/lib/books/store.ts`
> dagi `saveBook`/`listUploadedBooks`/`saveResult` funksiyalarini Supabase jadvaliga
> (`books`, `game_results`) o'tkazing. Interfeys o'zgarmaydi.

## Fayl tuzilishi (kitoblar moduli)

```
src/lib/books/
  types.ts         # tiplar: Book, Topic, Game, 7 o'yin turi, fanlar
  text.ts          # matnni tozalash, gaplarga bo'lish, kalit so'zlar, seed'li RNG
  segment.ts       # kitob → mavzular (mundarija / sarlavha / fallback)
  extract.ts       # misol, masala, qoida, ta'rif, lug'at, ro'yxat ajratish
  generate.ts      # fan bo'yicha o'yin generatorlari
  samples.ts       # 5 ta namuna kitob (3-sinf)
  store.ts         # ingest orkestratsiyasi, fayl saqlash, yuklash sessiyalari
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
  GamePlayer.tsx   # 7 xil o'yin interfeysi

src/lib/books/custom.ts        # o'qituvchi o'yinlarini saqlash (.data/custom-games.json)
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
quiz / findmistake:   Poytaxti qaysi shahar? | Toshkent | Samarqand | Buxoro
bingo             :   olma   (har bir qator — bitta karta)
```

Tizim **o'zi** qolganini qiladi:
- test savollariga **chalg'ituvchi variantlar** yasaydi (sonlar uchun yaqin sonlar, so'zlar uchun o'xshash variantlar);
- `k_tob` uchun **4 ta harf varianti** tayyorlaydi;
- bo'laklar ko'rsatilmagan bo'lsa, so'zni **bo'g'inlarga** bo'ladi;
- tushunilmagan qatorlarni **ko'rsatib beradi** (o'yinda ishlatilmaydi).

Matn kiritilganda natija **darhol** ko'rinadi (brauzerda tahlil qilinadi, server kutilmaydi).

### Jadval usuli

Har bir savol/juftlikni alohida maydonlarda kiritish, to'g'ri javobni belgilash (**A/B/C/D**),
qiyinlikni tanlash. Ikkala usulni almashtirib ishlatsa bo'ladi.

### Boshqa imkoniyatlar
- O'yinni **kitob va mavzuga bog'lash** — u holda kitob sahifasida ham ko'rinadi.
- Har bir o'yinni **tahrirlash**, **o'chirish**, **havolasini ulashish** (o'quvchilarga yuborish).
- Natijalar o'quvchi ismiga saqlanadi va **leaderboard**ga tushadi.

### API orqali (bir nechta o'yinni birdan)

```bash
curl -X POST http://localhost:3000/api/games/custom \
  -H "Content-Type: application/json" \
  -d '{"games":[
        {"title":"Mevalar","type":"grouping","subject":"tabiiy-fanlar","text":"olma — Mevalar\nkartoshka — Sabzavotlar"},
        {"title":"Imlo","type":"missingletter","subject":"ona-tili","text":"k_tob | kitob"}
      ]}'
```
