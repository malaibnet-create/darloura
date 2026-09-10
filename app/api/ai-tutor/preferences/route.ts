import { createServerSupabaseClient } from '../../../../lib/supabase/server';
import { getTutorPreferences } from '../../../../lib/ai-tutor/context-service';
import { saveTutorPreferences, TutorSessionError } from '../../../../lib/ai-tutor/session-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
  return Response.json({ preferences: await getTutorPreferences(supabase, user.id) });
}

export async function PATCH(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  try {
    return Response.json({ preferences: await saveTutorPreferences(supabase, user.id, body) });
  } catch (error) {
    const known = error instanceof TutorSessionError ? error : new TutorSessionError('PREFERENCES_SAVE_FAILED', 500);
    return Response.json({ error: known.code }, { status: known.status });
  }
}
