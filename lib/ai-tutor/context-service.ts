import 'server-only';

import type { SupabaseClient, User } from '@supabase/supabase-js';
import { listCurriculumLessons, retrieveCurriculum } from './curriculum-service';
import { getStudentLearningSnapshot } from './student-profile-service';
import { DEFAULT_TUTOR_PREFERENCES, type TutorActivity, type TutorPageContext, type TutorPreferences } from './types';

type DbClient = SupabaseClient;

export async function getTutorPreferences(supabase: DbClient, userId: string): Promise<TutorPreferences> {
  try {
    const { data, error } = await supabase.from('ai_tutor_preferences').select('*').eq('user_id', userId).maybeSingle();
    if (error || !data) return DEFAULT_TUTOR_PREFERENCES;
    return {
      voice: data.voice || DEFAULT_TUTOR_PREFERENCES.voice,
      speed: data.speed === 'slow' ? 'slow' : 'normal',
      explanationLanguage: ['ar', 'en', 'both'].includes(data.explanation_language) ? data.explanation_language : 'both',
      transcriptAuto: data.transcript_auto !== false,
      correctionLevel: ['important', 'balanced', 'detailed'].includes(data.correction_level) ? data.correction_level : 'balanced',
      saveSummaries: data.save_summaries !== false,
      allowAudioStorage: false,
    };
  } catch {
    return DEFAULT_TUTOR_PREFERENCES;
  }
}

export async function getSessionsRemainingToday(supabase: DbClient, userId: string) {
  const dailyLimit = Math.max(1, Number(process.env.AI_TUTOR_DAILY_SESSION_LIMIT || 20));
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  try {
    const { count, error } = await supabase.from('ai_tutor_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', start.toISOString());
    if (error) return dailyLimit;
    return Math.max(0, dailyLimit - Number(count || 0));
  } catch {
    return dailyLimit;
  }
}

export async function buildTutorPageContext(supabase: DbClient, user: User): Promise<TutorPageContext> {
  const [snapshot, preferences, sessionsRemainingToday] = await Promise.all([
    getStudentLearningSnapshot(supabase, user),
    getTutorPreferences(supabase, user.id),
    getSessionsRemainingToday(supabase, user.id),
  ]);
  const availableLessons = listCurriculumLessons(snapshot.track);
  const reviewLesson = snapshot.currentLesson || snapshot.completedLessons.at(-1) || availableLessons[0]?.id;
  const suggestions: TutorPageContext['suggestions'] = [
    { activity: 'lesson_review', titleAr: 'راجع آخر درس', titleEn: 'Review your latest lesson', reasonAr: reviewLesson ? `سنراجع محتوى ${reviewLesson} من المنصة.` : 'ابدأ بمراجعة قصيرة لتحديد ما تحتاج إليه.' },
    { activity: 'vocabulary', titleAr: 'راجع كلماتك', titleEn: 'Review vocabulary', reasonAr: snapshot.reviewNeeds.length ? `لديك ${snapshot.reviewNeeds.length} عناصر في قائمة المراجعة.` : 'سنختار كلمات من الدرس المتاح.' },
    { activity: 'free_conversation', titleAr: 'محادثة مناسبة لمستواك', titleEn: 'Level-based conversation', reasonAr: `المحادثة ستكون بمستوى ${snapshot.level} وفي مسار ${snapshot.trackLabel}.` },
  ];
  return {
    name: snapshot.name,
    level: snapshot.level,
    track: snapshot.track,
    trackLabel: snapshot.trackLabel,
    goal: snapshot.goal,
    interests: snapshot.interests,
    completedLessons: snapshot.completedLessons,
    completedSections: snapshot.completedSections,
    currentLesson: snapshot.currentLesson,
    currentSection: snapshot.currentSection,
    learnedVocabulary: snapshot.learnedVocabulary,
    reviewNeeds: snapshot.reviewNeeds,
    assessmentResults: snapshot.assessmentResults,
    lastActivity: snapshot.lastActivity,
    previousTutorSummaries: snapshot.previousTutorSummaries,
    availableLessons,
    suggestions,
    preferences,
    limits: { maxDurationMinutes: Math.max(5, Number(process.env.AI_TUTOR_MAX_SESSION_MINUTES || 30)), sessionsRemainingToday },
  };
}

export async function buildRealtimeContext(supabase: DbClient, user: User, input: { activity: TutorActivity; lessonId?: string; query?: string }) {
  const snapshot = await getStudentLearningSnapshot(supabase, user);
  const allowedLessons = new Set([...(snapshot.completedLessons || []), snapshot.currentLesson].filter(Boolean) as string[]);
  const fallbackLesson = snapshot.currentLesson || snapshot.completedLessons.at(-1) || listCurriculumLessons(snapshot.track)[0]?.id;
  const requestedLesson = input.lessonId && allowedLessons.has(input.lessonId) ? input.lessonId : fallbackLesson;
  const curriculum = retrieveCurriculum({ level: snapshot.level, track: snapshot.track, activity: input.activity, lessonIds: requestedLesson ? [requestedLesson] : [], query: input.query, limit: 20 });
  return { snapshot, curriculum, selectedLessonId: requestedLesson };
}
