-- ============================================================================
-- v4 MIGRATSIYA: ballar + yopilgan o'yinlar + tezlik indekslari
-- SQL Editor'da Run qilinadi. Qayta run qilish XAVFSIZ (idempotent).
--
-- Agar schema-portal.sql'ning YANGI to'liq versiyasini run qilgan bo'lsangiz,
-- bu faylni qayta run qilish SHART EMAS (zarari yo'q).
-- ============================================================================

-- 1) BALLAR ustuni (ona-tili=4, matematika=2)
alter table game_results add column if not exists points smallint not null default 0;

-- 2) Tezlik indekslari (ko'p bolalar bir vaqtda o'ynaganda)
create index if not exists idx_results_student_created on game_results (student_id, created_at desc);
create index if not exists idx_results_game on game_results (game_id);

-- 3) Yopilgan o'yinlar (o'qituvchi bolalar portalidan yopadi)
create table if not exists portal_closed_games (
  key       text primary key,
  closed_at timestamptz not null default now()
);
alter table portal_closed_games enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'drop policy if exists "portal_closed_games_select" on portal_closed_games;';
    execute 'drop policy if exists "portal_closed_games_insert" on portal_closed_games;';
    execute 'drop policy if exists "portal_closed_games_update" on portal_closed_games;';
    execute 'drop policy if exists "portal_closed_games_delete" on portal_closed_games;';
    execute 'create policy "portal_closed_games_select" on portal_closed_games for select to authenticated using (true);';
    execute 'create policy "portal_closed_games_insert" on portal_closed_games for insert to authenticated with check (true);';
    execute 'create policy "portal_closed_games_update" on portal_closed_games for update to authenticated using (true) with check (true);';
    execute 'create policy "portal_closed_games_delete" on portal_closed_games for delete to authenticated using (true);';
  end if;
end $$;

-- 4) TEKSHIRUV: 2 ta qator chiqishi kerak (points va portal_closed_games)
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'game_results' and column_name = 'points';
select table_name from information_schema.tables
where table_schema = 'public' and table_name = 'portal_closed_games';
