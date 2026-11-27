-- ============================================================================
--  TEACHERS WORKSPACE — PORTAL MIGRATSIYASI (v2)
--  Bu fayl `schema.sql` dan KEYIN Supabase SQL Editor'da run qilinadi.
--  Qayta run qilish XAVFSIZ (hech narsa o'chirilmaydi).
--
--  Nima qo'shiladi:
--    1. teacher_accounts / teacher_sessions / teacher_class_access
--       — o'qituvchi logini va sinf bo'yicha kirish huquqi
--    2. student_links — o'quvchi shaxsiy linki (bazada faqat TOKEN XESHI)
--    3. game_sessions — serverda tekshiriladigan o'yin sessiyalari
--       (javob kaliti faqat serverda: brauzerga chiqmaydi)
--    4. game_rooms / game_room_progress — ikki qurilmada "Do'stim bilan
--       o'ynash" xonalari (muddatli, 3-kishi qabul qilinmaydi)
--    5. game_results — yangi ustunlar: mode, percent, source (idempotent)
--
--  RLS: barcha yangi jadvallar RLS yoqilgan. `anon` rollarga HECH QANDAY
--  siyosat BERILMAYDI (default deny) — anon kalit egasi hech narsa o'qiy olmaydi.
--  Ilova server tomonda SUPABASE_SERVICE_ROLE_KEY bilan ishlaydi va KIRISH
--  NAZORATI ILOVA KODIDA amalga oshiriladi (requireTeacher / token tekshiruvi).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. O'QITUVCHI HISOBLARI (login)
--    `teachers` jadvalidagi o'qituvchi bilan bog'lanadi (teacher_id — ixtiyoriy,
--    mavjud o'qituvchi yozuvlari AVTOMATIK biriktirilmaydi).
-- ---------------------------------------------------------------------------
create table if not exists teacher_accounts (
  id            uuid primary key default gen_random_uuid(),
  teacher_id    uuid references teachers (id) on delete set null,
  email         text not null unique check (position('@' in email) > 1),
  display_name  text not null default '',
  password_hash text not null,           -- scrypt: N$r$s<hash> formatida
  role          text not null default 'teacher' check (role in ('admin', 'teacher')),
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists teacher_sessions (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references teacher_accounts (id) on delete cascade,
  token_hash text not null unique,       -- cookie'dagi tokenning SHA-256 xeshi
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_teacher_sessions_account on teacher_sessions (account_id);
create index if not exists idx_teacher_sessions_expires on teacher_sessions (expires_at);

-- Sinf bo'yicha kirish huquqi: admin hamma sinflarni ko'radi, oddiy o'qituvchi
-- faqat shu yerda aniq berilgan sinflarni. HECH NARSA avtomatik biriktirilmaydi.
create table if not exists teacher_class_access (
  account_id uuid not null references teacher_accounts (id) on delete cascade,
  class_name text not null,
  granted_at timestamptz not null default now(),
  primary key (account_id, class_name)
);

-- ---------------------------------------------------------------------------
-- 2. O'QUVCHI SHAXSIY LINKLARI
--    Link tokeni bazada FAQAT SHA-256 XESH ko'rinishida saqlanadi — tokenning
--    o'zi faqat yaratilgan paytda o'qituvchiga bir marta ko'rsatiladi.
--    Bir o'quvchida bir vaqtda faqat BITTA faol link bo'ladi.
-- ---------------------------------------------------------------------------
create table if not exists student_links (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students (id) on delete cascade,
  token_hash text not null unique,       -- 32 baytli tasodifiy tokenning xeshi
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- Faqat faol linklar uchun bitta-link-qishloqqa cheklov
create unique index if not exists uq_student_links_active
  on student_links (student_id) where active;

create index if not exists idx_student_links_student on student_links (student_id);

-- ---------------------------------------------------------------------------
-- 3. O'YIN SESSIYALARI (serverda tekshiriladigan o'yinlar)
--    `questions` brauzerga yuboriladi (javobsiz), `answer_key` FAQAT SERVERDA
--    qoladi. Ball serverda hisoblanadi — mijoz yuborgan ballga ishonilmaydi.
-- ---------------------------------------------------------------------------
create table if not exists game_sessions (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students (id) on delete cascade,
  game_key   text not null,
  game_title text not null default '',
  game_type  text not null default 'quiz',
  mode       text not null default 'solo' check (mode in ('solo', 'duo')),
  room_id    text,
  questions  jsonb not null default '[]'::jsonb,
  answer_key jsonb not null default '[]'::jsonb,
  score      smallint not null default 0,
  answered   smallint not null default 0,
  total      smallint not null default 0,
  status     text not null default 'active' check (status in ('active', 'done', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '3 hours',
  finished_at timestamptz
);

create index if not exists idx_game_sessions_student on game_sessions (student_id);
create index if not exists idx_game_sessions_status  on game_sessions (status);

-- ---------------------------------------------------------------------------
-- 4. DO'ST BILAN IKKI QURILMADA O'YNASH — XONALAR
--    Taklif linki shaxsiy o'quvchi linkidan ALOHIDA: faqat bitta xona, muddatli,
--    uchinchi o'yinchi qabul qilinmaydi. Do'st faqat taxallusini ko'radi.
-- ---------------------------------------------------------------------------
create table if not exists game_rooms (
  id                text primary key,            -- 6 belgili tasodifiy kod
  game_key          text not null,
  game_title        text not null default '',
  game_type         text not null default 'quiz',
  subject           text not null default 'boshqa',
  grade             smallint,
  status            text not null default 'waiting'
                    check (status in ('waiting', 'playing', 'finished', 'cancelled')),
  host_student_id   uuid not null references students (id) on delete cascade,
  host_name         text not null default '',    -- taxallus (to'liq ism emas)
  guest_student_id  uuid references students (id) on delete set null,
  guest_name        text not null default '',
  host_secret_hash  text not null,               -- reconnect uchun maxfiy kalit xeshi
  guest_secret_hash text,                        -- mehmon qo'shilgacha null
  seed              integer not null default 0,  -- ikkala o'yinchiga bir xil savollar
  questions         jsonb not null default '[]'::jsonb,
  answer_key        jsonb not null default '[]'::jsonb,
  total             smallint not null default 0,
  expires_at        timestamptz not null default now() + interval '2 hours',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  finished_at       timestamptz
);

create index if not exists idx_game_rooms_host   on game_rooms (host_student_id);
create index if not exists idx_game_rooms_guest  on game_rooms (guest_student_id);
create index if not exists idx_game_rooms_status on game_rooms (status);

-- Har o'yinchining progressi Bitta qatorda (upsert) — bir vaqtda bosganda
-- takrorlanmaydi. `attempt_id` — mijoz generatsiya qilgan idempotency kaliti.
create table if not exists game_room_progress (
  room_id    text not null references game_rooms (id) on delete cascade,
  player     text not null check (player in ('host', 'guest')),
  score      smallint not null default 0,
  answered   smallint not null default 0,
  done       boolean not null default false,
  attempt_id text not null default '',
  updated_at timestamptz not null default now(),
  primary key (room_id, player)
);

-- ---------------------------------------------------------------------------
-- 5. GAME_RESULTS — yangi ustunlar (mavjud qatorlar o'zgarmaydi)
-- ---------------------------------------------------------------------------
alter table game_results add column if not exists mode   text;             -- solo | duo | null(dashboard)
alter table game_results add column if not exists percent smallint;        -- 0..100
alter table game_results add column if not exists source text not null default 'dashboard'; -- portal | dashboard

create index if not exists idx_results_mode on game_results (mode);

-- ---------------------------------------------------------------------------
-- 6. CUSTOM_GAMES — portalga ulashish belgisi
--    O'qituvchi istagan o'yinni "Faqat sinf uchun" deb belgilashi mumkin —
--    bunday o'yinlar o'quvchi portaliga AVTOMATIK chiqmaydi.
-- ---------------------------------------------------------------------------
alter table custom_games add column if not exists for_students boolean not null default true;

-- ---------------------------------------------------------------------------
-- 7. RLS — yangi jadvallar ham xuddi schema.sql dagi kabi:
--    authenticated uchun to'liq CRUD (ilova service_role bilan serverdan
--    ishlaydi), anon uchun HECCH NARSA (default deny).
-- ---------------------------------------------------------------------------
alter table teacher_accounts     enable row level security;
alter table teacher_sessions     enable row level security;
alter table teacher_class_access enable row level security;
alter table student_links        enable row level security;
alter table game_sessions        enable row level security;
alter table game_rooms           enable row level security;
alter table game_room_progress   enable row level security;

do $$
declare t text;
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    raise notice 'authenticated roli yo''q — RLS siyosatlari o''tkazib yuborildi';
    return;
  end if;

  foreach t in array array['teacher_accounts','teacher_sessions','teacher_class_access',
                           'student_links','game_sessions','game_rooms','game_room_progress']
  loop
    execute format('drop policy if exists "%1$s_select" on %1$s;', t);
    execute format('drop policy if exists "%1$s_insert" on %1$s;', t);
    execute format('drop policy if exists "%1$s_update" on %1$s;', t);
    execute format('drop policy if exists "%1$s_delete" on %1$s;', t);

    execute format('create policy "%1$s_select" on %1$s for select to authenticated using (true);', t);
    execute format('create policy "%1$s_insert" on %1$s for insert to authenticated with check (true);', t);
    execute format('create policy "%1$s_update" on %1$s for update to authenticated using (true) with check (true);', t);
    execute format('create policy "%1$s_delete" on %1$s for delete to authenticated using (true);', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 8. TEKSHIRUV — portal sxemasi o'rnatilganini ko'rsatadi (faqat o'qish).
--    Har bir qator ✅/❌ — ❌ bo'lsa shu faylni qaytadan run qiling.
-- ---------------------------------------------------------------------------
with expected as (
  select 'teacher_accounts' as t union all select 'teacher_sessions'
  union all select 'teacher_class_access' union all select 'student_links'
  union all select 'game_sessions' union all select 'game_rooms'
  union all select 'game_room_progress'
),
actual as (
  select
    (select count(*) from expected e where exists (select 1 from information_schema.tables x
        where x.table_schema = 'public' and x.table_name = e.t))                                    as tables_n,
    (select count(*) from information_schema.columns where table_schema = 'public'
        and table_name = 'game_results' and column_name in ('mode','percent','source'))             as result_cols_n,
    (select count(*) from information_schema.columns where table_schema = 'public'
        and table_name = 'custom_games' and column_name = 'for_students')                           as games_flag_n,
    (select count(*) from pg_indexes where schemaname = 'public'
        and indexname = 'uq_student_links_active')                                                  as link_idx_n,
    (select count(*) from expected e where exists (select 1 from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = e.t and c.relrowsecurity))                       as rls_n
)
select
  a.tables_n     as "Yangi jadvallar (7)",
  case when a.tables_n = 7 then '✅' else '❌' end as "Holat-1",
  a.result_cols_n as "game_results yangi ustunlar (3)",
  case when a.result_cols_n = 3 then '✅' else '❌' end as "Holat-2",
  a.games_flag_n as "custom_games.for_students",
  case when a.games_flag_n = 1 then '✅' else '❌' end as "Holat-3",
  a.link_idx_n   as "student_links faol-indeks",
  case when a.link_idx_n = 1 then '✅' else '❌' end as "Holat-4",
  a.rls_n        as "RLS yoqilgan jadvallar (7)",
  case when a.rls_n = 7 then '✅' else '❌' end as "Holat-5"
from actual a;

-- ============================================================================
-- Tayyor! Endi ilovada /setup-access sahifasi orqali BIRINCHI admin hisobini
-- yarating (batafsil: README — "O'qituvchi logini yoqish").
-- ============================================================================
