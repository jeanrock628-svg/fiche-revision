-- À copier-coller dans Supabase : Dashboard > SQL Editor > New query > Run

create extension if not exists "pgcrypto";

-- Un cours = ce que l'élève est en train de réviser (un seul cours actif à la fois pour l'instant)
create table courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  classe text not null,
  matiere text,
  date_examen date not null,
  note_visee int not null check (note_visee >= 0 and note_visee <= 20),
  texte_cours text not null,
  created_at timestamptz default now()
);

-- Les notions = les petits morceaux du cours, découpés par l'IA
create table notions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete cascade not null,
  titre text not null,
  description text,
  ordre int default 0
);

-- La progression de l'élève sur chaque notion (niveau de maîtrise + prochaine révision due)
create table notion_progress (
  id uuid primary key default gen_random_uuid(),
  notion_id uuid references notions(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  niveau int default 0 check (niveau >= 0 and niveau <= 5),
  prochaine_revision date default current_date,
  nb_revisions int default 0,
  updated_at timestamptz default now(),
  unique (notion_id, user_id)
);

-- Sécurité : chaque élève ne voit et ne modifie que ses propres données
alter table courses enable row level security;
alter table notions enable row level security;
alter table notion_progress enable row level security;

create policy "un élève gère ses propres cours"
  on courses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "un élève voit les notions de ses propres cours"
  on notions for all
  using (exists (select 1 from courses where courses.id = notions.course_id and courses.user_id = auth.uid()))
  with check (exists (select 1 from courses where courses.id = notions.course_id and courses.user_id = auth.uid()));

create policy "un élève gère sa propre progression"
  on notion_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Historique des révisions (graphique de progression)
create table journal_revisions (
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

-- Anti-abus : date du dernier appel IA par élève
create table api_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  derniere_generation_cours timestamptz,
  derniere_session timestamptz
);
alter table api_usage enable row level security;
create policy "un élève voit son propre usage" on api_usage for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Suppression de compte en cascade (les FK ci-dessus pointent déjà vers auth.users avec cascade)
