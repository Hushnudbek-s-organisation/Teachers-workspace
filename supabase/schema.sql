-- ============================================================================
--  TEACHERS WORKSPACE — to'liq Supabase sxemasi
--  Bu faylni Supabase panelida:  SQL Editor → New query → joylashtirib Run
--
--  Nima yaratiladi:
--    1. ENUM'lar      — davomat va uyga ketish holatlari
--    2. JADVALLAR     — maktab qismi: students, parents, teachers, schedules,
--                       attendance, dismissal, grades
--                     — kitob/o'yin qismi: books, custom_games, game_results
--    3. VIEW'lar      — tahlil: kunlik/oylik davomat, sinf va fan kesimi,
--                       o'quvchi umumiy ko'rsatkichi, bugungi tug'ilgan kunlar
--    4. FUNKSIYA      — fn_attendance_rate(student, from, to)
--    5. RLS           — yoqilgan + siyosatlar (authenticated uchun)
--
--  Skript XAVFSIZ qayta ishga tushiriladi: mavjud jadvallar va ma'lumotlar
--  o'chirilmaydi (create if not exists / create or replace).
--  Toza boshidan boshlash kerak bo'lsa — eng pastdagi "FRESH RESET" bo'limiga
--  qarang.
-- ============================================================================

-- gen_random_uuid() PostgreSQL 13+ da o'rnatilgan; pgcrypto esa eski versiyalar
-- uchun. Supabase'da bu blok har doim muvaffaqiyatli o'tadi.
do $$
begin
  create extension if not exists pgcrypto;
exception when others then
  raise notice 'pgcrypto mavjud emas — gen_random_uuid() o''zi ishlaydi';
end $$;

-- ---------------------------------------------------------------------------
-- 0. FRESH RESET (ixtiyoriy) — barcha ma'lumotni o'chirib, boshidan boshlash.
--    Kerak bo'lmasa, shu blokni o'chirmang (u izoh ichida, ishlamaydi).
-- ---------------------------------------------------------------------------
-- drop view if exists v_today_birthdays, v_student_overview, v_class_performance,
--                     v_subject_performance, v_daily_attendance, v_monthly_attendance cascade;
-- drop table if exists game_results, custom_games, books,
--                      grades, dismissal, attendance, schedules,
--                      parents, students, teachers cascade;
-- drop function if exists fn_attendance_rate(uuid, date, date);
-- drop function if exists fn_touch_updated_at();

-- ============================================================================
-- 1. ENUM TURLARI
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'attendance_status') then
    create type attendance_status as enum ('keldi', 'kelmadi', 'sababli', 'sababsiz');
  end if;
  if not exists (select 1 from pg_type where typname = 'dismissal_method') then
    create type dismissal_method as enum ('ozi_ketdi', 'olib_ketishdi', 'avtobusda');
  end if;
end $$;

-- ============================================================================
-- 2. MAKTAB JADVALLARI
-- ============================================================================

-- ------------------------------ O'qituvchilar ------------------------------
create table if not exists teachers (
  id         uuid primary key default gen_random_uuid(),
  full_name  text not null check (length(trim(full_name)) > 0),
  phone      text not null default '',
  subject    text not null default '',
  created_at timestamptz not null default now()
);

-- -------------------------------- O'quvchilar ------------------------------
create table if not exists students (
  id             uuid primary key default gen_random_uuid(),
  full_name      text not null check (length(trim(full_name)) > 0),
  date_of_birth  date not null,
  class_name     text not null,
  phone          text,
  notes          text,
  created_at     timestamptz not null default now()
);

create index if not exists idx_students_class on students (class_name);
create index if not exists idx_students_dob   on students (date_of_birth);

-- -------------------------------- Ota-onalar -------------------------------
create table if not exists parents (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null check (length(trim(full_name)) > 0),
  phone           text not null default '',
  student_id      uuid references students (id) on delete cascade,
  contract_number text,
  contract_date   date,
  home_address    text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_parents_student on parents (student_id);

-- ------------------------------ Dars jadvali -------------------------------
create table if not exists schedules (
  id          uuid primary key default gen_random_uuid(),
  class_name  text not null,
  subject     text not null,
  teacher_id  uuid not null references teachers (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 6),
  start_time  time not null,
  end_time    time not null,
  room        text,
  created_at  timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists idx_schedules_teacher on schedules (teacher_id);
create index if not exists idx_schedules_class   on schedules (class_name, day_of_week);

-- ---------------------------------- Davomat --------------------------------
create table if not exists attendance (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students (id) on delete cascade,
  date       date not null,
  status     attendance_status not null,
  note       text,
  created_at timestamptz not null default now(),
  unique (student_id, date)
);

create index if not exists idx_attendance_date    on attendance (date);
create index if not exists idx_attendance_student on attendance (student_id);

-- ------------------------------ Uyga ketish --------------------------------
create table if not exists dismissal (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students (id) on delete cascade,
  date       date not null,
  method     dismissal_method not null,
  note       text,
  created_at timestamptz not null default now(),
  unique (student_id, date)
);

create index if not exists idx_dismissal_date    on dismissal (date);
create index if not exists idx_dismissal_student on dismissal (student_id);

-- --------------------------------- Baholar ---------------------------------
create table if not exists grades (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students (id) on delete cascade,
  subject    text not null,
  grade      numeric(5,2) not null check (grade between 0 and 100),
  max_grade  numeric(5,2) not null default 100,
  date       date not null default current_date,
  teacher_id uuid references teachers (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_grades_student on grades (student_id);
create index if not exists idx_grades_subject on grades (subject);
create index if not exists idx_grades_date    on grades (date);

-- ============================================================================
-- 3. KITOB → O'YIN JADVALLARI
--    (darslik matni, mavzular va o'yinlar JSONB ko'rinishida saqlanadi —
--     PDF matni sahifalarga bo'linib, o'yinlar shu yerda turadi)
-- ============================================================================

create table if not exists books (
  id            text primary key,                       -- masalan: matematika-3-mty8qfvi
  title         text not null,
  grade         smallint not null default 3 check (grade between 1 and 11),
  subject       text not null default 'boshqa',         -- matematika | ona-tili | oqish | ...
  subject_label text not null default '',
  language      text not null default 'uz',
  author        text,
  source        jsonb not null default '{}'::jsonb,     -- {kind, fileName, sizeBytes, pages, chars, scanWarn}
  stats         jsonb not null default '{}'::jsonb,     -- {topics, games, items, pages, chars}
  topic_titles  text[] not null default '{}',           -- ro'yxat sahifasi uchun yengil nusxa
  topics        jsonb not null default '[]'::jsonb,     -- mavzular + o'yinlar + elementlar
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_books_subject on books (subject);
create index if not exists idx_books_grade   on books (grade);
create index if not exists idx_books_created on books (created_at desc);

create table if not exists custom_games (
  id           text primary key,                        -- masalan: o-mty80o9arw9m
  title        text not null,
  type         text not null,                           -- quiz | matching | fill | ...
  subject      text not null default 'boshqa',
  grade        smallint not null default 3 check (grade between 1 and 11),
  instructions text,
  difficulty   smallint not null default 2 check (difficulty between 1 and 3),
  groups       jsonb,                                   -- "grouping" uchun guruhlar
  items        jsonb not null default '[]'::jsonb,      -- o'yin elementlari
  built_from   jsonb not null default '{}'::jsonb,      -- {note, pages}
  note         text,
  book_id      text references books (id) on delete set null,
  topic_id     text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_custom_games_book    on custom_games (book_id);
create index if not exists idx_custom_games_subject on custom_games (subject);

create table if not exists game_results (
  id           text primary key,
  book_id      text references books (id) on delete cascade,
  topic_id     text,
  topic_title  text,
  game_id      text not null,
  game_title   text not null,
  game_type    text not null,
  student_id   text,                                    -- Supabase o'quvchisi (uuid) yoki demo id
  student_name text,
  score        integer not null default 0 check (score >= 0),
  total        integer not null default 0 check (total >= 0),
  time_sec     integer not null default 0 check (time_sec >= 0),
  created_at   timestamptz not null default now()
);

create index if not exists idx_results_book    on game_results (book_id);
create index if not exists idx_results_student on game_results (student_id);
create index if not exists idx_results_created on game_results (created_at desc);

-- updated_at ni avtomatik yangilash
create or replace function fn_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_books_touch') then
    create trigger trg_books_touch before update on books
      for each row execute function fn_touch_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_custom_games_touch') then
    create trigger trg_custom_games_touch before update on custom_games
      for each row execute function fn_touch_updated_at();
  end if;
end $$;

-- ============================================================================
-- 4. TAHLIL VIEW'LARI
-- ============================================================================

-- Kunlik davomat
create or replace view v_daily_attendance
with (security_invoker = true) as
select
  date,
  count(*) filter (where status = 'keldi')                      as keldi,
  count(*) filter (where status = 'kelmadi')                    as kelmadi,
  count(*) filter (where status = 'sababli')                    as sababli,
  count(*) filter (where status = 'sababsiz')                   as sababsiz,
  count(*)                                                      as total,
  round(100.0 * count(*) filter (where status = 'keldi')
        / nullif(count(*) filter (where status <> 'sababli'), 0), 1) as attendance_rate
from attendance
group by date
order by date desc;

-- Oylik davomat
create or replace view v_monthly_attendance
with (security_invoker = true) as
select
  to_char(date_trunc('month', date), 'YYYY-MM')                 as month,
  count(*)                                                      as total_records,
  count(*) filter (where status = 'keldi')                      as keldi,
  count(*) filter (where status = 'kelmadi')                    as kelmadi,
  count(*) filter (where status = 'sababli')                    as sababli,
  count(*) filter (where status = 'sababsiz')                   as sababsiz,
  round(100.0 * count(*) filter (where status = 'keldi')
        / nullif(count(*) filter (where status <> 'sababli'), 0), 1) as attendance_rate_pct
from attendance
group by 1
order by 1 desc;

-- Sinflar kesimida
create or replace view v_class_performance
with (security_invoker = true) as
select
  s.class_name                                                  as class_name,
  count(distinct s.id)                                          as student_count,
  round(avg(g.grade) filter (where g.id is not null), 1)        as avg_grade,
  round(100.0 * count(distinct a.id) filter (where a.status = 'keldi')
        / nullif(count(distinct a.id) filter (where a.status <> 'sababli'), 0), 1) as attendance_rate_pct
from students s
left join grades     g on g.student_id = s.id
left join attendance a on a.student_id = s.id
group by s.class_name;

-- Fanlar kesimida
create or replace view v_subject_performance
with (security_invoker = true) as
select
  subject,
  count(*)                    as grade_count,
  count(distinct student_id)  as student_count,
  round(avg(grade), 1)        as avg_grade,
  min(grade)                  as min_grade,
  max(grade)                  as max_grade
from grades
group by subject
order by avg_grade desc;

-- O'quvchi umumiy ko'rsatkichi
create or replace view v_student_overview
with (security_invoker = true) as
select
  s.id                                                          as student_id,
  s.full_name                                                   as full_name,
  s.class_name                                                  as class_name,
  s.date_of_birth                                               as date_of_birth,
  count(distinct a.id)                                          as attendance_records,
  count(distinct a.id) filter (where a.status = 'keldi')         as present_days,
  count(distinct a.id) filter (where a.status = 'kelmadi')       as absent_days,
  count(distinct a.id) filter (where a.status = 'sababli')       as excused_days,
  count(distinct a.id) filter (where a.status = 'sababsiz')      as unexcused_days,
  round(100.0 * count(distinct a.id) filter (where a.status = 'keldi')
        / nullif(count(distinct a.id) filter (where a.status <> 'sababli'), 0), 1) as attendance_rate_pct,
  round(avg(g.grade), 1)                                        as avg_grade,
  count(g.id)                                                   as grade_count,
  p.parent_names                                                as parents,
  coalesce(p.contract_number, '')                               as contract_number
from students s
left join attendance a on a.student_id = s.id
left join grades     g on g.student_id = s.id
left join lateral (
  select string_agg(distinct pr.full_name, ', ') as parent_names,
         max(pr.contract_number)                 as contract_number
  from parents pr where pr.student_id = s.id
) p on true
group by s.id, s.full_name, s.class_name, s.date_of_birth, p.parent_names, p.contract_number;

-- Bugungi tug'ilgan kunlar
create or replace view v_today_birthdays
with (security_invoker = true) as
select
  id, full_name, class_name, date_of_birth,
  date_part('year', age(date_of_birth)) as age
from students
where date_part('month', date_of_birth) = date_part('month', current_date)
  and date_part('day',   date_of_birth) = date_part('day',   current_date);

-- Kitoblar bo'yicha o'yin natijalari (tez hisobot uchun)
create or replace view v_book_leaderboard
with (security_invoker = true) as
select
  book_id,
  coalesce(nullif(trim(student_name), ''), 'Mehmon')  as student_name,
  count(*)                                            as played,
  sum(score)                                          as correct,
  sum(total)                                          as total,
  round(100.0 * sum(score) / nullif(sum(total), 0), 1) as percent,
  max(created_at)                                     as last_played
from game_results
group by book_id, 2
order by percent desc nulls last, played desc;

-- ============================================================================
-- 5. YORDAMCHI FUNKSIYA
--    select fn_attendance_rate('<student-uuid>', '2026-09-01', '2026-09-30');
-- ============================================================================
create or replace function fn_attendance_rate(
  p_student uuid,
  p_from    date default current_date - 30,
  p_to      date default current_date
) returns numeric
language sql stable as $$
  select round(100.0 * count(*) filter (where status = 'keldi')
               / nullif(count(*) filter (where status <> 'sababli'), 0), 1)
  from attendance
  where student_id = p_student and date between p_from and p_to;
$$;

-- ============================================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================================

alter table students     enable row level security;
alter table parents      enable row level security;
alter table teachers     enable row level security;
alter table schedules    enable row level security;
alter table attendance   enable row level security;
alter table dismissal    enable row level security;
alter table grades       enable row level security;
alter table books        enable row level security;
alter table custom_games enable row level security;
alter table game_results enable row level security;

-- Tizimga kirgan (authenticated) foydalanuvchi uchun to'liq CRUD.
-- Bu ilova hozircha service_role kalit bilan serverdan ishlaydi — u RLS'ni
-- chetlab o'tadi, ya'ni qo'shimcha sozlash shart emas.
do $$
declare t text;
begin
  -- Supabase'da bu rollar tayyor turadi. Boshqa (oddiy) PostgreSQL'da
  -- mavjud bo'lmasa, siyosatlar o'tkazib yuboriladi — sxema baribir yaratiladi.
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    raise notice 'authenticated roli yo''q — RLS siyosatlari o''tkazib yuborildi';
    return;
  end if;

  foreach t in array array['students','parents','teachers','schedules','attendance',
                           'dismissal','grades','books','custom_games','game_results']
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
-- 7. ANON KALIT BILAN ISHLATISH (ixtiyoriy, ehtiyot bo'ling!)
--
-- Ilovada login sahifasi hozircha yo'q. Agar siz faqat
-- NEXT_PUBLIC_SUPABASE_ANON_KEY bilan ishlatsangiz, RLS yuqoridagi
-- "authenticated" siyosatlar orqali hamma so'rovni rad etadi va sahifalar
-- bo'sh ko'rinadi. Ikki yo'l bor:
--
--   a) (TAVSIYA) .env.local ga SUPABASE_SERVICE_ROLE_KEY ni qo'ying — kalit
--      faqat serverda ishlatiladi, brauzerga chiqmaydi. Unda RLS muhim emas,
--      bu blokni ishga tushirish shart emas.
--   b) Ichki/tarbiy tarmoqda ishlatib, anon kalit bilan ham ruxsat berish.
--      Bunda kalitni bilgan har qanday odam ma'lumotni o'qiy va o'zgartira
--      oladi — faqat vaqtincha, login qo'shguningizcha ishlating.
--
-- (b) kerak bo'lsa quyidagi blokning izohini ochib, ishga tushiring:
-- ---------------------------------------------------------------------------
-- do $$
-- declare t text;
-- begin
--   foreach t in array array['students','parents','teachers','schedules','attendance',
--                            'dismissal','grades','books','custom_games','game_results']
--   loop
--     execute format('drop policy if exists "%1$s_anon_all" on %1$s;', t);
--     execute format('create policy "%1$s_anon_all" on %1$s for all to anon using (true) with check (true);', t);
--   end loop;
-- end $$;

-- ============================================================================
-- 8. TEKSHIRUV — sxema to'liq o'rnatilganini ko'rsatadi (faqat o'qish).
--    Har bir qator: nima tekshirildi, kutilgan soni, topilgani, holati, izohi.
--    Hammasi ✅ bo'lsa — sxema tayyor. ❌ chiqsa: shu faylni qaytadan run qiling,
--    agar yana ❌ bo'lsa — izoh ustunida qaysi obyekt yetishmayotgani yozilgan.
-- ============================================================================

with expected as (
  select 'students' as t union all select 'parents' union all select 'teachers'
  union all select 'schedules' union all select 'attendance' union all select 'dismissal'
  union all select 'grades' union all select 'books' union all select 'custom_games'
  union all select 'game_results'
),
exp_views as (
  select 'v_daily_attendance' as v union all select 'v_monthly_attendance'
  union all select 'v_class_performance' union all select 'v_subject_performance'
  union all select 'v_student_overview' union all select 'v_today_birthdays'
  union all select 'v_book_leaderboard'
),
exp_fn as (
  select 'fn_touch_updated_at' as f union all select 'fn_attendance_rate'
),
exp_trg as (
  select 'trg_books_touch' as g union all select 'trg_custom_games_touch'
),
exp_pol as (
  select t.t as t, p.p as p
  from expected t cross join (values ('select'),('insert'),('update'),('delete')) p(p)
),
missing_tables as (
  select coalesce(string_agg(e.t, ', ' order by e.t), '') as lst
  from expected e
  where not exists (select 1 from information_schema.tables x
                    where x.table_schema = 'public' and x.table_name = e.t)
),
missing_views as (
  select coalesce(string_agg(v.v, ', ' order by v.v), '') as lst
  from exp_views v
  where not exists (select 1 from pg_views x where x.schemaname = 'public' and x.viewname = v.v)
),
actual as (
  select
    (select count(*) from expected e where exists (select 1 from information_schema.tables x
        where x.table_schema = 'public' and x.table_name = e.t))                                       as tables_n,
    (select count(*) from exp_views v where exists (select 1 from pg_views x
        where x.schemaname = 'public' and x.viewname = v.v))                                            as views_n,
    (select count(*) from exp_fn f where exists (select 1 from pg_proc x
        join pg_namespace n on n.oid = x.pronamespace where n.nspname = 'public' and x.proname = f.f))  as fns_n,
    (select count(*) from exp_trg g where exists (select 1 from pg_trigger x where x.tgname = g.g))      as trgs_n,
    (select count(*) from exp_pol p where exists (select 1 from pg_policies x
        where x.schemaname = 'public' and x.tablename = p.t and x.policyname = p.t || '_' || p.p))       as policies_n,
    (select count(*) from expected e where exists (select 1 from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = e.t and c.relrowsecurity))                            as rls_n,
    (select count(*) from information_schema.columns where table_schema = 'public'
        and ((table_name = 'books'        and column_name = 'topics'       and data_type = 'jsonb')
          or (table_name = 'books'        and column_name = 'topic_titles' and data_type = 'ARRAY')
          or (table_name = 'custom_games' and column_name = 'items'        and data_type = 'jsonb')
          or (table_name = 'game_results' and column_name = 'score'        and data_type = 'integer')))  as cols_n,
    (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'books')        as books_cols,
    (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'custom_games') as games_cols,
    (select count(*) from pg_type where typname in ('attendance_status', 'dismissal_method'))            as enums_n,
    (select count(*) from pg_indexes where schemaname = 'public' and indexname like 'idx_%')             as idx_n
)
select s."Tekshiruv", s."Kutilgan", s."Topildi", s."Holat", s."Izoh" from (
  select 1 as ord, 'Jadvallar' as "Tekshiruv", '10' as "Kutilgan", a.tables_n::text as "Topildi",
         case when a.tables_n = 10 then '✅' else '❌' end as "Holat", '' as "Izoh" from actual a
  union all
  select 2, 'VIEW''lar (tahlil)', '7', a.views_n::text, case when a.views_n = 7 then '✅' else '❌' end, '' from actual a
  union all
  select 3, 'Funksiyalar', '2', a.fns_n::text, case when a.fns_n = 2 then '✅' else '❌' end, '' from actual a
  union all
  select 4, 'Trigger''lar (updated_at)', '2', a.trgs_n::text, case when a.trgs_n = 2 then '✅' else '❌' end, '' from actual a
  union all
  select 5, 'RLS yoqilgan jadvallar', '10', a.rls_n::text, case when a.rls_n = 10 then '✅' else '❌' end, '' from actual a
  union all
  select 6, 'RLS siyosatlari (4 × 10)', '40', a.policies_n::text, case when a.policies_n = 40 then '✅' else '❌' end, '' from actual a
  union all
  select 7, 'Kitob/o''yin ustunlari (jsonb/array)', '4', a.cols_n::text, case when a.cols_n = 4 then '✅' else '❌' end, '' from actual a
  union all
  select 8, 'ENUM turlari', '2', a.enums_n::text, case when a.enums_n = 2 then '✅' else '❌' end, '' from actual a
  union all
  select 9, 'Indekslar (idx_*)', '20', a.idx_n::text, case when a.idx_n >= 20 then '✅' else '❌' end, '' from actual a
  union all
  select 10, 'books ustunlari', '13', a.books_cols::text, case when a.books_cols = 13 then '✅' else '❌' end, '' from actual a
  union all
  select 11, 'custom_games ustunlari', '15', a.games_cols::text, case when a.games_cols = 15 then '✅' else '❌' end, '' from actual a
  union all
  select 12, 'Yetishmayotgan jadvallar', '0',
         (select count(*)::text from expected e where not exists (select 1 from information_schema.tables x
            where x.table_schema = 'public' and x.table_name = e.t)),
         case when exists (select 1 from expected e where not exists (select 1 from information_schema.tables x
            where x.table_schema = 'public' and x.table_name = e.t)) then '❌' else '✅' end,
         (select lst from missing_tables)
  union all
  select 13, 'Yetishmayotgan VIEW''lar', '0',
         (select count(*)::text from exp_views v where not exists (select 1 from pg_views x
            where x.schemaname = 'public' and x.viewname = v.v)),
         case when exists (select 1 from exp_views v where not exists (select 1 from pg_views x
            where x.schemaname = 'public' and x.viewname = v.v)) then '❌' else '✅' end,
         (select lst from missing_views)
) s order by s.ord;

-- ============================================================================
-- Tayyor! Keyingi qadam (ixtiyoriy): namoyish ma'lumotlari uchun
-- `supabase/seed.sql` faylini ishga tushiring.
--
-- Ma'lumot borligini ko'rish uchun:
--   select count(*) from students;
--   select id, title, grade, subject from books;
--   select type, count(*) from custom_games group by type;
-- ============================================================================
