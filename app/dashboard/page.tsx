'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import InstallAppButton from '../../components/pwa/InstallAppButton';
import { createClient } from '../../lib/supabase/client';
import { getLastLearningLocation, hydrateLearningDataFromCloud } from '../../lib/learning-progress';
import { resolveStudentDisplayName } from '../../lib/student-display-name.mjs';

export default function DashboardPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [continueHref, setContinueHref] = useState('');
  const displayName = name || 'طالب DarLugha';

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login?next=/dashboard');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      setName(resolveStudentDisplayName({
        profileName: profile?.full_name,
        metadataName: user.user_metadata?.full_name,
        email: user.email,
      }));

      await hydrateLearningDataFromCloud();
      setContinueHref(getLastLearningLocation()?.href || '');
    })();
  }, [router]);

  return <main className="shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">ع</span><span>Dar<span>Lugha</span></span></div>
      <div className="header-actions">
        <Link className="profile-button" href="/profile" aria-label="فتح ملف الطالب"><span className="profile-avatar">{displayName.charAt(0)}</span><span className="profile-button-text">حسابي</span></Link>
        <button type="button" className="link" onClick={async () => { await createClient().auth.signOut(); router.replace('/'); }}>تسجيل الخروج</button>
      </div>
    </header>
    <section className="dashboard-hero">
      <div>
        <div className="eyebrow">لوحتك التعليمية</div>
        <h1>أهلًا بك، {displayName} ✦</h1>
        <p>اختر الخطوة التي تناسبك اليوم، ونحن نرافقك في كل مرحلة.</p>
        <div className="dashboard-hero-actions">
          {continueHref && <Link className="button" href={continueHref}>متابعة من آخر مكان · Continue learning</Link>}
          <InstallAppButton locale="ar" className="dashboard-install-button" />
        </div>
      </div>
      <Link className="test-reminder" href="/placement-test">اختبار تحديد المستوى<br /><small>اكتشف نقطة بدايتك ←</small></Link>
    </section>
    <section className="action-grid">
      <Link className="action-card lessons" href="/lessons"><span>▦</span><strong>الدروس</strong><small>تعلم وفق مسار منظم يناسب مستواك</small></Link>
      <Link className="action-card review" href="/review"><span>🔖</span><strong>المراجعة</strong><small>راجع الكلمات والعبارات التي حفظتها من الدروس</small></Link>
      <Link className="action-card darija" href="/darija-lessons"><span>ⵣ</span><strong>تعلم الدارجة المغربية</strong><small>30 درسًا بالفيديو وأسئلة تفتح لك الدرس التالي.</small></Link>
      <Link className="action-card teachers" href="/teachers"><span>◷</span><strong>احجز ساعة مع أستاذ</strong><small>تحدث مع مدرس حقيقي 30 أو 60 دقيقة</small></Link>
      <Link className="action-card tutor" href="/ai-tutor"><span>✦</span><strong>تحدث مع الأستاذ الآلي</strong><small>تدرب على مواقف يومية بثقة</small></Link>
      <Link className="action-card opi" href="/opi-prep"><span>✧</span><strong>التحضير لامتحان الكفاءة اللغوية OPI</strong><small>تدرّب، احجز اختبارًا تجريبيًا، وتعرّف على مستواك.</small></Link>
    </section>
  </main>;
}
