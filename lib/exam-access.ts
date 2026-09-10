import 'server-only';

import { missingExamSections } from './exam-access-rules.mjs';
import { createServerSupabaseClient } from './supabase/server';
import type { LearningLevel, LearningSection } from './learning-progress';

type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

export type ExamAccessResult =
  | { allowed: true; supabase: ServerSupabaseClient; userId: string }
  | { allowed: false; reason: 'not-configured' | 'auth-required' | 'progress-unavailable' | 'sections-incomplete'; missing: LearningSection[] };

export async function getExamAccess(level: LearningLevel, lesson: number): Promise<ExamAccessResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return { allowed: false, reason: 'not-configured', missing: [] };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { allowed: false, reason: 'auth-required', missing: [] };

    const { data, error } = await supabase
      .from('learning_section_progress')
      .select('section,status')
      .eq('user_id', user.id)
      .eq('level_code', level)
      .eq('lesson_number', lesson);

    if (error) return { allowed: false, reason: 'progress-unavailable', missing: [] };
    const missing = missingExamSections(level, data);
    if (missing.length) return { allowed: false, reason: 'sections-incomplete', missing };

    return { allowed: true, supabase, userId: user.id };
  } catch {
    return { allowed: false, reason: 'progress-unavailable', missing: [] };
  }
}

export function examAccessResponse(access: Exclude<ExamAccessResult, { allowed: true }>) {
  if (access.reason === 'auth-required') {
    return Response.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
  }
  if (access.reason === 'sections-incomplete') {
    return Response.json({ error: 'LESSON_SECTIONS_INCOMPLETE', missing: access.missing }, { status: 403 });
  }
  if (access.reason === 'not-configured') {
    return Response.json({ error: 'AUTH_NOT_CONFIGURED' }, { status: 503 });
  }
  return Response.json({ error: 'PROGRESS_CHECK_FAILED' }, { status: 503 });
}

