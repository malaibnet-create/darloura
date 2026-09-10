'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage('');
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setMessage('البريد أو كلمة المرور غير صحيحة.');
    const requested = new URLSearchParams(window.location.search).get('next');
    const destination = requested?.startsWith('/') && !requested.startsWith('//') ? requested : '/dashboard';
    router.push(destination);
  }

  return <main className="shell"><section className="auth-page"><Link className="brand brand-centered" href="/"><span className="brand-mark">ع</span><span>Dar<span>Lugha</span></span></Link><div className="eyebrow">مرحبًا بعودتك</div><h1>سجّل دخولك وتابع رحلتك.</h1><p>كل درس يقربك خطوة من العربية التي تريدها.</p><form onSubmit={submit}><input type="email" aria-label="البريد الإلكتروني" placeholder="البريد الإلكتروني" value={email} onChange={(event) => setEmail(event.target.value)} required /><input type="password" aria-label="كلمة المرور" placeholder="كلمة المرور" value={password} onChange={(event) => setPassword(event.target.value)} required /><Link className="link forgot-link" href="/forgot-password">نسيت كلمة المرور؟</Link><button className="button" disabled={loading}>{loading ? 'جارٍ الدخول...' : 'تسجيل الدخول'}</button>{message && <p role="alert">{message}</p>}</form><p className="switch-text">ليس لديك حساب؟ <Link className="link" href="/signup">أنشئ حسابًا جديدًا</Link></p><Link className="link back-link" href="/">العودة إلى الصفحة الرئيسية</Link></section></main>;
}
