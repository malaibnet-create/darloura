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

const RECOVERY_UNTIL_KEY = 'darlugha-recovery-resend-until';

export default function ResetPasswordPage() {
  const requestInFlight = useRef(false);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'error' | 'success'>('error');
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const queryEmail = new URLSearchParams(window.location.search).get('email') || '';
      setEmail(normalizeEmail(window.sessionStorage.getItem('darlugha-pending-recovery-email') || queryEmail));
      setResendIn(remainingCooldownSeconds(window.sessionStorage.getItem(RECOVERY_UNTIL_KEY)));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestInFlight.current || !isEmailOtpReady(token)) return;

    requestInFlight.current = true;
    setLoading(true);
    setMessage('');
    setMessageKind('error');

    try {
      const { error } = await createClient().auth.verifyOtp({
        email: normalizeEmail(email),
        token: normalizeEmailOtp(token),
        type: 'recovery',
      });
      if (error) {
        setMessage(authRequestErrorMessage(error, 'The recovery code is incorrect or has expired. Request a new code and try again.'));
        return;
      }
      setConfirmed(true);
    } catch {
      setMessage('We could not connect to the verification service. Check your internet connection and try again.');
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestInFlight.current) return;
    if (password.length < 6) {
      setMessageKind('error');
      setMessage('Your password must contain at least 6 characters.');
      return;
    }
    if (password !== passwordConfirmation) {
      setMessageKind('error');
      setMessage('The passwords do not match.');
      return;
    }

    requestInFlight.current = true;
    setLoading(true);
    setMessage('');
    setMessageKind('error');

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage('We could not change your password. Make sure it contains at least 6 characters.');
        return;
      }

      await supabase.auth.signOut();
      window.sessionStorage.removeItem('darlugha-pending-recovery-email');
      window.sessionStorage.removeItem(RECOVERY_UNTIL_KEY);
      router.replace('/login?password=updated');
    } catch {
      setMessage('We could not connect to the account service. Please try again.');
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
      const { error } = await createClient().auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setMessage(authRequestErrorMessage(error, 'We could not send a new recovery code. Please try again.'));
        return;
      }

      const resendUntil = Date.now() + AUTH_REQUEST_COOLDOWN_SECONDS * 1000;
      window.sessionStorage.setItem('darlugha-pending-recovery-email', normalizedEmail);
      window.sessionStorage.setItem(RECOVERY_UNTIL_KEY, String(resendUntil));
      setToken('');
      setResendIn(AUTH_REQUEST_COOLDOWN_SECONDS);
      setMessageKind('success');
      setMessage('A new recovery code has been sent to your email address.');
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
        <div className="eyebrow">SECURE ACCOUNT RECOVERY</div>
        <h1>{confirmed ? 'Choose a new password' : 'Enter your recovery code'}</h1>
        {!confirmed ? (
          <>
            <p id="recovery-code-help">Enter the complete {EMAIL_OTP_LENGTH}-digit code sent to your email address.</p>
            <form onSubmit={verify}>
              <label>
                Email address
                <input type="email" dir="ltr" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(normalizeEmail(event.target.value))} required />
              </label>
              <label>
                Recovery code
                <input
                  className="auth-code"
                  aria-describedby="recovery-code-help"
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
              <button className="button" type="submit" disabled={loading || !isEmailOtpReady(token)}>{loading ? 'Verifying…' : 'Verify code'}</button>
              {message && <p className={messageKind === 'success' ? 'auth-success' : 'auth-error'} role={messageKind === 'success' ? 'status' : 'alert'}>{message}</p>}
            </form>
            <button className="review-button" type="button" disabled={resendIn > 0 || loading} onClick={resend}>
              {resendIn > 0 ? `Send a new code in ${resendIn}s` : 'Send a new code'}
            </button>
            <Link className="link back-link" href="/forgot-password">Use a different email address</Link>
          </>
        ) : (
          <form onSubmit={savePassword}>
            <label>
              New password
              <input type="password" dir="ltr" minLength={6} autoComplete="new-password" placeholder="At least 6 characters" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
            <label>
              Confirm new password
              <input type="password" dir="ltr" minLength={6} autoComplete="new-password" placeholder="Enter the new password again" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} required />
            </label>
            <button className="button" type="submit" disabled={loading || password.length < 6 || password !== passwordConfirmation}>{loading ? 'Saving…' : 'Save new password'}</button>
            {message && <p className="auth-error" role="alert">{message}</p>}
          </form>
        )}
      </section>
    </main>
  );
}
