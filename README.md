# 🎓 Teachers Workspace — Maktab boshqaruv tizimi

Teacher & Admin Dashboard for a school management platform:
**Next.js (App Router) · TypeScript · Tailwind CSS · Recharts · Supabase**

| Bo'lim | Nima bor |
| --- | --- |
| **`supabase/schema.sql`** | **Task 1** — ENUM'lar, barcha jadvallar (FK + `ON DELETE CASCADE`), tahlil VIEW'lari, yordamchi funksiya, RLS |
| **`supabase/seed.sql`** | Namoyish ma'lumotlari (shu jumladan bugun tug'ilgan kuni bo'lgan o'quvchi) |
| **`src/app/*` + `src/components/*`** | **Task 2** — Students / Parents / Teachers / Schedule CRUD, kunlik davomat, uyga ketish, baholash, birthday alert |
| **`src/app/page.tsx` + `src/app/analytics`** | **Task 3** — Recharts dashboard: KPI kartalar, haftalik davomat grafigi, fanlar kesimida baholar, dismissal pie, hisobotlar |

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
