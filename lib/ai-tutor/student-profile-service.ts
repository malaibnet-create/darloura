import 'server-only';

import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { StudentLearningSnapshot, TutorLevel, TutorSessionSummary, TutorTrack } from './types';

type DbClient = SupabaseClient;

type ProfileRow = {
  full_name: string | null;
  learning_goal: string | null;
  interests: string[] | string | null;
  arabic_track: string | null;
};

type ProgressRow = {
  level_code: string | null;
  lesson_number: number | null;
  section: string | null;
  status: string | null;
  last_href: string | null;
  updated_at: string | null;
};

type ReviewRow = {
  item_key: string;
  level_code: string | null;
  lesson_number: number | null;
  section: string | null;
  arabic: string;
  english: string | null;
  added_at: string | null;
};

type PlacementRow = { recommended_level: string | null; score: number | null; created_at: string | null };
type ExamAttemptRow = { total_score: number | null; best_score: number | null; status: string | null; ended_at: string | null; created_at: string | null };
type TutorSessionRow = {
  id: string;
  learning_track: string | null;
  level_code: string | null;
  activity_type: TutorSessionSummary['activityType'];
  lesson_ids: string[] | null;
  practiced_vocabulary_ids: string[] | null;
  practiced_vocabulary: string[] | null;
  new_vocabulary_ids: string[] | null;
  new_vocabulary: string[] | null;
  practiced_grammar_ids: string[] | null;
  practiced_grammar: string[] | null;
  important_corrections: TutorSessionSummary['importantCorrections'] | null;
  strengths: string[] | null;
  review_needs: string[] | null;
  next_recommendation: string | null;
  duration_seconds: number | null;
  created_at: string | null;
};

const requiredSectionCount: Record<TutorLevel, number> = { A1: 5, A2: 5, B1: 6 };

function levelOf(value: unknown): TutorLevel {
  const level = String(value || '').toUpperCase();
  return level === 'A2' || level === 'B1' ? level : 'A1';
}

export function trackOf(value: unknown): TutorTrack {
  const label = String(value || '');
  return label.includes('دارجة') ? 'moroccan_darija' : 'msa';
}

function interestsOf(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean).slice(0, 12);
  if (typeof value === 'string') return value.split(/[،,]/u).map((item) => item.trim()).filter(Boolean).slice(0, 12);
  return [];
}

function mapTutorSummary(row: TutorSessionRow): TutorSessionSummary {
  return {
    sessionId: String(row.id),
    learningTrack: trackOf(row.learning_track),
    levelId: levelOf(row.level_code),
    activityType: row.activity_type,
    lessonIds: Array.isArray(row.lesson_ids) ? row.lesson_ids.map(String) : [],
    practicedVocabularyIds: Array.isArray(row.practiced_vocabulary_ids) ? row.practiced_vocabulary_ids.map(String) : [],
    practicedVocabulary: Array.isArray(row.practiced_vocabulary) ? row.practiced_vocabulary.map(String) : [],
    newVocabularyIds: Array.isArray(row.new_vocabulary_ids) ? row.new_vocabulary_ids.map(String) : [],
    newVocabulary: Array.isArray(row.new_vocabulary) ? row.new_vocabulary.map(String) : [],
    practicedGrammarIds: Array.isArray(row.practiced_grammar_ids) ? row.practiced_grammar_ids.map(String) : [],
    practicedGrammar: Array.isArray(row.practiced_grammar) ? row.practiced_grammar.map(String) : [],
    importantCorrections: Array.isArray(row.important_corrections) ? row.important_corrections : [],
    strengths: Array.isArray(row.strengths) ? row.strengths.map(String) : [],
    reviewNeeds: Array.isArray(row.review_needs) ? row.review_needs.map(String) : [],
    nextRecommendation: row.next_recommendation || undefined,
    durationSeconds: Number(row.duration_seconds || 0),
    createdAt: row.created_at || new Date().toISOString(),
  };
}

async function safeQuery<T>(promise: PromiseLike<{ data: T | null; error: unknown }>, fallback: T): Promise<T> {
  try {
    const result = await promise;
    return result.error || result.data == null ? fallback : result.data;
  } catch {
    return fallback;
  }
}

export async function getStudentLearningSnapshot(supabase: DbClient, user: User): Promise<StudentLearningSnapshot> {
  const metadata = user.user_metadata || {};
  const [profile, progress, review, placement, level2Attempts, level3Attempts, tutorRows] = await Promise.all([
    safeQuery<ProfileRow | null>(supabase.from('profiles').select('full_name,learning_goal,interests,arabic_track').eq('id', user.id).maybeSingle(), null),
    safeQuery<ProgressRow[]>(supabase.from('learning_section_progress').select('level_code,lesson_number,section,status,last_href,updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(120), []),
    safeQuery<ReviewRow[]>(supabase.from('learning_review_items').select('item_key,level_code,lesson_number,section,arabic,english,added_at').eq('user_id', user.id).order('added_at', { ascending: false }).limit(80), []),
    safeQuery<PlacementRow | null>(supabase.from('placement_attempts').select('recommended_level,score,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(), null),
    safeQuery<ExamAttemptRow[]>(supabase.from('level2_exam_attempts').select('total_score,best_score,status,ended_at,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5), []),
    safeQuery<ExamAttemptRow[]>(supabase.from('level3_exam_attempts').select('total_score,best_score,status,ended_at,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5), []),
    safeQuery<TutorSessionRow[]>(supabase.from('ai_tutor_sessions').select('*').eq('user_id', user.id).eq('status', 'completed').order('created_at', { ascending: false }).limit(5), []),
  ]);

  const level = levelOf(placement?.recommended_level || metadata.level);
  const rawTrack = profile?.arabic_track || metadata.arabic_track || 'الفصحى';
  const track = trackOf(rawTrack);
  const grouped = new Map<string, { level: TutorLevel; lesson: number; completed: number; latest?: string }>();
  const completedSections: StudentLearningSnapshot['completedSections'] = [];
  for (const row of progress) {
    const rowLevel = levelOf(row.level_code);
    const lesson = Number(row.lesson_number || 1);
    const key = `${rowLevel}-${lesson}`;
    const group = grouped.get(key) || { level: rowLevel, lesson, completed: 0 };
    if (row.status === 'completed') {
      group.completed += 1;
      completedSections.push({ level: rowLevel, lesson, section: String(row.section), updatedAt: row.updated_at || undefined });
    }
    if (!group.latest || String(row.updated_at || '') > group.latest) group.latest = row.updated_at || undefined;
    grouped.set(key, group);
  }
  const completedLessons = [...grouped.entries()]
    .filter(([, group]) => group.completed >= requiredSectionCount[group.level])
    .map(([key]) => key);
  const latestProgress = progress[0];
  const currentLesson = latestProgress ? `${levelOf(latestProgress.level_code)}-${Number(latestProgress.lesson_number || 1)}` : undefined;
  const learnedVocabulary = review
    .filter((row) => row.section === 'vocabulary' || row.section === 'phrases')
    .map((row) => ({ id: String(row.item_key), arabic: String(row.arabic), english: row.english || undefined, lessonId: `${levelOf(row.level_code)}-${Number(row.lesson_number || 1)}` }));
  const assessmentResults = [
    ...(placement ? [{ assessment: 'placement', score: Number(placement.score || 0), createdAt: placement.created_at || undefined }] : []),
    ...level2Attempts.filter((row) => Number.isFinite(Number(row.total_score ?? row.best_score))).map((row) => ({ assessment: 'A2-1-exam', score: Number(row.total_score ?? row.best_score), createdAt: row.ended_at || row.created_at || undefined })),
    ...level3Attempts.filter((row) => Number.isFinite(Number(row.total_score ?? row.best_score))).map((row) => ({ assessment: 'B1-1-exam', score: Number(row.total_score ?? row.best_score), createdAt: row.ended_at || row.created_at || undefined })),
  ].slice(0, 10);

  return {
    userId: user.id,
    name: profile?.full_name || metadata.full_name || 'الطالب',
    level,
    track,
    trackLabel: track === 'moroccan_darija' ? 'الدارجة المغربية' : 'العربية الفصحى',
    goal: profile?.learning_goal || metadata.learning_goal || '',
    interests: interestsOf(profile?.interests ?? metadata.interests),
    completedLessons,
    completedSections,
    currentLesson,
    currentSection: latestProgress?.section || undefined,
    learnedVocabulary,
    reviewNeeds: learnedVocabulary.slice(0, 20),
    assessmentResults,
    lastActivity: latestProgress ? { label: `${levelOf(latestProgress.level_code)} · الدرس ${Number(latestProgress.lesson_number || 1)} · ${String(latestProgress.section || '')}`, href: latestProgress.last_href || undefined, createdAt: latestProgress.updated_at || undefined } : undefined,
    previousTutorSummaries: tutorRows.map(mapTutorSummary),
  };
}
