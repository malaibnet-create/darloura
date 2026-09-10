'use client';

import { FormEvent, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/client';
import { useRouter } from 'next/navigation';
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
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestInFlight.current) return;
    const remaining = remainingCooldownSeconds(window.sessionStorage.getItem(RECOVERY_UNTIL_KEY));
    if (remaining > 0) {
      setError(`انتظر ${remaining} ثانية قبل طلب رمز جديد.`);
      return;
    }
    requestInFlight.current = true;
    setLoading(true); setMessage(''); setError('');
    const normalizedEmail = normalizeEmail(email);
    try {
      const { error: resetError } = await createClient().auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) {
        setError(authRequestErrorMessage(resetError, 'تعذر إرسال الرمز. تحقق من البريد وإعدادات Supabase.'));
        return;
      }
      const resendUntil = Date.now() + AUTH_REQUEST_COOLDOWN_SECONDS * 1000;
      window.sessionStorage.setItem('darlugha-pending-recovery-email', normalizedEmail);
      window.sessionStorage.setItem(RECOVERY_UNTIL_KEY, String(resendUntil));
      setMessage('تم إرسال رمز استعادة كلمة المرور إلى بريدك الإلكتروني.');
      router.push('/reset-password');
    } catch {
      setError('تعذر الاتصال بخدمة البريد الآن. تحقق من الإنترنت وحاول مرة أخرى.');
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  }

  return <main className="shell"><section className="auth-page">
    <Link className="brand brand-centered" href="/"><span className="brand-mark">ع</span><span>Dar<span>Lugha</span></span></Link>
    <div className="eyebrow">استعادة الحساب</div><h1>نسيت كلمة المرور؟</h1>
    <p>أدخل بريدك الإلكتروني وسنرسل لك رمزًا رقميًا لإنشاء كلمة مرور جديدة.</p>
    <form onSubmit={submit}><input type="email" aria-label="البريد الإلكتروني" placeholder="البريد الإلكتروني" value={email} onChange={event => setEmail(event.target.value)} required />
      <button className="button" disabled={loading}>{loading ? 'جارٍ الإرسال...' : 'إرسال رمز الاستعادة'}</button>
      {message && <p className="success-text" role="status">{message}</p>}{error && <p role="alert">{error}</p>}
    </form><Link className="link back-link" href="/login">العودة إلى تسجيل الدخول</Link>
  </section></main>;
}
