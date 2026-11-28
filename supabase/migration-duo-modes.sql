-- ============================================================================
-- DUO YAKUNLANISH REJIMLARI — kichik migratsiya (SQL Editor'da Run qilinadi).
-- Agar schema-portal.sql'ning YANGI versiyasini to'liq run qilsangiz, buni
-- qayta run qilish SHART EMAS (baribir xavfsiz — idempotent).
-- ============================================================================
alter table game_rooms add column if not exists end_mode       text not null default 'questions'
  check (end_mode in ('questions', 'race', 'time'));
alter table game_rooms add column if not exists time_limit_min smallint;
alter table game_rooms add column if not exists winner_slot    text;

-- Tekshiruv: 3 qator chiqishi kerak
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'game_rooms'
  and column_name in ('end_mode', 'time_limit_min', 'winner_slot') order by column_name;
