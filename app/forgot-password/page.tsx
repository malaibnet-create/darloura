'use client';

import { FormEvent, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import {
  AUTH_REQUEST_COOLDOWN_SECONDS,
  authRequestErrorMessage,
  normalizeEmail,
  remainingCooldownSeconds,
} from '../../lib/auth/otp.mjs';

const RECOVERY_UNTIL_KEY = 'darlugha-recovery-resend-until';

export default function ForgotPasswordPage() {
  const requestInFlight = useRef(false);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestInFlight.current) return;

    const remaining = remainingCooldownSeconds(window.sessionStorage.getItem(RECOVERY_UNTIL_KEY));
    if (remaining > 0) {
      setError(`Please wait ${remaining} seconds before requesting another code.`);
      return;
    }

    requestInFlight.current = true;
    setLoading(true);
    setError('');
    const normalizedEmail = normalizeEmail(email);

    try {
      const { error: resetError } = await createClient().auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) {
        setError(authRequestErrorMessage(resetError, 'We could not send a recovery code. Check the email address and try again.'));
        return;
      }

      const resendUntil = Date.now() + AUTH_REQUEST_COOLDOWN_SECONDS * 1000;
      window.sessionStorage.setItem('darlugha-pending-recovery-email', normalizedEmail);
      window.sessionStorage.setItem(RECOVERY_UNTIL_KEY, String(resendUntil));
      router.push('/reset-password');
    } catch {
      setError('We could not connect to the email service. Check your internet connection and try again.');
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  }

  return (
    <main className="shell" lang="en" dir="ltr">
      <section className="auth-page auth-ltr">
        <Link className="brand brand-centered" href="/" aria-label="DarLugha home">
          <span className="brand-mark">ع</span><span>Dar<span>Lugha</span></span>
        </Link>
        <div className="eyebrow">ACCOUNT RECOVERY</div>
        <h1>Forgot your password?</h1>
        <p>Enter your email address and we will send you a code to create a new password.</p>
        <form onSubmit={submit}>
          <label>
            Email address
            <input type="email" dir="ltr" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <button className="button" type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send recovery code'}</button>
          {error && <p className="auth-error" role="alert">{error}</p>}
        </form>
        <Link className="link back-link" href="/login">Back to sign in</Link>
      </section>
    </main>
  );
}
