import Link from 'next/link';
import { lessonHubHref, type LearningLevel, type LearningSection } from '../../lib/learning-progress';
import type { ExamAccessResult } from '../../lib/exam-access';

const sectionNames: Record<LearningSection, string> = {
  vocabulary: 'المفردات · Vocabulary',
  reading: 'القراءة · Reading',
  listening: 'الاستماع · Listening',
  grammar: 'القواعد · Grammar',
  conversation: 'المحادثة · Conversation',
  phrases: 'العبارات · Phrases',
};

export default function ExamAccessNotice({ level, lesson, access }: {
  level: LearningLevel;
  lesson: number;
  access: Exclude<ExamAccessResult, { allowed: true }>;
}) {
  const unavailable = access.reason === 'not-configured' || access.reason === 'progress-unavailable';

  return <main className="shell">
    <section className="exam-panel">
      <div className="eyebrow">{unavailable ? 'الامتحان غير متاح الآن · Exam unavailable' : 'الامتحان مغلق · Exam locked'}</div>
      <h1>{unavailable ? 'تعذّر التحقق من حسابك وتقدّمك.' : 'أكمل عناصر الدرس أولًا.'}</h1>
      <p dir="auto">{unavailable
        ? 'تأكد من إعداد Supabase واتصال المنصة بقاعدة البيانات، ثم أعد المحاولة. لا يُفتح الامتحان في وضع المعاينة غير الآمن.'
        : 'لن يُفتح الامتحان حتى تكون جميع عناصر الدرس مكتملة ومحفوظة في حسابك.'}</p>
      {access.reason === 'sections-incomplete' && <div className="exam-missing-sections">
        <strong>العناصر المتبقية · Remaining sections</strong>
        <ul>{access.missing.map((section) => <li key={section}>{sectionNames[section]}</li>)}</ul>
      </div>}
      <Link className="button" href={lessonHubHref(level, lesson)}>العودة إلى عناصر الدرس · Back to lesson</Link>
    </section>
  </main>;
}
