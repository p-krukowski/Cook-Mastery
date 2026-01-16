-- migration: create core schema for cook mastery
-- purpose: add enums, content tables, progress junctions, cookbook entries, and progress view
-- affected: public.profiles, public.tutorials, public.articles, public.user_tutorials,
--           public.user_articles, public.cookbook_entries, public.user_level_progress (view)
-- notes: rls is enabled on all tables; policies are explicit per action and role

-- enums for content classification and difficulty
create type if not exists public.difficulty_level as enum ('BEGGINER', 'INTERMEDIATE', 'EXPERIENCED');
create type if not exists public.tutorial_category as enum ('PRACTICAL', 'THEORETICAL', 'EQUIPMENT');

-- profiles: one-to-one with auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  selected_level public.difficulty_level not null default 'BEGGINER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- tutorials: structured learning content
create table if not exists public.tutorials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category public.tutorial_category not null,
  level public.difficulty_level not null,
  difficulty_weight smallint not null check (difficulty_weight between 1 and 5),
  summary text not null,
  content text not null,
  steps jsonb not null,
  practice_recommendations text not null,
  key_takeaways text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- articles: concept explanations and theory
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  level public.difficulty_level not null,
  difficulty_weight smallint not null check (difficulty_weight between 1 and 5),
  summary text not null,
  content text not null,
  key_takeaways text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- user_tutorials: completion tracking for tutorials
create table if not exists public.user_tutorials (
  user_id uuid not null references public.profiles(id) on delete cascade,
  tutorial_id uuid not null references public.tutorials(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, tutorial_id)
);

-- user_articles: completion tracking for articles
create table if not exists public.user_articles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

-- cookbook_entries: user-saved links and notes
create table if not exists public.cookbook_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  url text not null,
  title text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- indexes to support feeds, filtering, and analytics
create index if not exists tutorials_created_at_idx on public.tutorials (created_at);
create index if not exists tutorials_level_weight_created_at_idx
  on public.tutorials (level, difficulty_weight, created_at);

create index if not exists articles_created_at_idx on public.articles (created_at);
create index if not exists articles_level_weight_created_at_idx
  on public.articles (level, difficulty_weight, created_at);

create index if not exists user_tutorials_completed_at_idx on public.user_tutorials (completed_at);
create index if not exists user_tutorials_tutorial_id_idx on public.user_tutorials (tutorial_id);

create index if not exists user_articles_completed_at_idx on public.user_articles (completed_at);
create index if not exists user_articles_article_id_idx on public.user_articles (article_id);

create index if not exists cookbook_entries_user_id_idx on public.cookbook_entries (user_id);
create index if not exists cookbook_entries_created_at_idx on public.cookbook_entries (created_at);

-- view: per-user, per-level completion progress
create or replace view public.user_level_progress as
with
  levels as (
    select unnest(enum_range(null::public.difficulty_level)) as level
  ),
  users as (
    select id as user_id from public.profiles
  ),
  totals as (
    select
      l.level,
      coalesce(t.total_tutorials, 0) + coalesce(a.total_articles, 0) as total_count
    from levels l
    left join (
      select level, count(*) as total_tutorials
      from public.tutorials
      group by level
    ) t on t.level = l.level
    left join (
      select level, count(*) as total_articles
      from public.articles
      group by level
    ) a on a.level = l.level
  ),
  completed as (
    select
      user_id,
      level,
      count(*) as completed_count
    from (
      select ut.user_id, t.level
      from public.user_tutorials ut
      join public.tutorials t on t.id = ut.tutorial_id
      union all
      select ua.user_id, a.level
      from public.user_articles ua
      join public.articles a on a.id = ua.article_id
    ) combined
    group by user_id, level
  )
select
  u.user_id,
  l.level,
  coalesce(c.completed_count, 0) as completed_count,
  coalesce(t.total_count, 0) as total_count,
  case
    when coalesce(t.total_count, 0) = 0 then 0
    else (coalesce(c.completed_count, 0)::numeric / t.total_count::numeric) * 100
  end as completion_percent,
  case
    when coalesce(t.total_count, 0) = 0 then false
    else ((coalesce(c.completed_count, 0)::numeric / t.total_count::numeric) * 100) >= 85
  end as is_up_to_date
from users u
cross join levels l
left join totals t on t.level = l.level
left join completed c on c.user_id = u.user_id and c.level = l.level;

-- enable row level security on all tables
alter table public.profiles enable row level security;
alter table public.tutorials enable row level security;
alter table public.articles enable row level security;
alter table public.user_tutorials enable row level security;
alter table public.user_articles enable row level security;
alter table public.cookbook_entries enable row level security;

-- profiles policies
-- authenticated users can read their own profile
create policy profiles_select_authenticated
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- anonymous users cannot read profiles
create policy profiles_select_anon
  on public.profiles
  for select
  to anon
  using (false);

-- authenticated users can insert their own profile
create policy profiles_insert_authenticated
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- anonymous users cannot insert profiles
create policy profiles_insert_anon
  on public.profiles
  for insert
  to anon
  with check (false);

-- authenticated users can update their own profile
create policy profiles_update_authenticated
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- anonymous users cannot update profiles
create policy profiles_update_anon
  on public.profiles
  for update
  to anon
  using (false)
  with check (false);

-- tutorials policies (read for authenticated only)
-- authenticated users can read tutorials
create policy tutorials_select_authenticated
  on public.tutorials
  for select
  to authenticated
  using (true);

-- anonymous users cannot read tutorials
create policy tutorials_select_anon
  on public.tutorials
  for select
  to anon
  using (false);

-- disable writes for non-service roles by denying insert/update/delete
create policy tutorials_insert_authenticated
  on public.tutorials
  for insert
  to authenticated
  with check (false);

create policy tutorials_insert_anon
  on public.tutorials
  for insert
  to anon
  with check (false);

create policy tutorials_update_authenticated
  on public.tutorials
  for update
  to authenticated
  using (false)
  with check (false);

create policy tutorials_update_anon
  on public.tutorials
  for update
  to anon
  using (false)
  with check (false);

create policy tutorials_delete_authenticated
  on public.tutorials
  for delete
  to authenticated
  using (false);

create policy tutorials_delete_anon
  on public.tutorials
  for delete
  to anon
  using (false);

-- articles policies (read for authenticated only)
create policy articles_select_authenticated
  on public.articles
  for select
  to authenticated
  using (true);

create policy articles_select_anon
  on public.articles
  for select
  to anon
  using (false);

create policy articles_insert_authenticated
  on public.articles
  for insert
  to authenticated
  with check (false);

create policy articles_insert_anon
  on public.articles
  for insert
  to anon
  with check (false);

create policy articles_update_authenticated
  on public.articles
  for update
  to authenticated
  using (false)
  with check (false);

create policy articles_update_anon
  on public.articles
  for update
  to anon
  using (false)
  with check (false);

create policy articles_delete_authenticated
  on public.articles
  for delete
  to authenticated
  using (false);

create policy articles_delete_anon
  on public.articles
  for delete
  to anon
  using (false);

-- user_tutorials policies
create policy user_tutorials_select_authenticated
  on public.user_tutorials
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy user_tutorials_select_anon
  on public.user_tutorials
  for select
  to anon
  using (false);

create policy user_tutorials_insert_authenticated
  on public.user_tutorials
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy user_tutorials_insert_anon
  on public.user_tutorials
  for insert
  to anon
  with check (false);

-- updates are not supported for progress rows
create policy user_tutorials_update_authenticated
  on public.user_tutorials
  for update
  to authenticated
  using (false)
  with check (false);

create policy user_tutorials_update_anon
  on public.user_tutorials
  for update
  to anon
  using (false)
  with check (false);

create policy user_tutorials_delete_authenticated
  on public.user_tutorials
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy user_tutorials_delete_anon
  on public.user_tutorials
  for delete
  to anon
  using (false);

-- user_articles policies
create policy user_articles_select_authenticated
  on public.user_articles
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy user_articles_select_anon
  on public.user_articles
  for select
  to anon
  using (false);

create policy user_articles_insert_authenticated
  on public.user_articles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy user_articles_insert_anon
  on public.user_articles
  for insert
  to anon
  with check (false);

-- updates are not supported for progress rows
create policy user_articles_update_authenticated
  on public.user_articles
  for update
  to authenticated
  using (false)
  with check (false);

create policy user_articles_update_anon
  on public.user_articles
  for update
  to anon
  using (false)
  with check (false);

create policy user_articles_delete_authenticated
  on public.user_articles
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy user_articles_delete_anon
  on public.user_articles
  for delete
  to anon
  using (false);

-- cookbook_entries policies
create policy cookbook_entries_select_authenticated
  on public.cookbook_entries
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy cookbook_entries_select_anon
  on public.cookbook_entries
  for select
  to anon
  using (false);

create policy cookbook_entries_insert_authenticated
  on public.cookbook_entries
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy cookbook_entries_insert_anon
  on public.cookbook_entries
  for insert
  to anon
  with check (false);

create policy cookbook_entries_update_authenticated
  on public.cookbook_entries
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy cookbook_entries_update_anon
  on public.cookbook_entries
  for update
  to anon
  using (false)
  with check (false);

create policy cookbook_entries_delete_authenticated
  on public.cookbook_entries
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy cookbook_entries_delete_anon
  on public.cookbook_entries
  for delete
  to anon
  using (false);
