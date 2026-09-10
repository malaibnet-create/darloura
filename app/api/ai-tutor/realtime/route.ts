import { createHash } from 'node:crypto';
import { createServerSupabaseClient } from '../../../../lib/supabase/server';
import { buildRealtimeContext, getTutorPreferences } from '../../../../lib/ai-tutor/context-service';
import { buildTutorInstructions } from '../../../../lib/ai-tutor/prompts';
import { getActiveTutorSession, isTutorActivity, TutorSessionError } from '../../../../lib/ai-tutor/session-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const allowedVoices = new Set(['marin', 'cedar', 'coral', 'alloy', 'ash', 'ballad', 'echo', 'sage', 'shimmer', 'verse']);

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return Response.json({ error: 'VOICE_SERVICE_NOT_CONFIGURED' }, { status: 503 });
    const sessionId = request.headers.get('x-tutor-session') || '';
    if (!sessionId) return Response.json({ error: 'SESSION_REQUIRED' }, { status: 409 });
    const sessionRow = await getActiveTutorSession(supabase, user.id, sessionId);
    const requestedActivity = request.headers.get('x-tutor-activity');
    const activity = isTutorActivity(requestedActivity) ? requestedActivity : isTutorActivity(sessionRow.activity_type) ? sessionRow.activity_type : 'free_conversation';
    const requestedLesson = request.headers.get('x-tutor-lesson') || (Array.isArray(sessionRow.lesson_ids) ? sessionRow.lesson_ids[0] : undefined);
    const scenario = (request.headers.get('x-tutor-scenario') || '').slice(0, 160);
    const sdp = await request.text();
    if (!sdp || sdp.length > 100_000 || !sdp.startsWith('v=')) return Response.json({ error: 'INVALID_SDP' }, { status: 400 });

    const [context, preferences] = await Promise.all([
      buildRealtimeContext(supabase, user, { activity, lessonId: requestedLesson, query: scenario }),
      getTutorPreferences(supabase, user.id),
    ]);
    const instructions = buildTutorInstructions({ student: context.snapshot, curriculum: context.curriculum, activity, scenario, preferences });
    const configuredVoice = preferences.voice || process.env.OPENAI_REALTIME_VOICE || 'marin';
    const voice = allowedVoices.has(configuredVoice) ? configuredVoice : 'marin';
    const realtimeSession = {
      type: 'realtime',
      model: process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime',
      output_modalities: ['audio'],
      instructions,
      audio: {
        input: {
          format: { type: 'audio/pcm', rate: 24000 },
          transcription: { model: process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe', language: 'ar' },
          turn_detection: { type: 'semantic_vad', create_response: true, interrupt_response: true },
        },
        output: { format: { type: 'audio/pcm' }, voice },
      },
    };

    const form = new FormData();
    form.set('sdp', sdp);
    form.set('session', JSON.stringify(realtimeSession));
    const salt = process.env.OPENAI_SAFETY_SALT || 'darlugha';
    const safetyId = createHash('sha256').update(`${salt}:${user.id}`).digest('hex');
    const upstream = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'OpenAI-Safety-Identifier': safetyId },
      body: form,
    });
    const payload = await upstream.text();
    if (!upstream.ok) {
      console.error('AI tutor realtime failed', upstream.status, payload.slice(0, 300));
      return Response.json({ error: upstream.status === 429 ? 'VOICE_LIMIT_REACHED' : upstream.status === 401 ? 'VOICE_KEY_INVALID' : 'VOICE_SESSION_FAILED' }, { status: 502 });
    }
    return new Response(payload, { status: 200, headers: { 'Content-Type': 'application/sdp', 'Cache-Control': 'private, no-store, max-age=0' } });
  } catch (error) {
    if (error instanceof TutorSessionError) return Response.json({ error: error.code }, { status: error.status });
    console.error('AI tutor realtime route error', error instanceof Error ? error.message : 'unknown');
    return Response.json({ error: 'VOICE_SESSION_FAILED' }, { status: 500 });
  }
}
