import { createServerSupabaseClient } from '../../../../lib/supabase/server';
import { buildRealtimeContext, getTutorPreferences } from '../../../../lib/ai-tutor/context-service';
import { createTutorSummary } from '../../../../lib/ai-tutor/openai-service';
import { getStudentLearningSnapshot } from '../../../../lib/ai-tutor/student-profile-service';
import { abandonTutorSession, finishTutorSession, getActiveTutorSession, isTutorActivity, sanitizeTranscript, startTutorSession, TutorSessionError } from '../../../../lib/ai-tutor/session-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function authenticated() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

export async function POST(request: Request) {
  const auth = await authenticated();
  if (!auth) return Response.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (!isTutorActivity(body.activity)) return Response.json({ error: 'INVALID_ACTIVITY' }, { status: 400 });
  try {
    const [student, preferences] = await Promise.all([
      getStudentLearningSnapshot(auth.supabase, auth.user),
      getTutorPreferences(auth.supabase, auth.user.id),
    ]);
    const session = await startTutorSession({ supabase: auth.supabase, userId: auth.user.id, level: student.level, track: student.track, activity: body.activity, lessonId: typeof body.lessonId === 'string' ? body.lessonId : undefined, preferences });
    return Response.json({ session });
  } catch (error) {
    const known = error instanceof TutorSessionError ? error : new TutorSessionError('SESSION_START_FAILED', 500);
    return Response.json({ error: known.code }, { status: known.status });
  }
}

export async function PATCH(request: Request) {
  const auth = await authenticated();
  if (!auth) return Response.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  if (!sessionId) return Response.json({ error: 'SESSION_REQUIRED' }, { status: 400 });
  if (body.action === 'abandon') {
    await abandonTutorSession(auth.supabase, auth.user.id, sessionId);
    return Response.json({ ok: true });
  }
  try {
    const active = await getActiveTutorSession(auth.supabase, auth.user.id, sessionId);
    const activity = isTutorActivity(active.activity_type) ? active.activity_type : 'free_conversation';
    const lessonIds = Array.isArray(active.lesson_ids) ? active.lesson_ids.map(String) : [];
    const transcript = sanitizeTranscript(body.transcript);
    const context = await buildRealtimeContext(auth.supabase, auth.user, { activity, lessonId: lessonIds[0], query: transcript.map((turn) => turn.text).join(' ').slice(0, 1200) });
    const summary = await createTutorSummary({ sessionId, student: context.snapshot, activity, lessonIds: lessonIds.length ? lessonIds : context.selectedLessonId ? [context.selectedLessonId] : [], durationSeconds: Number(body.durationSeconds || 0), transcript, curriculum: context.curriculum });
    const preferences = await getTutorPreferences(auth.supabase, auth.user.id);
    await finishTutorSession({ supabase: auth.supabase, userId: auth.user.id, sessionId, summary, transcript, saveSummary: preferences.saveSummaries });
    return Response.json({ summary });
  } catch (error) {
    const known = error instanceof TutorSessionError ? error : new TutorSessionError('SESSION_SAVE_FAILED', 500);
    return Response.json({ error: known.code }, { status: known.status });
  }
}
