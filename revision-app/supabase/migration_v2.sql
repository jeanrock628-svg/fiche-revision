-- À exécuter dans Supabase SQL Editor si ta base existe déjà (schema.sql initial déjà lancé).
-- Ajoute : historique de progression, anti-abus, et suppression de compte en cascade.

-- 1. Historique des révisions (pour le graphique de progression)
create table if not exists journal_revisions (
  id uuid primary key default gen_random_uuid(),
  notion_id uuid references notions(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  niveau int not null,
  correct boolean not null,
  created_at timestamptz default now()
);
alter table journal_revisions enable row level security;
create policy "un élève voit son propre journal" on journal_revisions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2. Anti-abus : on garde la date du dernier appel IA par élève
create table if not exists api_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  derniere_generation_cours timestamptz,
  derniere_session timestamptz
);
alter table api_usage enable row level security;
create policy "un élève voit son propre usage" on api_usage for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. Permettre la suppression complète du compte (cascade jusqu'aux cours et à la progression)
alter table courses drop constraint if exists courses_user_id_fkey;
alter table courses add constraint courses_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table notion_progress drop constraint if exists notion_progress_user_id_fkey;
alter table notion_progress add constraint notion_progress_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
