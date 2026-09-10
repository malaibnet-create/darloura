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
    setLoading(true); setMessage('');
    try {
      const { error } = await createClient().auth.verifyOtp({
        email: normalizeEmail(email),
        token: normalizeEmailOtp(token),
        type: 'recovery',
      });
      if (error) {
        setMessage(authRequestErrorMessage(error, 'الرمز غير صحيح أو انتهت صلاحيته. اطلب رمزًا جديدًا وحاول مرة أخرى.'));
        return;
      }
      setConfirmed(true);
    } catch {
      setMessage('تعذر الاتصال بخدمة التحقق. تحقق من الإنترنت وحاول مرة أخرى.');
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestInFlight.current) return;
    if (password !== passwordConfirmation) {
      setMessage('كلمتا المرور غير متطابقتين.');
      return;
    }
    requestInFlight.current = true;
    setLoading(true); setMessage('');
    try {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) {
        setMessage('تعذر تغيير كلمة المرور. تأكد من أنها تحتوي على 6 أحرف على الأقل.');
        return;
      }
      window.sessionStorage.removeItem('darlugha-pending-recovery-email');
      window.sessionStorage.removeItem(RECOVERY_UNTIL_KEY);
      router.replace('/login?password=updated');
    } catch {
      setMessage('تعذر الاتصال بالخادم. حاول مرة أخرى.');
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
      const { error } = await createClient().auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setMessage(authRequestErrorMessage(error, 'تعذر إرسال رمز جديد.'));
        return;
      }
      const resendUntil = Date.now() + AUTH_REQUEST_COOLDOWN_SECONDS * 1000;
      window.sessionStorage.setItem('darlugha-pending-recovery-email', normalizedEmail);
      window.sessionStorage.setItem(RECOVERY_UNTIL_KEY, String(resendUntil));
      setResendIn(AUTH_REQUEST_COOLDOWN_SECONDS);
      setMessage('أرسلنا رمز استعادة جديدًا إلى بريدك الإلكتروني.');
    } catch {
      setMessage('تعذر الاتصال بخدمة البريد الآن. حاول مرة أخرى.');
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  }

  return <main className="shell"><section className="auth-page"><div className="eyebrow">استعادة آمنة</div><h1>{confirmed ? 'اختر كلمة مرور جديدة' : 'أدخل رمز الاستعادة'}</h1>{!confirmed ? <><p>أدخل رمز الاستعادة المكوّن من {EMAIL_OTP_LENGTH} أرقام.</p><form onSubmit={verify}><input type="email" dir="ltr" aria-label="البريد الإلكتروني" placeholder="البريد الإلكتروني" value={email} onChange={event => setEmail(normalizeEmail(event.target.value))} required /><input aria-label="رمز الاستعادة" inputMode="numeric" autoComplete="one-time-code" maxLength={EMAIL_OTP_LENGTH} placeholder="000000" value={token} onChange={event => setToken(normalizeEmailOtp(event.target.value))} required /><button className="button" disabled={loading || !isEmailOtpReady(token)}>{loading ? 'جارٍ التحقق...' : 'تحقق من الرمز'}</button>{message && <p role="alert">{message}</p>}</form><button className="review-button" type="button" disabled={resendIn > 0 || loading} onClick={resend}>{resendIn > 0 ? `إعادة الإرسال بعد ${resendIn} ثانية` : 'إرسال رمز جديد'}</button><Link className="link" href="/forgot-password">استخدام بريد آخر</Link></> : <form onSubmit={savePassword}><input type="password" minLength={6} autoComplete="new-password" aria-label="كلمة المرور الجديدة" placeholder="كلمة المرور الجديدة" value={password} onChange={event => setPassword(event.target.value)} required /><input type="password" minLength={6} autoComplete="new-password" aria-label="تأكيد كلمة المرور الجديدة" placeholder="أعد كتابة كلمة المرور الجديدة" value={passwordConfirmation} onChange={event => setPasswordConfirmation(event.target.value)} required /><button className="button" disabled={loading || password.length < 6 || password !== passwordConfirmation}>{loading ? 'جارٍ الحفظ...' : 'حفظ كلمة المرور'}</button>{message && <p role="alert">{message}</p>}</form>}</section></main>;
}
