import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/login?auth=missing-code', url.origin));

  try {
    const { error } = await (await createServerSupabaseClient()).auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL('/login?auth=callback-error', url.origin));
  } catch {
    return NextResponse.redirect(new URL('/login?auth=callback-error', url.origin));
  }

  return NextResponse.redirect(new URL('/welcome', url.origin));
}
