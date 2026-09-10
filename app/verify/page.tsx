'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
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

const RESEND_SECONDS = AUTH_REQUEST_COOLDOWN_SECONDS;
const RESEND_UNTIL_KEY = 'darlugha-signup-resend-until';

export default function VerifyPage() {
  const requestInFlight = useRef(false);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState<number>(RESEND_SECONDS);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      let pending: { email?: string; name?: string } = {};
      try {
        pending = JSON.parse(window.sessionStorage.getItem('darlugha-pending-signup') || '{}');
      } catch { /* Allow the student to enter the email manually. */ }
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
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: normalizeEmailOtp(token),
        type: 'email',
      });
      if (error) {
        setMessage(authRequestErrorMessage(error, 'الرمز غير صحيح أو انتهت صلاحيته.'));
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
      setMessage('تعذر الاتصال بخدمة التحقق. تحقق من الإنترنت وحاول مرة أخرى.');
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
    try {
      const normalizedEmail = normalizeEmail(email);
      const { error } = await createClient().auth.resend({ type: 'signup', email: normalizedEmail });
      if (error) {
        setMessage(authRequestErrorMessage(error, 'تعذر إرسال رمز جديد.'));
        return;
      }
      const resendUntil = Date.now() + RESEND_SECONDS * 1000;
      window.sessionStorage.setItem(RESEND_UNTIL_KEY, String(resendUntil));
      window.sessionStorage.setItem('darlugha-pending-signup', JSON.stringify({ email: normalizedEmail, name }));
      setResendIn(RESEND_SECONDS);
      setMessage('أرسلنا رمزًا جديدًا إلى بريدك الإلكتروني.');
    } catch {
      setMessage('تعذر الاتصال بخدمة البريد الآن. حاول مرة أخرى.');
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  }

  return <main className="shell"><section className="auth-page">
    <div className="eyebrow">تحقق آمن</div>
    <h1>تحقق من بريدك.</h1>
    <p>أدخل رمز التحقق المكوّن من {EMAIL_OTP_LENGTH} أرقام الذي أرسلناه إلى بريدك.</p>
    <form onSubmit={submit}>
      <input type="email" dir="ltr" aria-label="البريد الإلكتروني" placeholder="البريد الإلكتروني" value={email} onChange={(event) => setEmail(normalizeEmail(event.target.value))} required />
      <input aria-label="رمز التحقق" inputMode="numeric" autoComplete="one-time-code" maxLength={EMAIL_OTP_LENGTH} placeholder="000000" value={token} onChange={(event) => setToken(normalizeEmailOtp(event.target.value))} required />
      <button className="button" disabled={loading || !isEmailOtpReady(token)}>{loading ? 'جارٍ التحقق...' : 'تأكيد البريد الإلكتروني'}</button>
      {message && <p role="status">{message}</p>}
    </form>
    <button className="review-button" type="button" disabled={resendIn > 0 || loading} onClick={resend}>{resendIn > 0 ? `إعادة الإرسال بعد ${resendIn} ثانية` : 'إرسال رمز جديد'}</button>
  </section></main>;
}
