import { createServerSupabaseClient } from '../../../../lib/supabase/server';
import { tutorMessageAssist } from '../../../../lib/ai-tutor/openai-service';

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const action = body.action === 'correct' ? 'correct' : body.action === 'translate' ? 'translate' : null;
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, 2000) : '';
  if (!action || !text) return Response.json({ error: 'INVALID_REQUEST' }, { status: 400 });
  try {
    return Response.json(await tutorMessageAssist(action, text, body.language === 'ar' || body.language === 'en' ? body.language : 'both'));
  } catch (error) {
    const code = error instanceof Error ? error.message : 'ASSIST_FAILED';
    return Response.json({ error: code }, { status: code === 'OPENAI_LIMIT_REACHED' ? 429 : 502 });
  }
}
