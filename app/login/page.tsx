'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { authRequestErrorMessage, normalizeEmail } from '../../lib/auth/otp.mjs';

export default function LoginPage() {
  const requestInFlight = useRef(false);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('password') === 'updated') {
        setSuccess('Your password has been updated. You can now sign in.');
      }
      if (params.get('auth') === 'missing-code') {
        setMessage('This authentication link is incomplete. Please sign in or request a new verification code.');
      }
      if (params.get('auth') === 'callback-error') {
        setMessage('This authentication link is invalid or has expired. Please request a new code and try again.');
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setLoading(true);
    setMessage('');
    setSuccess('');

    try {
      const { error } = await createClient().auth.signInWithPassword({
        email: normalizeEmail(email),
        password,
      });
      if (error) {
        setMessage(authRequestErrorMessage(error, 'The email address or password is incorrect.'));
        return;
      }

      const requested = new URLSearchParams(window.location.search).get('next');
      const destination = requested?.startsWith('/') && !requested.startsWith('//') ? requested : '/dashboard';
      router.push(destination);
    } catch {
      setMessage('We could not connect to the sign-in service. Check your internet connection and try again.');
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
        <div className="eyebrow">WELCOME BACK</div>
        <h1>Sign in and continue learning.</h1>
        <p>Your next Arabic lesson is waiting for you.</p>
        <form onSubmit={submit}>
          <label>
            Email address
            <input type="email" dir="ltr" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" dir="ltr" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          <Link className="link forgot-link" href="/forgot-password">Forgot your password?</Link>
          <button className="button" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
          {success && <p className="auth-success" role="status">{success}</p>}
          {message && <p className="auth-error" role="alert">{message}</p>}
        </form>
        <p className="switch-text">New to DarLugha? <Link className="link" href="/signup">Create an account</Link></p>
        <Link className="link back-link" href="/">Back to home</Link>
      </section>
    </main>
  );
}
