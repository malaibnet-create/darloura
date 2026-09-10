import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase/server';
import { buildRealtimeContext, buildTutorPageContext, getTutorPreferences } from '../../../lib/ai-tutor/context-service';
import { runTutorTextTurn } from '../../../lib/ai-tutor/openai-service';
import { buildTutorInstructions } from '../../../lib/ai-tutor/prompts';
import { getActiveTutorSession, isTutorActivity } from '../../../lib/ai-tutor/session-service';

export const dynamic = 'force-dynamic';

async function authenticated() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

export async function GET() {
  const auth = await authenticated();
  if (!auth) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
  const context = await buildTutorPageContext(auth.supabase, auth.user);
  return NextResponse.json(context, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request) {
  const auth = await authenticated();
  if (!auth) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'VOICE_SERVICE_NOT_CONFIGURED' }, { status: 503 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 2000) : '';
  const activity = isTutorActivity(body.activity) ? body.activity : 'free_conversation';
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  if (!message) return NextResponse.json({ error: 'MESSAGE_REQUIRED' }, { status: 400 });
  if (!sessionId) return NextResponse.json({ error: 'SESSION_REQUIRED' }, { status: 409 });
  try {
    await getActiveTutorSession(auth.supabase, auth.user.id, sessionId);
    const [context, preferences] = await Promise.all([
      buildRealtimeContext(auth.supabase, auth.user, { activity, lessonId: typeof body.lessonId === 'string' ? body.lessonId : undefined, query: message }),
      getTutorPreferences(auth.supabase, auth.user.id),
    ]);
    const instructions = buildTutorInstructions({ student: context.snapshot, curriculum: context.curriculum, activity, scenario: typeof body.scenario === 'string' ? body.scenario : undefined, preferences });
    const history = Array.isArray(body.history) ? body.history.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const candidate = item as Record<string, unknown>;
      if ((candidate.role !== 'user' && candidate.role !== 'assistant') || typeof candidate.content !== 'string') return [];
      const role: 'user' | 'assistant' = candidate.role;
      return [{ role, content: candidate.content.slice(0, 2000) }];
    }).slice(-12) : [];
    const reply = await runTutorTextTurn({ instructions, message, history });
    if (!reply) return NextResponse.json({ error: 'EMPTY_TUTOR_RESPONSE' }, { status: 502 });
    return NextResponse.json({ reply });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'TUTOR_TEXT_FAILED';
    const status = code === 'OPENAI_LIMIT_REACHED' ? 429 : code === 'SESSION_NOT_ACTIVE' ? 409 : 502;
    return NextResponse.json({ error: code }, { status });
  }
}
