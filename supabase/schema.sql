-- ============================================================================
--  TEACHERS WORKSPACE — School Management Platform
--  Supabase SQL Schema (run this whole file in the Supabase SQL Editor)
--
--  Task 1 deliverable:
--    1. ENUM types  -> attendance & dismissal statuses
--    2. TABLES      -> students, parents, teachers, schedules, attendance,
--                      dismissal, grades (FK + ON DELETE CASCADE)
--    3. VIEWS       -> analytics aggregates (daily/monthly attendance,
--                      class & subject performance, student overview,
--                      today's birthdays)
--    4. FUNCTION    -> fn_attendance_rate(student, from, to)
--    5. RLS         -> enabled with authenticated-access policies
--
--  Script is idempotent: safe to re-run (drops and recreates everything).
-- ============================================================================

-- gen_random_uuid() needs pgcrypto (already available on Supabase, kept for safety)
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 0. CLEANUP (re-runnable)
-- ---------------------------------------------------------------------------
drop view if exists v_today_birthdays      cascade;
drop view if exists v_student_overview     cascade;
drop view if exists v_class_performance    cascade;
drop view if exists v_subject_performance  cascade;
drop view if exists v_daily_attendance     cascade;
drop view if exists v_monthly_attendance   cascade;
drop function if exists fn_attendance_rate(uuid, date, date);

drop table if exists grades      cascade;
drop table if exists dismissal   cascade;
drop table if exists attendance  cascade;
drop table if exists schedules   cascade;
drop table if exists parents     cascade;
drop table if exists students    cascade;
drop table if exists teachers    cascade;

drop type if exists attendance_status;
drop type if exists dismissal_method;

-- ---------------------------------------------------------------------------
-- 1. ENUM TYPES (static / categorical data)
-- ---------------------------------------------------------------------------

-- Davomat (Attendance)
create type attendance_status as enum (
  'keldi',      -- Present
  'kelmadi',    -- Absent
  'sababli',    -- Excused
  'sababsiz'    -- Unexcused
);

-- Uyga ketish usullari (Dismissal methods)
create type dismissal_method as enum (
  'ozi_ketdi',      -- Went alone
  'olib_ketishdi',  -- Picked up (by parents)
  'avtobusda'       -- By school bus
);

-- ---------------------------------------------------------------------------
-- 2. TABLES (dynamic data)
-- ---------------------------------------------------------------------------

-- ============================ TEACHERS (O'qituvchilar) ====================
create table teachers (
  id         uuid primary key default gen_random_uuid(),
  full_name  text not null check (length(trim(full_name)) > 0),
  phone      text not null,
  subject    text not null default '',
  created_at timestamptz not null default now()
);

-- ============================ STUDENTS (O'quvchilar) ======================
create table students (
  id             uuid primary key default gen_random_uuid(),
  full_name      text not null check (length(trim(full_name)) > 0),
  date_of_birth  date not null,                       -- birthday tracking uchun
  class_name     text not null,                       -- sinf, masalan '5-A'
  phone          text,
  notes          text,
  created_at     timestamptz not null default now()
);

create index idx_students_class on students (class_name);
create index idx_students_dob   on students (date_of_birth);

-- ============================ PARENTS (Ota-onalar) ========================
-- Har bir yozuv bitta o'quvchiga bog'lanadi (ona + ota = 2 ta yozuv).
create table parents (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null check (length(trim(full_name)) > 0),
  phone           text not null default '',
  student_id      uuid references students (id) on delete cascade,
  contract_number text,                               -- shartnoma raqami
  contract_date   date,                               -- shartnoma sanasi
  home_address    text,                               -- uy manzili
  created_at      timestamptz not null default now()
);

create index idx_parents_student on parents (student_id);

-- ============================ SCHEDULES (Dars jadvali) ====================
create table schedules (
  id          uuid primary key default gen_random_uuid(),
  class_name  text not null,
  subject     text not null,
  teacher_id  uuid not null references teachers (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 6), -- 1=Dushanba ... 6=Shanba
  start_time  time not null,
  end_time    time not null,
  room        text,
  created_at  timestamptz not null default now(),
  check (end_time > start_time)
);

create index idx_schedules_teacher on schedules (teacher_id);
create index idx_schedules_class   on schedules (class_name, day_of_week);

-- ============================ ATTENDANCE (Davomat) ========================
create table attendance (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students (id) on delete cascade,
  date       date not null,
  status     attendance_status not null,
  note       text,
  created_at timestamptz not null default now(),
  unique (student_id, date)                          -- bir kunda takroriy yozuv yo'q
);

create index idx_attendance_date    on attendance (date);
create index idx_attendance_student on attendance (student_id);

-- ============================ DISMISSAL (Uyga ketish) =====================
create table dismissal (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students (id) on delete cascade,
  date       date not null,
  method     dismissal_method not null,
  note       text,
  created_at timestamptz not null default now(),
  unique (student_id, date)
);

create index idx_dismissal_date    on dismissal (date);
create index idx_dismissal_student on dismissal (student_id);

-- ============================ GRADES (Baholash tizimi) ====================
-- Raqamli baholar: 1..100 (kerak bo'lsa 1..5 uchun CHECK'ni o'zgartiring).
create table grades (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students (id) on delete cascade,
  subject    text not null,
  grade      numeric(5,2) not null check (grade between 0 and 100),
  max_grade  numeric(5,2) not null default 100,
  date       date not null default current_date,
  teacher_id uuid references teachers (id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_grades_student on grades (student_id);
create index idx_grades_subject on grades (subject);
create index idx_grades_date    on grades (date);

-- ============================================================================
-- 3. ANALYTICS VIEWS (Tahlil)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- v_daily_attendance: kunlik davomat (so'nggi 30 kun default, cheklovsiz ham
-- ishlatiladi). Bir haftalik grafiklar uchun: where date >= current_date - 7
-- ---------------------------------------------------------------------------
create or replace view v_daily_attendance
with (security_invoker = true) as
select
  date,
  count(*) filter (where status = 'keldi')                          as keldi,
  count(*) filter (where status = 'kelmadi')                        as kelmadi,
  count(*) filter (where status = 'sababli')                        as sababli,
  count(*) filter (where status = 'sababsiz')                       as sababsiz,
  count(*)                                                          as total,
  round(
    100.0 * count(*) filter (where status = 'keldi')
    / nullif(count(*) filter (where status <> 'sababli'), 0)
  , 1)                                                              as attendance_rate
from attendance
group by date
order by date desc;

-- ---------------------------------------------------------------------------
-- v_monthly_attendance: oylik davomat foizlari
-- ---------------------------------------------------------------------------
create or replace view v_monthly_attendance
with (security_invoker = true) as
select
  to_char(date_trunc('month', date), 'YYYY-MM')                     as month,
  count(*)                                                          as total_records,
  count(*) filter (where status = 'keldi')                          as keldi,
  count(*) filter (where status = 'kelmadi')                        as kelmadi,
  count(*) filter (where status = 'sababli')                        as sababli,
  count(*) filter (where status = 'sababsiz')                       as sababsiz,
  round(
    100.0 * count(*) filter (where status = 'keldi')
    / nullif(count(*) filter (where status <> 'sababli'), 0)
  , 1)                                                              as attendance_rate_pct
from attendance
group by 1
order by 1 desc;

-- ---------------------------------------------------------------------------
-- v_class_performance: sinflar kesimida o'rtacha baho va davomat
-- ---------------------------------------------------------------------------
create or replace view v_class_performance
with (security_invoker = true) as
select
  s.class_name                                                       as class_name,
  count(distinct s.id)                                               as student_count,
  round(avg(g.grade) filter (where g.id is not null), 1)             as avg_grade,
  round(
    100.0 * count(distinct a.id) filter (where a.status = 'keldi')
    / nullif(count(distinct a.id) filter (where a.status <> 'sababli'), 0)
  , 1)                                                               as attendance_rate_pct
from students s
left join grades     g on g.student_id = s.id
left join attendance a on a.student_id = s.id
group by s.class_name;

-- ---------------------------------------------------------------------------
-- v_subject_performance: fanlar kesimida baholar tahlili
-- ---------------------------------------------------------------------------
create or replace view v_subject_performance
with (security_invoker = true) as
select
  subject,
  count(*)                          as grade_count,
  count(distinct student_id)        as student_count,
  round(avg(grade), 1)              as avg_grade,
  min(grade)                        as min_grade,
  max(grade)                        as max_grade
from grades
group by subject
order by avg_grade desc;

-- ---------------------------------------------------------------------------
-- v_student_overview: har bir o'quvchi uchun umumiy ko'rsatkichlar
-- ---------------------------------------------------------------------------
create or replace view v_student_overview
with (security_invoker = true) as
select
  s.id                                                               as student_id,
  s.full_name                                                        as full_name,
  s.class_name                                                       as class_name,
  s.date_of_birth                                                    as date_of_birth,
  count(distinct a.id)                                               as attendance_records,
  count(distinct a.id) filter (where a.status = 'keldi')             as present_days,
  count(distinct a.id) filter (where a.status = 'kelmadi')           as absent_days,
  count(distinct a.id) filter (where a.status = 'sababli')           as excused_days,
  count(distinct a.id) filter (where a.status = 'sababsiz')          as unexcused_days,
  round(
    100.0 * count(distinct a.id) filter (where a.status = 'keldi')
    / nullif(count(distinct a.id) filter (where a.status <> 'sababli'), 0)
  , 1)                                                               as attendance_rate_pct,
  round(avg(g.grade), 1)                                             as avg_grade,
  count(g.id)                                                        as grade_count,
  p.parent_names                                                     as parents,
  coalesce(p.contract_number, '')                                    as contract_number
from students s
left join attendance a on a.student_id = s.id
left join grades     g on g.student_id = s.id
left join lateral (
  select string_agg(distinct pr.full_name, ', ')                     as parent_names,
  max(pr.contract_number)                                            as contract_number
  from parents pr where pr.student_id = s.id
) p on true
group by s.id, s.full_name, s.class_name, s.date_of_birth, p.parent_names, p.contract_number;

-- ---------------------------------------------------------------------------
-- v_today_birthdays: bugun tug'ilgan kuni bo'lgan o'quvchilar
-- (arizadagi "birthday alert" funksiyasi uchun)
-- ---------------------------------------------------------------------------
create or replace view v_today_birthdays
with (security_invoker = true) as
select
  id,
  full_name,
  class_name,
  date_of_birth,
  date_part('year', age(date_of_birth))                              as age
from students
where date_part('month', date_of_birth) = date_part('month', current_date)
  and date_part('day',   date_of_birth) = date_part('day',   current_date);

-- ============================================================================
-- 4. HELPER FUNCTION — o'quvchining berilgan davrdagi davomat foizi
--    select fn_attendance_rate('<student-uuid>', '2026-09-01', '2026-09-30');
-- ============================================================================
create or replace function fn_attendance_rate(
  p_student uuid,
  p_from    date default current_date - 30,
  p_to      date default current_date
) returns numeric
language sql stable as $$
  select round(
    100.0 * count(*) filter (where status = 'keldi')
    / nullif(count(*) filter (where status <> 'sababli'), 0)
  , 1)
  from attendance
  where student_id = p_student
    and date between p_from and p_to;
$$;

-- ============================================================================
-- 5. ROW LEVEL SECURITY
--    Demak: faqat tizimga kirgan (authenticated) foydalanuvchilar to'liq CRUD.
--    Ishlab chiqarishda (production) aniq rollarga ajratish tavsiya etiladi.
-- ============================================================================
alter table students   enable row level security;
alter table parents    enable row level security;
alter table teachers   enable row level security;
alter table schedules  enable row level security;
alter table attendance enable row level security;
alter table dismissal  enable row level security;
alter table grades     enable row level security;

-- Oddiy shablon: authenticated -> full CRUD (7 xil jadval uchun ham)
do $$
declare t text;
begin
  foreach t in array array['students','parents','teachers','schedules','attendance','dismissal','grades']
  loop
    execute format('create policy "%1$s_select" on %1$s for select to authenticated using (true);', t);
    execute format('create policy "%1$s_insert" on %1$s for insert to authenticated with check (true);', t);
    execute format('create policy "%1$s_update" on %1$s for update to authenticated using (true) with check (true);', t);
    execute format('create policy "%1$s_delete" on %1$s for delete to authenticated using (true);', t);
  end loop;
end $$;

-- ============================================================================
-- Tayyor! Endi namoyish ma'lumotlari uchun (ixtiyoriy) `seed.sql` faylini
-- ishga tushirishingiz mumkin.
-- ============================================================================
