import { CURRICULUM_LEVELS } from '../../lib/curriculum.mjs';

const levels = Object.values(CURRICULUM_LEVELS);

export default function LessonsPage() {
  return <main className="shell">
    <section className="levels-page">
      <div className="levels-heading">
        <div className="eyebrow">مسارك التعليمي · Your learning path</div>
        <h1>اختر مستواك وابدأ الرحلة</h1>
        <p>ثلاثة مستويات واضحة من الأساس إلى الاستخدام المتقدم للغة العربية.</p>
      </div>
      <div className="levels-grid">
        {levels.map((level) => <a className={`level-card ${level.className}`} href={`/levels/${level.code}`} key={level.code}>
          <h2>{level.code}</h2>
          <strong>{level.nameAr}</strong>
          <span dir="ltr">{level.nameEn}</span>
          <small>{level.cardDescription}</small>
        </a>)}
      </div>
    </section>
  </main>;
}
