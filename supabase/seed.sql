-- ============================================================================
--  SEED DATA (ixtiyoriy) — namoyish ma'lumotlari
--  `schema.sql` ishga tushirilgandan keyin Supabase SQL Editor'da run qiling.
--  E'tibor bering: bitta o'quvchining tug'ilgan kuni BUGUN (current_date asosida)
--  shuning uchun "birthday alert" darhol ko'rinadi.
--
--  Qayta run qilish xavfsiz — mavjud qatorlar takrorlanmaydi.
--  Kitob/o'yin qismi `scripts/gen-seed-sample.mts` orqali ilovaning haqiqiy
--  dvigateli bilan yasalgan (ingestBook + parseCustomItems).
-- ============================================================================

-- ------------------------------ O'QITUVCHILAR ------------------------------
insert into teachers (id, full_name, phone, subject) values
  ('11111111-1111-4111-8111-111111111101', 'Dilshod Rahimov',    '+998 90 123-45-67', 'Matematika'),
  ('11111111-1111-4111-8111-111111111102', 'Nilufar Qodirova',   '+998 91 234-56-78', 'Ona tili'),
  ('11111111-1111-4111-8111-111111111103', 'Jasur Toshev',       '+998 93 345-67-89', 'Ingliz tili'),
  ('11111111-1111-4111-8111-111111111104', 'Gulnora Ergasheva',  '+998 94 456-78-90', 'Tarix'),
  ('11111111-1111-4111-8111-111111111105', 'Sardor Yo''ldoshev', '+998 97 567-89-01', 'Fizika'),
  ('11111111-1111-4111-8111-111111111106', 'Kamola Sattorova',   '+998 99 678-90-12', 'Biologiya')
on conflict (id) do nothing;

-- ------------------------------- O'QUVCHILAR -------------------------------
insert into students (id, full_name, date_of_birth, class_name, phone) values
  ('22222222-2222-4222-8222-222222222201', 'Alisher Karimov',   '2013-04-12', '6-A', null),
  ('22222222-2222-4222-8222-222222222202', 'Madina Yusupova',   '2012-09-25', '7-A', null),
  ('22222222-2222-4222-8222-222222222203', 'Bekzod Ismoilov',   '2013-01-30', '6-A', null),
  ('22222222-2222-4222-8222-222222222204', 'Zarina Umarova',    '2011-11-05', '8-A', null),
  ('22222222-2222-4222-8222-222222222205', 'Islom Nazarov',     '2012-06-18', '7-A', null),
  ('22222222-2222-4222-8222-222222222206', 'Malika Tursunova',  '2013-12-02', '6-A', null),
  ('22222222-2222-4222-8222-222222222207', 'Ulug''bek Safarov',  '2011-02-14', '8-A', null),
  -- BUGUN tug'ilgan kuni (har qanday kunda ishlaydi):
  ('22222222-2222-4222-8222-222222222208', 'Sarvinoz Abdullayeva', (current_date - interval '12 years')::date, '7-A', null)
on conflict (id) do nothing;

-- -------------------------------- OTA-ONALAR -------------------------------
-- Takroriy ishga tushirishda ikkinchi marta qo'shilmasligi uchun: faqat bo'sh bo'lsa.
insert into parents (full_name, phone, student_id, contract_number, contract_date, home_address)
select v.full_name, v.phone, v.student_id::uuid, v.contract_number, v.contract_date::date, v.home_address from (values
  ('Karim Ismoilov',     '+998 90 111-22-33', '22222222-2222-4222-8222-222222222201', 'SH-2026-001', '2026-01-15', 'Toshkent sh., Chilonzor 9-kvartal, 14-uy'),
  ('Nodira Karimova',    '+998 90 111-22-34', '22222222-2222-4222-8222-222222222201', 'SH-2026-001', '2026-01-15'::date, 'Toshkent sh., Chilonzor 9-kvartal, 14-uy'),
  ('Rustam Yusupov',     '+998 91 222-33-44', '22222222-2222-4222-8222-222222222202', 'SH-2026-002', '2026-01-20', 'Toshkent sh., Yunusobod 4-mavze, 7-uy'),
  ('Dilnoza Rasulova',   '+998 93 333-44-55', '22222222-2222-4222-8222-222222222203', 'SH-2026-003', '2026-02-01', 'Toshkent sh., Sergeli 8-kvartal, 3-uy'),
  ('Aziz Umarov',        '+998 94 444-55-66', '22222222-2222-4222-8222-222222222204', 'SH-2026-004', '2026-02-10', 'Toshkent sh., Mirzo Ulug''bek, 21-uy')
) as v(full_name, phone, student_id, contract_number, contract_date, home_address)
where not exists (select 1 from parents);

-- ------------------------------- DARS JADVALI ------------------------------
insert into schedules (class_name, subject, teacher_id, day_of_week, start_time, end_time, room)
select v.class_name, v.subject, v.teacher_id::uuid, v.day_of_week, v.start_time::time, v.end_time::time, v.room from (values
  ('6-A', 'Matematika',  '11111111-1111-4111-8111-111111111101', 1, '08:00', '08:45', '201-xona'),
  ('6-A', 'Ona tili',    '11111111-1111-4111-8111-111111111102', 1, '09:00', '09:45', '202-xona'),
  ('6-A', 'Ingliz tili', '11111111-1111-4111-8111-111111111103', 2, '08:00', '08:45', '301-xona'),
  ('7-A', 'Matematika',  '11111111-1111-4111-8111-111111111101', 1, '10:00', '10:45', '203-xona'),
  ('7-A', 'Tarix',       '11111111-1111-4111-8111-111111111104', 3, '08:00', '08:45', '105-xona'),
  ('7-A', 'Fizika',      '11111111-1111-4111-8111-111111111105', 4, '09:00', '09:45', 'Fizika laboratoriyasi'),
  ('8-A', 'Biologiya',   '11111111-1111-4111-8111-111111111106', 5, '08:00', '08:45', 'Fizika laboratoriyasi'),
  ('8-A', 'Ona tili',    '11111111-1111-4111-8111-111111111102', 6, '08:00', '08:45', '204-xona')
) as v(class_name, subject, teacher_id, day_of_week, start_time, end_time, room)
where not exists (select 1 from schedules);

-- ---------------------------- DAVOMAT (14 kun) -----------------------------
-- Har bir o'quvchi uchun so'nggi 14 kun (yakshanbadan tashqari) random davomat.
insert into attendance (student_id, date, status)
select
  s.id,
  d::date,
  (array['keldi','keldi','keldi','keldi','keldi','keldi','keldi','keldi','sababli','kelmadi','sababsiz']::attendance_status[])
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
  (array['olib_ketishdi','olib_ketishdi','olib_ketishdi','ozi_ketdi','ozi_ketdi','avtobusda']::dismissal_method[])
    [1 + floor(random() * 6)::int]
from students s
cross join generate_series(current_date - 6, current_date, interval '1 day') d
where extract(isodow from d) < 7
on conflict (student_id, date) do nothing;

-- ------------------------------- BAHOLAR -----------------------------------
-- Har o'quvchi uchun fanlar bo'yicha so'nggi 30 kun ichida 3 tadan baho.
insert into grades (student_id, subject, grade, date)
select * from (
select
  s.id,
  subj,
  55 + floor(random() * 45)::int,
  (current_date - floor(random() * 30)::int)
from students s
cross join (values ('Matematika'), ('Ona tili'), ('Ingliz tili')) as t(subj)
cross join generate_series(1, 3)
) as g(student_id, subject, grade, date)
where not exists (select 1 from grades);

-- ============================================================================

-- ============================================================================
--  KITOB → O'YIN (ixtiyoriy namuna)
--  Bitta kichik darslik (5 mavzu, 17 o'yin) va o'qituvchi yasagan 4 o'yin —
--  bo'sh sahifalar ko'rinmasligi uchun. Kerak bo'lmasa o'chirib tashlang.
-- ============================================================================

insert into books (id, title, grade, subject, subject_label, language, source, stats, topic_titles, topics)
values (
  'demo-matematika-3',
  'Matematika 3-sinf (namuna)',
  3,
  'matematika',
  'Matematika',
  'uz',
  '{"kind":"pdf","fileName":"matematika-3-namuna.pdf","sizeBytes":2243,"pages":6,"chars":2243,"scanWarn":false}'::jsonb,
  '{"topics":5,"games":17,"items":104,"pages":6,"chars":2243}'::jsonb,
  array['SONLARNI QO''SHISH VA AYIRISH', 'KO''PAYTIRISH VA BO''LISH', 'GEOMETRIK FIGURALAR', 'O''LCHOV BIRLIKLARI', 'VAQTNI O''LCHASH'],
  '[{"id":"matematika-3-sinf-namuna-t2","index":1,"title":"SONLARNI QO''SHISH VA AYIRISH","section":"MUNDARIJA","pageStart":2,"pageEnd":2,"text":"SONLARNI QO''SHISH VA AYIRISH\n\nQoida: Yig''indini topish uchun qo''shiluvchilarni qo''shamiz.\nMisol: 245 + 132 = 377\nMisol: 460 - 125 = 335\nQoida: Ayirishda kamayuvchidan ayriluvchi ayiriladi.\nMasala: Do''konda 345 ta daftar bor edi. 17 tasi sotildi. Nechta daftar qoldi?\nYechish: 345 - 17 = 328\nJavob: 328 ta daftar qoldi.\nMasala: Maktab kutubxonasida 240 ta kitob bor edi. Yana 60 ta kitob keltirildi. Jami nechta kitob bo''ldi?\nYechish: 240 + 60 = 300\nJavob: 300 ta kitob.","keywords":["kitob","daftar","yechish","masala","qoida","misol","qoldi","javob","qo''shiluvchilarni","kamayuvchidan","kutubxonasida","yig''indini","ayriluvchi","keltirildi"],"examples":[{"id":"ex1","kind":"qoida","text":"Qoida: Yig''indini topish uchun qo''shiluvchilarni qo''shamiz.","page":2},{"id":"ex2","kind":"arifmetika","text":"Misol: 245 + 132 = 377","page":2},{"id":"ex3","kind":"arifmetika","text":"Misol: 460 - 125 = 335","page":2},{"id":"ex4","kind":"qoida","text":"Qoida: Ayirishda kamayuvchidan ayriluvchi ayiriladi.","page":2},{"id":"ex5","kind":"savol","text":"Masala: Do''konda 345 ta daftar bor edi. 17 tasi sotildi. Nechta daftar qoldi?","page":2},{"id":"ex6","kind":"arifmetika","text":"Yechish: 345 - 17 = 328","page":2},{"id":"ex7","kind":"topshiriq","text":"Javob: 328 ta daftar qoldi.","page":2},{"id":"ex8","kind":"savol","text":"Masala: Maktab kutubxonasida 240 ta kitob bor edi. Yana 60 ta kitob keltirildi. Jami nechta kitob bo''ldi?","page":2},{"id":"ex9","kind":"arifmetika","text":"Yechish: 240 + 60 = 300","page":2},{"id":"ex10","kind":"topshiriq","text":"Javob: 300 ta kitob.","page":2}],"games":[{"id":"matematika-3-sinf-namuna-sonlarni-qo-shish-va-ayirish-2-math","type":"math","title":"Tez hisob","instructions":"Misolni yechib, to''g''ri javobni bosing. Har bir to''g''ri javob uchun 1 ball!","difficulty":2,"items":[{"expression":"245 + 132 = ?","answer":377,"options":[477,367,397,377]},{"expression":"460 - 125 = ?","answer":335,"options":[235,1335,365,335]},{"expression":"345 - 17 = ?","answer":328,"options":[528,338,328,358]},{"expression":"240 + 60 = ?","answer":300,"options":[300,310,1300,400]}],"builtFrom":{"note":"Kitobdagi 4 ta misol","pages":[2]}},{"id":"matematika-3-sinf-namuna-sonlarni-qo-shish-va-ayirish-2-truefalse","type":"truefalse","title":"Tenglamani tekshir","instructions":"Har bir tenglama to''g''rimi? To''g''ri bo''lsa ✅, xato bo''lsa ❌ ni bosing.","difficulty":2,"items":[{"statement":"245 + 132 = 377","isTrue":true,"reason":"Bu kitobdagi misol — to''g''ri yechilgan."},{"statement":"345 - 17 = 328","isTrue":true,"reason":"Bu kitobdagi misol — to''g''ri yechilgan."},{"statement":"240 + 60 = 330","isTrue":false,"reason":"240 + 60 = 300 bo''lishi kerak."},{"statement":"460 - 125 = 325","isTrue":false,"reason":"460 - 125 = 335 bo''lishi kerak."}],"builtFrom":{"note":"Kitobdagi misollar asosida","pages":[2]}},{"id":"matematika-3-sinf-namuna-sonlarni-qo-shish-va-ayirish-2-pop","type":"pop","title":"Balonni ot","instructions":"Har bir misol uchun to''g''ri javob yozilgan balonni topib bosing. Vaqt ketmoqda!","difficulty":2,"items":[{"expression":"245 + 132 = ?","answer":377,"options":[327,357,477,377,427]},{"expression":"460 - 125 = ?","answer":335,"options":[355,335,345,315,1335]},{"expression":"345 - 17 = ?","answer":328,"options":[318,228,528,328,308]},{"expression":"240 + 60 = ?","answer":300,"options":[500,250,350,1300,300]}],"builtFrom":{"note":"Kitobdagi 4 ta misol","pages":[2]}},{"id":"matematika-3-sinf-namuna-sonlarni-qo-shish-va-ayirish-2-bingo","type":"bingo","title":"Bingo kartasi","instructions":"Kartani chop eting yoki doskaga chiqaring: o''qituvchi so''z aytadi, o''quvchilar belgilaydi.","difficulty":1,"items":[{"text":"masala"},{"text":"daftar"},{"text":"kamayuvchidan"},{"text":"qo''shish"},{"text":"tasi"},{"text":"maktab"},{"text":"335"},{"text":"bo''ldi"},{"text":"qoldi"}],"builtFrom":{"note":"Mavzu so''zlari","pages":[2]}}]},{"id":"matematika-3-sinf-namuna-t3","index":2,"title":"KO''PAYTIRISH VA BO''LISH","section":"MUNDARIJA","pageStart":3,"pageEnd":3,"text":"KO''PAYTIRISH VA BO''LISH\n\nQoida: Ko''paytirish - bir xil qo''shiluvchilarni qisqacha yozish.\nMisol: 12 x 4 = 48\nMisol: 25 x 3 = 75\nMisol: 15 x 6 = 90\nMisol: 72 : 8 = 9\nMisol: 96 : 6 = 16\nMisol: 120 : 4 = 30\nMasala: Har bir qutiga 6 tadan olma solindi. 8 ta qutida nechta olma bor?\nYechish: 6 x 8 = 48\nJavob: 48 ta olma.\nMasala: 45 ta konfet 9 ta bolaga teng bo''lindi. Har bir bolaga nechtadan konfet tegdi?\nYechish: 45 : 9 = 5\nJavob: 5 tadan konfet.","keywords":["misol","konfet","olma","ko''paytirish","yechish","masala","bolaga","tadan","javob","qo''shiluvchilarni","nechtadan","qisqacha","bo''lindi","bo''lish"],"examples":[{"id":"ex11","kind":"qoida","text":"Qoida: Ko''paytirish - bir xil qo''shiluvchilarni qisqacha yozish.","page":3},{"id":"ex12","kind":"arifmetika","text":"Misol: 72 : 8 = 9","page":3},{"id":"ex13","kind":"arifmetika","text":"Misol: 96 : 6 = 16","page":3},{"id":"ex14","kind":"arifmetika","text":"Misol: 120 : 4 = 30","page":3},{"id":"ex15","kind":"savol","text":"Masala: Har bir qutiga 6 tadan olma solindi. 8 ta qutida nechta olma bor?","page":3},{"id":"ex16","kind":"topshiriq","text":"Javob: 48 ta olma.","page":3},{"id":"ex17","kind":"savol","text":"Masala: 45 ta konfet 9 ta bolaga teng bo''lindi. Har bir bolaga nechtadan konfet tegdi?","page":3},{"id":"ex18","kind":"arifmetika","text":"Yechish: 45 : 9 = 5","page":3}],"games":[{"id":"matematika-3-sinf-namuna-ko-paytirish-va-bo-lish-3-math","type":"math","title":"Tez hisob","instructions":"Misolni yechib, to''g''ri javobni bosing. Har bir to''g''ri javob uchun 1 ball!","difficulty":1,"items":[{"expression":"72 : 8 = ?","answer":9,"options":[12,9,109,6]},{"expression":"96 : 6 = ?","answer":16,"options":[116,15,14,16]},{"expression":"120 : 4 = ?","answer":30,"options":[25,27,33,30]},{"expression":"45 : 9 = ?","answer":5,"options":[15,2,5,105]}],"builtFrom":{"note":"Kitobdagi 4 ta misol","pages":[3]}},{"id":"matematika-3-sinf-namuna-ko-paytirish-va-bo-lish-3-truefalse","type":"truefalse","title":"Tenglamani tekshir","instructions":"Har bir tenglama to''g''rimi? To''g''ri bo''lsa ✅, xato bo''lsa ❌ ni bosing.","difficulty":2,"items":[{"statement":"96 : 6 = 15","isTrue":false,"reason":"96 : 6 = 16 bo''lishi kerak."},{"statement":"120 : 4 = 30","isTrue":true,"reason":"Bu kitobdagi misol — to''g''ri yechilgan."},{"statement":"45 : 9 = 3","isTrue":false,"reason":"45 : 9 = 5 bo''lishi kerak."},{"statement":"72 : 8 = 9","isTrue":true,"reason":"Bu kitobdagi misol — to''g''ri yechilgan."}],"builtFrom":{"note":"Kitobdagi misollar asosida","pages":[3]}},{"id":"matematika-3-sinf-namuna-ko-paytirish-va-bo-lish-3-pop","type":"pop","title":"Balonni ot","instructions":"Har bir misol uchun to''g''ri javob yozilgan balonni topib bosing. Vaqt ketmoqda!","difficulty":2,"items":[{"expression":"72 : 8 = ?","answer":9,"options":[19,9,109,14,11]},{"expression":"96 : 6 = ?","answer":16,"options":[21,26,16,13,15]},{"expression":"120 : 4 = ?","answer":30,"options":[33,31,30,40,35]},{"expression":"45 : 9 = ?","answer":5,"options":[5,6,4,7,3]}],"builtFrom":{"note":"Kitobdagi 4 ta misol","pages":[3]}},{"id":"matematika-3-sinf-namuna-ko-paytirish-va-bo-lish-3-bingo","type":"bingo","title":"Bingo kartasi","instructions":"Kartani chop eting yoki doskaga chiqaring: o''qituvchi so''z aytadi, o''quvchilar belgilaydi.","difficulty":1,"items":[{"text":"konfet"},{"text":"qisqacha"},{"text":"tegdi"},{"text":"bo''lish"},{"text":"misol"},{"text":"olma"},{"text":"teng"},{"text":"yechish"},{"text":"bolaga"}],"builtFrom":{"note":"Mavzu so''zlari","pages":[3]}}]},{"id":"matematika-3-sinf-namuna-t4","index":3,"title":"GEOMETRIK FIGURALAR","section":"MUNDARIJA","pageStart":4,"pageEnd":4,"text":"GEOMETRIK FIGURALAR\n\nTa''rif: Kvadrat - hamma tomonlari teng bo''lgan to''rtburchak.\nTa''rif: Uchburchak - uchta tomoni va uchta burchagi bor figura.\nTa''rif: To''g''ri to''rtburchak - qarama-qarshi tomonlari teng figura.\nQoida: To''g''ri to''rtburchakning yuzi = bo''yi x eni.\nQoida: Perimetr - hamma tomonlar uzunliklarining yig''indisi.\nMisol: Bo''yi 8 sm, eni 5 sm bo''lgan to''rtburchak yuzi: 8 x 5 = 40 kv.sm.\nMasala: Tomonlari 6 sm va 9 sm bo''lgan to''g''ri to''rtburchakning perimetrini toping.\nYechish: 2 x (6 + 9) = 30\nJavob: 30 sm.","keywords":["to''rtburchak","tomonlari","bo''lgan","to''g''ri","ta''rif","to''rtburchakning","figura","hamma","uchta","qoida","bo''yi","teng","yuzi","uzunliklarining"],"examples":[{"id":"ex19","kind":"qoida","text":"Ta''rif: Kvadrat - hamma tomonlari teng bo''lgan to''rtburchak.","page":4},{"id":"ex20","kind":"qoida","text":"Ta''rif: Uchburchak - uchta tomoni va uchta burchagi bor figura.","page":4},{"id":"ex21","kind":"qoida","text":"Ta''rif: To''g''ri to''rtburchak - qarama-qarshi tomonlari teng figura.","page":4},{"id":"ex22","kind":"qoida","text":"Qoida: To''g''ri to''rtburchakning yuzi = bo''yi x eni.","page":4},{"id":"ex23","kind":"qoida","text":"Qoida: Perimetr - hamma tomonlar uzunliklarining yig''indisi.","page":4},{"id":"ex24","kind":"topshiriq","text":"Misol: Bo''yi 8 sm, eni 5 sm bo''lgan to''rtburchak yuzi: 8 x 5 = 40 kv.sm.","page":4},{"id":"ex25","kind":"masala","text":"Masala: Tomonlari 6 sm va 9 sm bo''lgan to''g''ri to''rtburchakning perimetrini toping.","page":4}],"games":[{"id":"matematika-3-sinf-namuna-geometrik-figuralar-4-fill","type":"fill","title":"Qoidani to''ldir","instructions":"Mavzudagi gapdan tushib qolgan so''zni toping.","difficulty":2,"items":[{"sentence":"Misol: Bo''yi 8 sm, eni 5 sm bo''lgan _____ yuzi: 8 x 5 = 40 kv.sm.","answer":"to''rtburchak","options":["tomonlari","ta''rif","to''rtburchak","to''g''ri"]},{"sentence":"Masala: Tomonlari 6 sm va 9 sm bo''lgan to''g''ri _____ perimetrini toping.","answer":"to''rtburchakning","options":["to''rtburchak","ta''rif","to''rtburchakning","figura"]},{"sentence":"Ta''rif: _____ - uchta tomoni va uchta burchagi bor figura.","answer":"Uchburchak","options":["to''rtburchak","bo''lgan","tomonlari","Uchburchak"]},{"sentence":"Qoida: Perimetr - hamma tomonlar _____ yig''indisi.","answer":"uzunliklarining","options":["bo''lgan","to''rtburchak","uzunliklarining","tomonlari"]}],"builtFrom":{"note":"Mavzu matni","pages":[4]}},{"id":"matematika-3-sinf-namuna-geometrik-figuralar-4-truefalse","type":"truefalse","title":"Mavzuni tekshir","instructions":"Fikr to''g''rimi?","difficulty":2,"items":[{"statement":"Ta''rif: Kvadrat - hamma tomonlari teng bo''lgan to''rtburchak.","isTrue":true},{"statement":"Ta''rif: Uchburchak - uchta tomoni va uchta burchagi bor figura.","isTrue":true},{"statement":"Ta''rif: To''g''ri bo''lgan - qarama-qarshi tomonlari teng figura.","isTrue":false,"reason":"To''g''risi: Ta''rif: To''g''ri to''rtburchak - qarama-qarshi tomonlari teng figura."},{"statement":"Qoida: To''g''ri to''rtburchakning yuzi = bo''yi x eni.","isTrue":true},{"statement":"Qoida: Perimetr - hamma tomonlar uzunliklarining yig''indisi.","isTrue":true},{"statement":"Misol: Bo''yi 8 sm, eni 5 sm bo''lgan tomonlari yuzi: 8 x 5 = 40 kv.sm.","isTrue":false,"reason":"To''g''risi: Misol: Bo''yi 8 sm, eni 5 sm bo''lgan to''rtburchak yuzi: 8 x 5 = 40 kv.sm."},{"statement":"Masala: Tomonlari 6 sm va 9 sm bo''lgan to''g''ri to''rtburchakning perimetrini toping.","isTrue":true}],"builtFrom":{"note":"Mavzu matni","pages":[4]}},{"id":"matematika-3-sinf-namuna-geometrik-figuralar-4-bingo","type":"bingo","title":"Bingo kartasi","instructions":"Kartani chop eting yoki doskaga chiqaring: o''qituvchi so''z aytadi, o''quvchilar belgilaydi.","difficulty":1,"items":[{"text":"to''g''ri"},{"text":"uzunliklarining"},{"text":"to''rtburchak"},{"text":"perimetr"},{"text":"tomoni"},{"text":"tomonlari"},{"text":"yuzi"},{"text":"ta''rif"},{"text":"geometrik"}],"builtFrom":{"note":"Mavzu so''zlari","pages":[4]}}]},{"id":"matematika-3-sinf-namuna-t5","index":4,"title":"O''LCHOV BIRLIKLARI","section":"MUNDARIJA","pageStart":5,"pageEnd":5,"text":"O''LCHOV BIRLIKLARI\n\nQoida: 1 metr = 100 santimetr.\nQoida: 1 kilometr = 1000 metr.\nQoida: 1 kilogramm = 1000 gramm.\nQoida: 1 tonna = 1000 kilogramm.\nMisol: 3 m 40 sm = 340 sm\nMisol: 2 kg 500 g = 2500 g\nMasala: Arqonning uzunligi 4 metr edi. Undan 150 santimetr kesib olindi. Necha santimetr qoldi?\nYechish: 400 - 150 = 250\nJavob: 250 sm arqon qoldi.","keywords":["qoida","santimetr","metr","kilogramm","misol","qoldi","birliklari","arqonning","kilometr","uzunligi","o''lchov","yechish","masala","olindi"],"examples":[{"id":"ex26","kind":"qoida","text":"Qoida: 1 metr = 100 santimetr.","page":5},{"id":"ex27","kind":"qoida","text":"Qoida: 1 kilometr = 1000 metr.","page":5},{"id":"ex28","kind":"qoida","text":"Qoida: 1 kilogramm = 1000 gramm.","page":5},{"id":"ex29","kind":"qoida","text":"Qoida: 1 tonna = 1000 kilogramm.","page":5},{"id":"ex30","kind":"topshiriq","text":"Misol: 3 m 40 sm = 340 sm","page":5},{"id":"ex31","kind":"topshiriq","text":"Misol: 2 kg 500 g = 2500 g","page":5},{"id":"ex32","kind":"savol","text":"Masala: Arqonning uzunligi 4 metr edi. Undan 150 santimetr kesib olindi. Necha santimetr qoldi?","page":5},{"id":"ex33","kind":"arifmetika","text":"Yechish: 400 - 150 = 250","page":5},{"id":"ex34","kind":"topshiriq","text":"Javob: 250 sm arqon qoldi.","page":5}],"games":[{"id":"matematika-3-sinf-namuna-o-lchov-birliklari-5-fill","type":"fill","title":"Qoidani to''ldir","instructions":"Mavzudagi gapdan tushib qolgan so''zni toping.","difficulty":2,"items":[{"sentence":"_____: 3 m 40 sm = 340 sm","answer":"Misol","options":["Misol","qoida","santimetr","metr"]},{"sentence":"Masala: _____ uzunligi 4 metr edi.","answer":"Arqonning","options":["kilogramm","santimetr","qoida","Arqonning"]},{"sentence":"Undan 150 _____ kesib olindi.","answer":"santimetr","options":["kilogramm","metr","santimetr","qoida"]},{"sentence":"_____: 250 sm arqon qoldi.","answer":"Javob","options":["Javob","metr","qoida","santimetr"]}],"builtFrom":{"note":"Mavzu matni","pages":[5]}},{"id":"matematika-3-sinf-namuna-o-lchov-birliklari-5-truefalse","type":"truefalse","title":"Mavzuni tekshir","instructions":"Fikr to''g''rimi?","difficulty":2,"items":[{"statement":"Qoida: 1 metr = 100 santimetr.","isTrue":true},{"statement":"Qoida: 1 kilometr = 1000 metr.","isTrue":true},{"statement":"Qoida: 1 santimetr = 1000 gramm.","isTrue":false,"reason":"To''g''risi: Qoida: 1 kilogramm = 1000 gramm."},{"statement":"Qoida: 1 tonna = 1000 kilogramm.","isTrue":true},{"statement":"Misol: 3 m 40 sm = 340 sm","isTrue":true},{"statement":"qoida: 2 kg 500 g = 2500 g","isTrue":false,"reason":"To''g''risi: Misol: 2 kg 500 g = 2500 g"},{"statement":"Masala: Arqonning uzunligi 4 metr edi.","isTrue":true},{"statement":"Undan 150 santimetr kesib olindi.","isTrue":true}],"builtFrom":{"note":"Mavzu matni","pages":[5]}},{"id":"matematika-3-sinf-namuna-o-lchov-birliklari-5-bingo","type":"bingo","title":"Bingo kartasi","instructions":"Kartani chop eting yoki doskaga chiqaring: o''qituvchi so''z aytadi, o''quvchilar belgilaydi.","difficulty":1,"items":[{"text":"arqon"},{"text":"undan"},{"text":"yechish"},{"text":"arqonning"},{"text":"olindi"},{"text":"qoida"},{"text":"misol"},{"text":"340"},{"text":"necha"}],"builtFrom":{"note":"Mavzu so''zlari","pages":[5]}}]},{"id":"matematika-3-sinf-namuna-t6","index":5,"title":"VAQTNI O''LCHASH","section":"MUNDARIJA","pageStart":6,"pageEnd":6,"text":"VAQTNI O''LCHASH\n\nQoida: 1 soat = 60 minut.\nQoida: 1 minut = 60 sekund.\nQoida: 1 kunda 24 soat bor.\nMisol: 2 soat 30 minut = 150 minut\nMasala: Dars ertalab soat 8:00 da boshlandi va 45 minut davom etdi. Dars soat nechada tugadi?\nYechish: 8 soat + 45 minut = 8:45\nJavob: dars soat 8:45 da tugadi.","keywords":["soat","minut","qoida","dars","tugadi","boshlandi","o''lchash","ertalab","nechada","yechish","vaqtni","sekund","masala","kunda"],"examples":[{"id":"ex35","kind":"qoida","text":"Qoida: 1 soat = 60 minut.","page":6},{"id":"ex36","kind":"qoida","text":"Qoida: 1 minut = 60 sekund.","page":6},{"id":"ex37","kind":"qoida","text":"Qoida: 1 kunda 24 soat bor.","page":6},{"id":"ex38","kind":"topshiriq","text":"Misol: 2 soat 30 minut = 150 minut","page":6},{"id":"ex39","kind":"savol","text":"Masala: Dars ertalab soat 8:00 da boshlandi va 45 minut davom etdi. Dars soat nechada tugadi?","page":6},{"id":"ex40","kind":"topshiriq","text":"Javob: dars soat 8:45 da tugadi.","page":6}],"games":[{"id":"matematika-3-sinf-namuna-vaqtni-o-lchash-6-fill","type":"fill","title":"Qoidani to''ldir","instructions":"Mavzudagi gapdan tushib qolgan so''zni toping.","difficulty":2,"items":[{"sentence":"Masala: Dars ertalab soat 8:00 da _____ va 45 minut davom etdi.","answer":"boshlandi","options":["qoida","boshlandi","o''lchash","tugadi"]},{"sentence":"_____: 2 soat 30 minut = 150 minut","answer":"Misol","options":["tugadi","qoida","dars","Misol"]},{"sentence":"Javob: dars soat 8:45 da _____.","answer":"tugadi","options":["boshlandi","minut","tugadi","qoida"]},{"sentence":"_____: 1 kunda 24 soat bor.","answer":"Qoida","options":["minut","tugadi","dars","Qoida"]},{"sentence":"_____: 8 soat + 45 minut = 8:45","answer":"Yechish","options":["qoida","tugadi","dars","Yechish"]}],"builtFrom":{"note":"Mavzu matni","pages":[6]}},{"id":"matematika-3-sinf-namuna-vaqtni-o-lchash-6-truefalse","type":"truefalse","title":"Mavzuni tekshir","instructions":"Fikr to''g''rimi?","difficulty":2,"items":[{"statement":"Qoida: 1 soat = 60 minut.","isTrue":true},{"statement":"Qoida: 1 minut = 60 sekund.","isTrue":true},{"statement":"minut: 1 kunda 24 soat bor.","isTrue":false,"reason":"To''g''risi: Qoida: 1 kunda 24 soat bor."},{"statement":"Misol: 2 soat 30 minut = 150 minut","isTrue":true},{"statement":"Masala: Dars ertalab soat 8:00 da boshlandi va 45 minut davom etdi.","isTrue":true},{"statement":"qoida: 8 soat + 45 minut = 8:45","isTrue":false,"reason":"To''g''risi: Yechish: 8 soat + 45 minut = 8:45"},{"statement":"Javob: dars soat 8:45 da tugadi.","isTrue":true}],"builtFrom":{"note":"Mavzu matni","pages":[6]}},{"id":"matematika-3-sinf-namuna-vaqtni-o-lchash-6-bingo","type":"bingo","title":"Bingo kartasi","instructions":"Kartani chop eting yoki doskaga chiqaring: o''qituvchi so''z aytadi, o''quvchilar belgilaydi.","difficulty":1,"items":[{"text":"soat"},{"text":"nechada"},{"text":"ertalab"},{"text":"tugadi"},{"text":"boshlandi"},{"text":"dars"},{"text":"sekund"},{"text":"davom"},{"text":"javob"}],"builtFrom":{"note":"Mavzu so''zlari","pages":[6]}}]}]'::jsonb
)
on conflict (id) do update set title = excluded.title, topics = excluded.topics, stats = excluded.stats, topic_titles = excluded.topic_titles;

-- O'qituvchi yasagan o'yinlar (Namuna o'yinlar bo'limi uchun)
insert into custom_games (id, title, type, subject, grade, instructions, difficulty, items, groups, built_from)
values (
  'demo-ona-tili-juftlik',
  'So''z va tarjima (Ona tili)',
  'matching',
  'ona-tili',
  3,
  'Chapdagi so''zni o''ngdagi ma''nosi bilan ulang.',
  1,
  '[{"left":"kitob","right":"book"},{"left":"maktab","right":"school"},{"left":"qalam","right":"pen"},{"left":"daftar","right":"notebook"},{"left":"o''qituvchi","right":"teacher"},{"left":"o''quvchi","right":"pupil"}]'::jsonb,
  null,
  '{"note":"O''qituvchi tomonidan yaratilgan (namuna)","pages":[]}'::jsonb
)
on conflict (id) do update set title = excluded.title, items = excluded.items, instructions = excluded.instructions;

insert into custom_games (id, title, type, subject, grade, instructions, difficulty, items, groups, built_from)
values (
  'demo-matematika-tez-hisob',
  'Tez hisob: qo''shish va ayirish',
  'math',
  'matematika',
  3,
  'Misolni yechib, to''g''ri javobni bosing.',
  2,
  '[{"expression":"24 + 38 = ?","answer":62,"options":[77,62,37,112]},{"expression":"100 - 45 = ?","answer":55,"options":[55,40,70,105]},{"expression":"56 + 27 = ?","answer":83,"options":[108,88,133,83]},{"expression":"90 - 36 = ?","answer":54,"options":[29,4,104,54]},{"expression":"145 + 55 = ?","answer":200,"options":[200,150,225,190]},{"expression":"200 - 120 = ?","answer":80,"options":[90,80,70,75]}]'::jsonb,
  null,
  '{"note":"O''qituvchi tomonidan yaratilgan (namuna)","pages":[]}'::jsonb
)
on conflict (id) do update set title = excluded.title, items = excluded.items, instructions = excluded.instructions;

insert into custom_games (id, title, type, subject, grade, instructions, difficulty, items, groups, built_from)
values (
  'demo-tabiat-togri-notogri',
  'Tabiat: to''g''ri yoki noto''g''ri',
  'truefalse',
  'tabiiy-fanlar',
  3,
  'Fikr to''g''ri bo''lsa ✅, noto''g''ri bo''lsa ❌ ni bosing.',
  1,
  '[{"statement":"Suv 100 gradusda qaynaydi","isTrue":true},{"statement":"Quyosh kechasi chiqadi","isTrue":false},{"statement":"Baliq suvda yashaydi","isTrue":true},{"statement":"Daraxtlar qishda yashil bo''ladi","isTrue":false},{"statement":"Muz suvdan yengil","isTrue":true}]'::jsonb,
  null,
  '{"note":"O''qituvchi tomonidan yaratilgan (namuna)","pages":[]}'::jsonb
)
on conflict (id) do update set title = excluded.title, items = excluded.items, instructions = excluded.instructions;

insert into custom_games (id, title, type, subject, grade, instructions, difficulty, items, groups, built_from)
values (
  'demo-missing-letter',
  'Tushib qolgan harfni top',
  'missingletter',
  'ona-tili',
  3,
  'So''zdagi tushib qolgan harfni tanlang.',
  1,
  '[{"display":"k_tob","answer":"i","options":["d","y","c","i"]},{"display":"m_ktab","answer":"a","options":["v","e","r","a"]},{"display":"qal_m","answer":"a","options":["c","a","d","k"]},{"display":"d_ftar","answer":"a","options":["j","a","d","o"]},{"display":"suv_","answer":"l","options":["l","z","p","q"]}]'::jsonb,
  null,
  '{"note":"O''qituvchi tomonidan yaratilgan (namuna)","pages":[]}'::jsonb
)
on conflict (id) do update set title = excluded.title, items = excluded.items, instructions = excluded.instructions;

-- O'yin natijalari ("Eng yaxshi natijalar" jadvali uchun)
-- O'yin natijalari (kitob sahifasidagi "Eng yaxshi natijalar" uchun)
insert into game_results (id, book_id, topic_id, topic_title, game_id, game_title, game_type, student_id, student_name, score, total, time_sec)
select
  'demo-result-' || row_number() over (),
  'demo-matematika-3',
  t.id,
  t.title,
  t.id || '-math',
  'Tez hisob',
  'math',
  s.id,
  s.full_name,
  6 + (row_number() over () % 5),
  10,
  40 + (row_number() over () % 40)
from students s
cross join (select id, title from jsonb_to_recordset(
  (select topics from books where id = 'demo-matematika-3')
) as x(id text, title text) limit 2) t
where s.full_name in ('Alisher Karimov', 'Madina Yusupova', 'Bekzod Ismoilov')
on conflict (id) do nothing;
