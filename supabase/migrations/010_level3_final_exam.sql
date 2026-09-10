create table if not exists public.level3_exam_attempts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id text not null default 'level-03-lesson-01-final-exam',
  status text not null default 'in_progress' check (status in ('in_progress','evaluation_pending','passed','production_retake','failed','expired')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz,
  current_section text not null default 'vocabulary',
  submitted_sections jsonb not null default '[]'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  writing_text text not null default '',
  speaking_transcript jsonb not null default '[]'::jsonb,
  listening_plays smallint not null default 0 check (listening_plays between 0 and 2),
  listening_started_at timestamptz,
  section_scores jsonb not null default '{}'::jsonb,
  objective_feedback jsonb,
  writing_evaluation jsonb,
  speaking_evaluation jsonb,
  total_score smallint check (total_score between 0 and 100),
  best_score smallint not null default 0 check (best_score between 0 and 100),
  attempt_number integer not null default 1,
  navigation_events jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.level3_exam_attempts enable row level security;

drop policy if exists "Learners can read own level3 exam attempts" on public.level3_exam_attempts;
create policy "Learners can read own level3 exam attempts"
on public.level3_exam_attempts for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Learners can insert own level3 exam attempts" on public.level3_exam_attempts;
create policy "Learners can insert own level3 exam attempts"
on public.level3_exam_attempts for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Learners can update own level3 exam attempts" on public.level3_exam_attempts;
create policy "Learners can update own level3 exam attempts"
on public.level3_exam_attempts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists level3_exam_attempts_user_exam_idx
on public.level3_exam_attempts (user_id, exam_id, started_at desc);
