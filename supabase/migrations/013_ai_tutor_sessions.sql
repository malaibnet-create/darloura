-- Personal AI Tutor sessions, preferences, and reports.
-- Raw microphone audio is never stored by this schema.
create table if not exists public.ai_tutor_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  voice text not null default 'marin',
  speed text not null default 'normal' check (speed in ('slow','normal')),
  explanation_language text not null default 'both' check (explanation_language in ('ar','en','both')),
  transcript_auto boolean not null default true,
  correction_level text not null default 'balanced' check (correction_level in ('important','balanced','detailed')),
  save_summaries boolean not null default true,
  allow_audio_storage boolean not null default false check (allow_audio_storage = false),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_tutor_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','completed','abandoned','failed')),
  learning_track text not null check (learning_track in ('msa','moroccan_darija')),
  level_code text not null check (level_code in ('A1','A2','B1')),
  activity_type text not null check (activity_type in ('lesson_review','vocabulary','free_conversation','role_play','grammar','pronunciation')),
  lesson_ids jsonb not null default '[]'::jsonb,
  practiced_vocabulary_ids jsonb not null default '[]'::jsonb,
  practiced_vocabulary jsonb not null default '[]'::jsonb,
  new_vocabulary_ids jsonb not null default '[]'::jsonb,
  new_vocabulary jsonb not null default '[]'::jsonb,
  practiced_grammar_ids jsonb not null default '[]'::jsonb,
  practiced_grammar jsonb not null default '[]'::jsonb,
  important_corrections jsonb not null default '[]'::jsonb,
  strengths jsonb not null default '[]'::jsonb,
  review_needs jsonb not null default '[]'::jsonb,
  next_recommendation text,
  transcript jsonb,
  settings_snapshot jsonb not null default '{}'::jsonb,
  duration_seconds integer not null default 0 check (duration_seconds between 0 and 3600),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ai_tutor_one_active_session_per_user
  on public.ai_tutor_sessions (user_id) where status = 'active';
create index if not exists ai_tutor_sessions_user_created_idx
  on public.ai_tutor_sessions (user_id, created_at desc);

create table if not exists public.ai_tutor_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.ai_tutor_sessions(id) on delete set null,
  category text not null default 'answer',
  message text not null check (char_length(message) between 1 and 1000),
  created_at timestamptz not null default now()
);

alter table public.ai_tutor_preferences enable row level security;
alter table public.ai_tutor_sessions enable row level security;
alter table public.ai_tutor_reports enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ai_tutor_preferences' and policyname='students manage own tutor preferences') then
    create policy "students manage own tutor preferences" on public.ai_tutor_preferences
      for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ai_tutor_sessions' and policyname='students manage own tutor sessions') then
    create policy "students manage own tutor sessions" on public.ai_tutor_sessions
      for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ai_tutor_reports' and policyname='students create and read own tutor reports') then
    create policy "students create and read own tutor reports" on public.ai_tutor_reports
      for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
