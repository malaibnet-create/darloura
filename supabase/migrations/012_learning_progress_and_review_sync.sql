-- Cross-device section progress and review collection for signed-in students.
create table if not exists public.learning_section_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  level_code text not null check (level_code in ('A1', 'A2', 'B1')),
  lesson_number int not null check (lesson_number > 0),
  section text not null check (section in ('vocabulary', 'reading', 'listening', 'grammar', 'conversation', 'phrases')),
  status text not null default 'not-started' check (status in ('not-started', 'in-progress', 'completed')),
  last_href text,
  updated_at timestamptz not null default now(),
  unique (user_id, level_code, lesson_number, section)
);

create table if not exists public.learning_review_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null,
  level_code text not null check (level_code in ('A1', 'A2', 'B1')),
  lesson_number int not null check (lesson_number > 0),
  section text not null check (section in ('vocabulary', 'reading', 'listening', 'grammar', 'conversation', 'phrases')),
  arabic text not null,
  english text,
  example text,
  audio_url text,
  added_at timestamptz not null default now(),
  unique (user_id, item_key)
);

alter table public.learning_section_progress enable row level security;
alter table public.learning_review_items enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'learning_section_progress' and policyname = 'students manage own section progress') then
    create policy "students manage own section progress" on public.learning_section_progress
      for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'learning_review_items' and policyname = 'students manage own review items') then
    create policy "students manage own review items" on public.learning_review_items
      for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

create index if not exists learning_section_progress_user_updated_idx
  on public.learning_section_progress (user_id, updated_at desc);
create index if not exists learning_review_items_user_added_idx
  on public.learning_review_items (user_id, added_at desc);
