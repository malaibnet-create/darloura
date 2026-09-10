'use client';

import { FormEvent, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { authRequestErrorMessage, normalizeEmail } from '../../lib/auth/otp.mjs';

const goals = ['التحدث بثقة', 'الدراسة أو الجامعة', 'العمل', 'السفر', 'فهم الثقافة العربية'];

export default function SignupPage() {
  const requestInFlight = useRef(false);
  const router = useRouter(); const [step, setStep] = useState(1); const [name, setName] = useState(''); const [age, setAge] = useState(''); const [started, setStarted] = useState('لم أبدأ بعد'); const [track, setTrack] = useState('الفصحى'); const [goal, setGoal] = useState(''); const [interest, setInterest] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(false);
  function nextProfile(event: FormEvent) { event.preventDefault(); if (!name || !goal) return setMessage('أكمل الاسم والهدف من التعلم.'); setMessage(''); setStep(2); }
  async function createAccount(event: FormEvent) {
    event.preventDefault();
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setLoading(true);
    setMessage('');
    const normalizedEmail = normalizeEmail(email);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: name.trim(),
            age: age ? Number(age) : null,
            started_learning: started,
            arabic_track: track,
            learning_goal: goal,
            interests: interest.trim(),
          },
        },
      });
      if (error) {
        setMessage(authRequestErrorMessage(error, 'تعذر إنشاء الحساب. تحقق من البريد وإعدادات Supabase.'));
        return;
      }
      if (!data.user) {
        setMessage('تعذر بدء إنشاء الحساب. حاول مرة أخرى.');
        return;
      }
      window.sessionStorage.setItem('darlugha-pending-signup', JSON.stringify({ email: normalizedEmail, name: name.trim() }));
      router.push('/verify');
    } catch {
      setMessage('تعذر الاتصال بخدمة إنشاء الحساب. تحقق من الإنترنت وحاول مرة أخرى.');
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  }
  if (step === 1) return <main className="shell"><section className="auth-page wide-auth"><div className="eyebrow">خطوة التعارف</div><h1>أخبرنا عنك لنخصص رحلتك.</h1><p>كلما عرفناك أكثر، أصبح اقتراح الدروس أفضل.</p><form onSubmit={nextProfile}><input aria-label="الاسم الكامل" placeholder="الاسم الكامل" value={name} onChange={(event) => setName(event.target.value)} required /><input aria-label="العمر" type="number" min="8" max="100" placeholder="العمر (اختياري)" value={age} onChange={(event) => setAge(event.target.value)} /><label>متى بدأت تعلم العربية؟<select value={started} onChange={(event) => setStarted(event.target.value)}><option>لم أبدأ بعد</option><option>منذ أقل من 6 أشهر</option><option>منذ سنة</option><option>منذ أكثر من سنة</option></select></label><label>أي نوع من العربية تريد تعلمه؟<select value={track} onChange={(event) => setTrack(event.target.value)}><option value="الفصحى">العربية الفصحى (MSA)</option><option value="الدارجة">الدارجة المغربية</option><option value="كلاهما">كلاهما</option></select></label><label>ما هدفك الأساسي؟<select value={goal} onChange={(event) => setGoal(event.target.value)} required><option value="">اختر هدفك</option>{goals.map((item) => <option key={item}>{item}</option>)}</select></label><input aria-label="اهتماماتك" placeholder="اهتماماتك (مثال: السفر، الرياضة، الأفلام)" value={interest} onChange={(event) => setInterest(event.target.value)} /><button className="button">متابعة ←</button>{message && <p role="alert">{message}</p>}</form><p className="switch-text">لديك حساب؟ <Link className="link" href="/login">تسجيل الدخول</Link></p></section></main>;
  return <main className="shell"><section className="auth-page"><button className="back-button" onClick={() => setStep(1)}>← تعديل بياناتي</button><div className="eyebrow">الخطوة الأخيرة</div><h1>أنشئ حسابك الآن.</h1><p>سنرسل رمز تحقق رقميًا إلى بريدك الإلكتروني.</p><form onSubmit={createAccount}><input type="email" aria-label="البريد الإلكتروني" placeholder="البريد الإلكتروني" value={email} onChange={(event) => setEmail(event.target.value)} required /><input type="password" aria-label="كلمة المرور" placeholder="كلمة المرور — 6 أحرف على الأقل" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required /><button className="button" disabled={loading}>{loading ? 'جارٍ إنشاء الحساب...' : 'إنشاء الحساب وإرسال الرمز'}</button>{message && <p role="alert">{message}</p>}</form></section></main>;
}
