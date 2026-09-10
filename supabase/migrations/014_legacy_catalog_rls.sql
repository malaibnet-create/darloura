-- Protect the original curriculum catalog and per-student lesson progress.
-- Run after schema.sql and migrations 002 through 013.

alter table public.levels enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_progress enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'levels'
      and policyname = 'anyone can read published levels'
  ) then
    create policy "anyone can read published levels"
      on public.levels
      for select
      to anon, authenticated
      using (published = true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'lessons'
      and policyname = 'anyone can read published lessons'
  ) then
    create policy "anyone can read published lessons"
      on public.lessons
      for select
      to anon, authenticated
      using (
        published = true
        and exists (
          select 1
          from public.levels
          where levels.id = lessons.level_id
            and levels.published = true
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'lesson_progress'
      and policyname = 'students can read own lesson progress'
  ) then
    create policy "students can read own lesson progress"
      on public.lesson_progress
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'lesson_progress'
      and policyname = 'students can insert own lesson progress'
  ) then
    create policy "students can insert own lesson progress"
      on public.lesson_progress
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'lesson_progress'
      and policyname = 'students can update own lesson progress'
  ) then
    create policy "students can update own lesson progress"
      on public.lesson_progress
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'lesson_progress'
      and policyname = 'students can delete own lesson progress'
  ) then
    create policy "students can delete own lesson progress"
      on public.lesson_progress
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end
$$;

