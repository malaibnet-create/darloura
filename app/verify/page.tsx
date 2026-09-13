'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import {
  AUTH_REQUEST_COOLDOWN_SECONDS,
  EMAIL_OTP_LENGTH,
  authRequestErrorMessage,
  isEmailOtpReady,
  normalizeEmail,
  normalizeEmailOtp,
  remainingCooldownSeconds,
} from '../../lib/auth/otp.mjs';

const RESEND_UNTIL_KEY = 'darlugha-signup-resend-until';

export default function VerifyPage() {
  const requestInFlight = useRef(false);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'error' | 'success'>('error');
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      let pending: { email?: string; name?: string } = {};
      try {
        pending = JSON.parse(window.sessionStorage.getItem('darlugha-pending-signup') || '{}');
      } catch {
        // The email field remains editable if stored signup data is unavailable.
      }
      setEmail(normalizeEmail(pending.email || params.get('email') || ''));
      setName(pending.name || params.get('name') || '');
      setResendIn(remainingCooldownSeconds(window.sessionStorage.getItem(RESEND_UNTIL_KEY)));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestInFlight.current || !isEmailOtpReady(token)) return;

    const normalizedEmail = normalizeEmail(email);
    requestInFlight.current = true;
    setLoading(true);
    setMessage('');
    setMessageKind('error');

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: normalizeEmailOtp(token),
        type: 'email',
      });

      if (error) {
        setMessage(authRequestErrorMessage(error, 'The verification code is incorrect or has expired. Request a new code and try again.'));
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const metadata = user.user_metadata || {};
        await supabase.from('profiles').upsert({
          id: user.id,
          full_name: name || metadata.full_name || '',
          age: metadata.age ?? null,
          started_learning: metadata.started_learning ?? null,
          arabic_track: metadata.arabic_track || 'الفصحى',
          learning_goal: metadata.learning_goal ?? null,
          interests: metadata.interests ? [metadata.interests] : [],
        });
      }

      window.sessionStorage.removeItem('darlugha-pending-signup');
      window.sessionStorage.removeItem(RESEND_UNTIL_KEY);
      router.replace('/welcome');
    } catch {
      setMessage('We could not connect to the verification service. Check your internet connection and try again.');
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  }

  async function resend() {
    if (!email || resendIn > 0 || loading || requestInFlight.current) return;

    requestInFlight.current = true;
    setLoading(true);
    setMessage('');
    setMessageKind('error');

    try {
      const normalizedEmail = normalizeEmail(email);
      const { error } = await createClient().auth.resend({ type: 'signup', email: normalizedEmail });
      if (error) {
        setMessage(authRequestErrorMessage(error, 'We could not send a new verification code. Please try again.'));
        return;
      }

      const resendUntil = Date.now() + AUTH_REQUEST_COOLDOWN_SECONDS * 1000;
      window.sessionStorage.setItem(RESEND_UNTIL_KEY, String(resendUntil));
      window.sessionStorage.setItem('darlugha-pending-signup', JSON.stringify({ email: normalizedEmail, name }));
      setResendIn(AUTH_REQUEST_COOLDOWN_SECONDS);
      setMessageKind('success');
      setMessage('A new verification code has been sent to your email address.');
    } catch {
      setMessage('We could not connect to the email service. Please try again.');
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  }

  return (
    <main className="shell" lang="en" dir="ltr">
      <section className="auth-page auth-ltr">
        <div className="eyebrow">SECURE VERIFICATION</div>
        <h1>Check your email.</h1>
        <p id="verification-code-help">Enter the complete {EMAIL_OTP_LENGTH}-digit code we sent to your email address.</p>
        <form onSubmit={submit}>
          <label>
            Email address
            <input type="email" dir="ltr" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(normalizeEmail(event.target.value))} required />
          </label>
          <label>
            Verification code
            <input
              className="auth-code"
              aria-describedby="verification-code-help"
              inputMode="numeric"
              autoComplete="one-time-code"
              minLength={EMAIL_OTP_LENGTH}
              maxLength={EMAIL_OTP_LENGTH}
              pattern={`[0-9]{${EMAIL_OTP_LENGTH}}`}
              placeholder={'0'.repeat(EMAIL_OTP_LENGTH)}
              value={token}
              onChange={(event) => setToken(normalizeEmailOtp(event.target.value))}
              required
            />
          </label>
          <button className="button" type="submit" disabled={loading || !isEmailOtpReady(token)}>{loading ? 'Verifying…' : 'Verify email'}</button>
          {message && <p className={messageKind === 'success' ? 'auth-success' : 'auth-error'} role={messageKind === 'success' ? 'status' : 'alert'}>{message}</p>}
        </form>
        <button className="review-button" type="button" disabled={resendIn > 0 || loading} onClick={resend}>
          {resendIn > 0 ? `Send a new code in ${resendIn}s` : 'Send a new code'}
        </button>
        <Link className="link back-link" href="/signup">Back to account creation</Link>
      </section>
    </main>
  );
}
