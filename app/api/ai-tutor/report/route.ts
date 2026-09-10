import { createServerSupabaseClient } from '../../../../lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1000) : '';
  if (!message) return Response.json({ error: 'MESSAGE_REQUIRED' }, { status: 400 });
  const { error } = await supabase.from('ai_tutor_reports').insert({ user_id: user.id, session_id: typeof body.sessionId === 'string' ? body.sessionId : null, category: typeof body.category === 'string' ? body.category.slice(0, 40) : 'answer', message });
  if (error) return Response.json({ error: error.code === '42P01' ? 'TUTOR_MIGRATION_REQUIRED' : 'REPORT_FAILED' }, { status: 503 });
  return Response.json({ ok: true });
}
