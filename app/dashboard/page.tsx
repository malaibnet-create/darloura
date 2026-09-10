'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { getLastLearningLocation, hydrateLearningDataFromCloud } from '../../lib/learning-progress';

export default function DashboardPage() {
  const router = useRouter();
  const [name, setName] = useState('صديقي');
  const [continueHref, setContinueHref] = useState('');

  useEffect(() => {
    void (async () => {
      const { data } = await createClient().auth.getUser();
      setName(data.user?.user_metadata?.full_name || 'صديقي');
      await hydrateLearningDataFromCloud();
      setContinueHref(getLastLearningLocation()?.href || '');
    })();
  }, []);

  return <main className="shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">ع</span><span>Dar<span>Lugha</span></span></div>
      <div className="header-actions"><Link className="profile-button" href="/profile" aria-label="فتح ملف الطالب"><span className="profile-avatar">{name.charAt(0)}</span><span className="profile-button-text">حسابي</span></Link><button className="link" onClick={async () => { await createClient().auth.signOut(); router.replace('/'); }}>تسجيل الخروج</button></div>
    </header>
    <section className="dashboard-hero"><div><div className="eyebrow">لوحتك التعليمية</div><h1>أهلًا بك، {name} ✦</h1><p>اختر الخطوة التي تناسبك اليوم، ونحن نرافقك في كل مرحلة.</p>{continueHref && <Link className="button" href={continueHref}>متابعة من آخر مكان · Continue learning</Link>}</div><Link className="test-reminder" href="/placement-test">اختبار تحديد المستوى<br /><small>اكتشف نقطة بدايتك ←</small></Link></section>
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
