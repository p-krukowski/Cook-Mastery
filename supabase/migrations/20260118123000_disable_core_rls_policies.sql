/*
  migration: disable core rls policies
  purpose: drop existing policies and disable rls on core tables
  affected: public.profiles, public.tutorials, public.articles, public.user_tutorials,
            public.user_articles, public.cookbook_entries
*/

-- profiles policies
drop policy if exists profiles_select_authenticated on public.profiles;
drop policy if exists profiles_select_anon on public.profiles;
drop policy if exists profiles_insert_authenticated on public.profiles;
drop policy if exists profiles_insert_anon on public.profiles;
drop policy if exists profiles_update_authenticated on public.profiles;
drop policy if exists profiles_update_anon on public.profiles;

-- tutorials policies
drop policy if exists tutorials_select_authenticated on public.tutorials;
drop policy if exists tutorials_select_anon on public.tutorials;

-- articles policies
drop policy if exists articles_select_authenticated on public.articles;
drop policy if exists articles_select_anon on public.articles;

-- user_tutorials policies
drop policy if exists user_tutorials_select_authenticated on public.user_tutorials;
drop policy if exists user_tutorials_select_anon on public.user_tutorials;
drop policy if exists user_tutorials_insert_authenticated on public.user_tutorials;
drop policy if exists user_tutorials_insert_anon on public.user_tutorials;
drop policy if exists user_tutorials_delete_authenticated on public.user_tutorials;
drop policy if exists user_tutorials_delete_anon on public.user_tutorials;

-- user_articles policies
drop policy if exists user_articles_select_authenticated on public.user_articles;
drop policy if exists user_articles_select_anon on public.user_articles;
drop policy if exists user_articles_insert_authenticated on public.user_articles;
drop policy if exists user_articles_insert_anon on public.user_articles;
drop policy if exists user_articles_delete_authenticated on public.user_articles;
drop policy if exists user_articles_delete_anon on public.user_articles;

-- cookbook_entries policies
drop policy if exists cookbook_entries_select_authenticated on public.cookbook_entries;
drop policy if exists cookbook_entries_select_anon on public.cookbook_entries;
drop policy if exists cookbook_entries_insert_authenticated on public.cookbook_entries;
drop policy if exists cookbook_entries_insert_anon on public.cookbook_entries;
drop policy if exists cookbook_entries_update_authenticated on public.cookbook_entries;
drop policy if exists cookbook_entries_update_anon on public.cookbook_entries;
drop policy if exists cookbook_entries_delete_authenticated on public.cookbook_entries;
drop policy if exists cookbook_entries_delete_anon on public.cookbook_entries;

-- disable rls for all core tables
alter table public.profiles disable row level security;
alter table public.tutorials disable row level security;
alter table public.articles disable row level security;
alter table public.user_tutorials disable row level security;
alter table public.user_articles disable row level security;
alter table public.cookbook_entries disable row level security;
