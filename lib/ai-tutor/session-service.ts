import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_TUTOR_PREFERENCES, type TutorActivity, type TutorPreferences, type TutorSessionSummary, type TutorTranscriptEntry } from './types';

type DbClient = SupabaseClient;
const ACTIVITIES: TutorActivity[] = ['lesson_review', 'vocabulary', 'free_conversation', 'role_play', 'grammar', 'pronunciation'];

export class TutorSessionError extends Error {
  constructor(public code: string, public status: number) {
    super(code);
  }
}

export function isTutorActivity(value: unknown): value is TutorActivity {
  return typeof value === 'string' && ACTIVITIES.includes(value as TutorActivity);
}

export function sanitizeTranscript(value: unknown): TutorTranscriptEntry[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-80).flatMap((entry, index) => {
    if (!entry || (entry.role !== 'learner' && entry.role !== 'facilitator') || typeof entry.text !== 'string') return [];
    const text = entry.text.trim().slice(0, 2000);
    if (!text) return [];
    return [{
      id: typeof entry.id === 'string' ? entry.id.slice(0, 100) : `turn-${index}`,
      role: entry.role,
      text,
      createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : new Date().toISOString(),
      translation: typeof entry.translation === 'string' ? entry.translation.slice(0, 2000) : undefined,
      correction: entry.correction && typeof entry.correction === 'object' ? {
        original: String(entry.correction.original || '').slice(0, 1000),
        corrected: String(entry.correction.corrected || '').slice(0, 1000),
        explanation: typeof entry.correction.explanation === 'string' ? entry.correction.explanation.slice(0, 1000) : undefined,
      } : undefined,
    }];
  });
}

export async function startTutorSession(input: {
  supabase: DbClient;
  userId: string;
  level: string;
  track: string;
  activity: TutorActivity;
  lessonId?: string;
  preferences: TutorPreferences;
}) {
  const { supabase, userId } = input;
  const maxDurationMinutes = Math.max(5, Math.min(60, Number(process.env.AI_TUTOR_MAX_SESSION_MINUTES || 30)));
  const dailyLimit = Math.max(1, Number(process.env.AI_TUTOR_DAILY_SESSION_LIMIT || 20));
  const staleBefore = new Date(Date.now() - (maxDurationMinutes + 5) * 60_000).toISOString();
  await supabase.from('ai_tutor_sessions').update({ status: 'abandoned', ended_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('user_id', userId).eq('status', 'active').lt('started_at', staleBefore);
  const { data: active, error: activeError } = await supabase.from('ai_tutor_sessions').select('id,started_at').eq('user_id', userId).eq('status', 'active').limit(1).maybeSingle();
  if (activeError) throw new TutorSessionError(activeError.code === '42P01' ? 'TUTOR_MIGRATION_REQUIRED' : 'SESSION_LOOKUP_FAILED', 503);
  if (active) throw new TutorSessionError('ACTIVE_SESSION_EXISTS', 409);
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase.from('ai_tutor_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', dayStart.toISOString());
  if (Number(count || 0) >= dailyLimit) throw new TutorSessionError('DAILY_LIMIT_REACHED', 429);
  const row = {
    user_id: userId,
    learning_track: input.track,
    level_code: input.level,
    activity_type: input.activity,
    lesson_ids: input.lessonId ? [input.lessonId] : [],
    settings_snapshot: { ...input.preferences, allowAudioStorage: false },
  };
  const { data, error } = await supabase.from('ai_tutor_sessions').insert(row).select('id,started_at').single();
  if (error) {
    if (error.code === '23505') throw new TutorSessionError('ACTIVE_SESSION_EXISTS', 409);
    throw new TutorSessionError(error.code === '42P01' ? 'TUTOR_MIGRATION_REQUIRED' : 'SESSION_START_FAILED', 503);
  }
  return { id: String(data.id), startedAt: data.started_at, maxDurationMinutes };
}

export async function getActiveTutorSession(supabase: DbClient, userId: string, sessionId: string) {
  const { data, error } = await supabase.from('ai_tutor_sessions').select('id,activity_type,lesson_ids,started_at,status,settings_snapshot').eq('id', sessionId).eq('user_id', userId).eq('status', 'active').maybeSingle();
  if (error || !data) throw new TutorSessionError('SESSION_NOT_ACTIVE', 409);
  return data;
}

function stringList(value: unknown, max = 30) {
  return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean).slice(0, max) : [];
}

export async function finishTutorSession(input: {
  supabase: DbClient;
  userId: string;
  sessionId: string;
  summary: TutorSessionSummary;
  transcript: TutorTranscriptEntry[];
  saveSummary: boolean;
}) {
  const durationSeconds = Math.max(0, Math.min(3600, Math.floor(input.summary.durationSeconds || 0)));
  const update = input.saveSummary ? {
    status: 'completed',
    lesson_ids: stringList(input.summary.lessonIds),
    practiced_vocabulary_ids: stringList(input.summary.practicedVocabularyIds),
    practiced_vocabulary: stringList(input.summary.practicedVocabulary),
    new_vocabulary_ids: stringList(input.summary.newVocabularyIds),
    new_vocabulary: stringList(input.summary.newVocabulary),
    practiced_grammar_ids: stringList(input.summary.practicedGrammarIds),
    practiced_grammar: stringList(input.summary.practicedGrammar),
    important_corrections: input.summary.importantCorrections.slice(0, 4),
    strengths: stringList(input.summary.strengths, 5),
    review_needs: stringList(input.summary.reviewNeeds, 5),
    next_recommendation: input.summary.nextRecommendation?.slice(0, 1000) || null,
    transcript: input.transcript,
    duration_seconds: durationSeconds,
    ended_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } : {
    status: 'completed',
    duration_seconds: durationSeconds,
    ended_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { error } = await input.supabase.from('ai_tutor_sessions').update(update).eq('id', input.sessionId).eq('user_id', input.userId).eq('status', 'active');
  if (error) throw new TutorSessionError('SESSION_SAVE_FAILED', 503);
}

export async function abandonTutorSession(supabase: DbClient, userId: string, sessionId: string) {
  await supabase.from('ai_tutor_sessions').update({ status: 'abandoned', ended_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', sessionId).eq('user_id', userId).eq('status', 'active');
}

export async function saveTutorPreferences(supabase: DbClient, userId: string, value: Partial<TutorPreferences>) {
  const voice = typeof value.voice === 'string' && /^[a-z0-9_-]{2,30}$/i.test(value.voice) ? value.voice : DEFAULT_TUTOR_PREFERENCES.voice;
  const preferences: TutorPreferences = {
    voice,
    speed: value.speed === 'slow' ? 'slow' : 'normal',
    explanationLanguage: value.explanationLanguage === 'ar' || value.explanationLanguage === 'en' ? value.explanationLanguage : 'both',
    transcriptAuto: value.transcriptAuto !== false,
    correctionLevel: value.correctionLevel === 'important' || value.correctionLevel === 'detailed' ? value.correctionLevel : 'balanced',
    saveSummaries: value.saveSummaries !== false,
    allowAudioStorage: false,
  };
  const { error } = await supabase.from('ai_tutor_preferences').upsert({
    user_id: userId,
    voice: preferences.voice,
    speed: preferences.speed,
    explanation_language: preferences.explanationLanguage,
    transcript_auto: preferences.transcriptAuto,
    correction_level: preferences.correctionLevel,
    save_summaries: preferences.saveSummaries,
    allow_audio_storage: false,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw new TutorSessionError(error.code === '42P01' ? 'TUTOR_MIGRATION_REQUIRED' : 'PREFERENCES_SAVE_FAILED', 503);
  return preferences;
}
