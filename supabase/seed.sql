-- ============================================================================
--  SEED DATA (ixtiyoriy) — namoyish ma'lumotlari
--  `schema.sql` ishga tushirilgandan keyin Supabase SQL Editor'da run qiling.
--  E'tibor bering: bitta o'quvchining tug'ilgan kuni BUGUN (current_date asosida)
--  shuning uchun "birthday alert" darhol ko'rinadi.
-- ============================================================================

-- ------------------------------ O'QITUVCHILAR ------------------------------
insert into teachers (id, full_name, phone, subject) values
  ('11111111-1111-4111-8111-111111111101', 'Dilshod Rahimov',    '+998 90 123-45-67', 'Matematika'),
  ('11111111-1111-4111-8111-111111111102', 'Nilufar Qodirova',   '+998 91 234-56-78', 'Ona tili'),
  ('11111111-1111-4111-8111-111111111103', 'Jasur Toshev',       '+998 93 345-67-89', 'Ingliz tili'),
  ('11111111-1111-4111-8111-111111111104', 'Gulnora Ergasheva',  '+998 94 456-78-90', 'Tarix'),
  ('11111111-1111-4111-8111-111111111105', 'Sardor Yo''ldoshev', '+998 97 567-89-01', 'Fizika'),
  ('11111111-1111-4111-8111-111111111106', 'Kamola Sattorova',   '+998 99 678-90-12', 'Biologiya');

-- ------------------------------- O'QUVCHILAR -------------------------------
insert into students (id, full_name, date_of_birth, class_name, phone) values
  ('22222222-2222-4222-8222-222222222201', 'Alisher Karimov',   '2013-04-12', '6-A', null),
  ('22222222-2222-4222-8222-222222222202', 'Madina Yusupova',   '2012-09-25', '7-A', null),
  ('22222222-2222-4222-8222-222222222203', 'Bekzod Ismoilov',   '2013-01-30', '6-A', null),
  ('22222222-2222-4222-8222-222222222204', 'Zarina Umarova',    '2011-11-05', '8-A', null),
  ('22222222-2222-4222-8222-222222222205', 'Islom Nazarov',     '2012-06-18', '7-A', null),
  ('22222222-2222-4222-8222-222222222206', 'Malika Tursunova',  '2013-12-02', '6-A', null),
  ('22222222-2222-4222-8222-222222222207', 'Ulug'bek Safarov',  '2011-02-14', '8-A', null),
  -- BUGUN tug'ilgan kuni (har qanday kunda ishlaydi):
  ('22222222-2222-4222-8222-222222222208', 'Sarvinoz Abdullayeva', (current_date - interval '12 years')::date, '7-A', null);

-- -------------------------------- OTA-ONALAR -------------------------------
insert into parents (full_name, phone, student_id, contract_number, contract_date, home_address) values
  ('Karim Ismoilov',     '+998 90 111-22-33', '22222222-2222-4222-8222-222222222201', 'SH-2026-001', '2026-01-15', 'Toshkent sh., Chilonzor 9-kvartal, 14-uy'),
  ('Nodira Karimova',    '+998 90 111-22-34', '22222222-2222-4222-8222-222222222201', 'SH-2026-001', '2026-01-15', 'Toshkent sh., Chilonzor 9-kvartal, 14-uy'),
  ('Rustam Yusupov',     '+998 91 222-33-44', '22222222-2222-4222-8222-222222222202', 'SH-2026-002', '2026-01-20', 'Toshkent sh., Yunusobod 4-mavze, 7-uy'),
  ('Dilnoza Rasulova',   '+998 93 333-44-55', '22222222-2222-4222-8222-222222222203', 'SH-2026-003', '2026-02-01', 'Toshkent sh., Sergeli 8-kvartal, 3-uy'),
  ('Aziz Umarov',        '+998 94 444-55-66', '22222222-2222-4222-8222-222222222204', 'SH-2026-004', '2026-02-10', 'Toshkent sh., Mirzo Ulug\'bek, 21-uy');

-- ------------------------------- DARS JADVALI ------------------------------
insert into schedules (class_name, subject, teacher_id, day_of_week, start_time, end_time, room) values
  ('6-A', 'Matematika',  '11111111-1111-4111-8111-111111111101', 1, '08:00', '08:45', '201-xona'),
  ('6-A', 'Ona tili',    '11111111-1111-4111-8111-111111111102', 1, '09:00', '09:45', '202-xona'),
  ('6-A', 'Ingliz tili', '11111111-1111-4111-8111-111111111103', 2, '08:00', '08:45', '301-xona'),
  ('7-A', 'Matematika',  '11111111-1111-4111-8111-111111111101', 1, '10:00', '10:45', '203-xona'),
  ('7-A', 'Tarix',       '11111111-1111-4111-8111-111111111104', 3, '08:00', '08:45', '105-xona'),
  ('7-A', 'Fizika',      '11111111-1111-4111-8111-111111111105', 4, '09:00', '09:45', 'Fizika laboratoriyasi'),
  ('8-A', 'Biologiya',   '11111111-1111-4111-8111-111111111106', 5, '08:00', '08:45', 'Fizika laboratoriyasi'),
  ('8-A', 'Ona tili',    '11111111-1111-4111-8111-111111111102', 6, '08:00', '08:45', '204-xona');

-- ---------------------------- DAVOMAT (14 kun) -----------------------------
-- Har bir o'quvchi uchun so'nggi 14 kun (yakshanbadan tashqari) random davomat.
insert into attendance (student_id, date, status)
select
  s.id,
  d::date,
  (array['keldi','keldi','keldi','keldi','keldi','keldi','keldi','keldi','sababli','kelmadi','sababsiz'])
    [1 + floor(random() * 11)::int]
from students s
cross join generate_series(current_date - 13, current_date, interval '1 day') d
where extract(isodow from d) < 7   -- 1..6 = Dushanba..Shanba
on conflict (student_id, date) do nothing;

-- ------------------------- UYGA KETISH (7 kun) -----------------------------
insert into dismissal (student_id, date, method)
select
  s.id,
  d::date,
  (array['olib_ketishdi','olib_ketishdi','olib_ketishdi','ozi_ketdi','ozi_ketdi','avtobusda'])
    [1 + floor(random() * 6)::int]
from students s
cross join generate_series(current_date - 6, current_date, interval '1 day') d
where extract(isodow from d) < 7
on conflict (student_id, date) do nothing;

-- ------------------------------- BAHOLAR -----------------------------------
-- Har o'quvchi uchun fanlar bo'yicha so'nggi 30 kun ichida 3 tadan baho.
insert into grades (student_id, subject, grade, date)
select
  s.id,
  subj,
  55 + floor(random() * 45)::int,
  (current_date - floor(random() * 30)::int)
from students s
cross join (values ('Matematika'), ('Ona tili'), ('Ingliz tili')) as t(subj)
cross join generate_series(1, 3);
