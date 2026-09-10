'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  isLessonComplete,
  lessonExamHref,
  lessonHubHref,
  markSectionComplete,
  type LearningLevel,
  type LearningSection,
} from '../../lib/learning-progress';

type Copy = {
  eyebrow: string;
  passed: string;
  retryNeeded: string;
  saved: string;
  retry: string;
  lesson: string;
  rules: string;
  exam: string;
  examLocked: string;
  saving: string;
  localOnly: string;
  saveFailed: string;
  retrySave: string;
};

const copy: Record<LearningLevel, Copy> = {
  A1: {
    eyebrow: 'Section complete', passed: 'Great work! You completed this section.', retryNeeded: 'Good effort. Review the activities and try again.',
    saved: 'Your progress has been saved.', retry: 'Try again', lesson: 'Back to lesson sections', rules: 'Back to grammar rules', exam: 'Take the lesson exam', examLocked: 'Complete all lesson sections to unlock the exam.',
    saving: 'Saving your progress…', localOnly: 'Saved on this device. Cloud sync is pending; make sure you are signed in and online.', saveFailed: 'Your progress could not be saved yet.', retrySave: 'Retry saving',
  },
  A2: {
    eyebrow: 'اكتمل القسم · Section complete', passed: 'أحسنت! أكملت هذا القسم. · Great work! You completed this section.', retryNeeded: 'راجع الأنشطة ثم حاول مرة أخرى. · Review the activities and try again.',
    saved: 'تم حفظ تقدمك. · Your progress has been saved.', retry: 'إعادة المحاولة · Try again', lesson: 'العودة إلى عناصر الدرس · Lesson sections', rules: 'العودة إلى القواعد · Grammar rules', exam: 'بدء امتحان الدرس · Take the exam', examLocked: 'أكمل جميع عناصر الدرس لفتح الامتحان. · Complete every section to unlock the exam.',
    saving: 'جارٍ حفظ تقدمك… · Saving your progress…', localOnly: 'حُفظ على هذا الجهاز، وتنتظر المزامنة السحابية. تأكد من تسجيل الدخول والاتصال بالإنترنت. · Saved locally; cloud sync is pending.', saveFailed: 'تعذّر حفظ تقدمك الآن. · Your progress could not be saved yet.', retrySave: 'إعادة محاولة الحفظ · Retry saving',
  },
  B1: {
    eyebrow: 'اكتمل القسم · Section complete', passed: 'أحسنت! أكملت هذا القسم. · Great work! You completed this section.', retryNeeded: 'راجع الأنشطة ثم حاول مرة أخرى. · Review the activities and try again.',
    saved: 'تم حفظ تقدمك. · Your progress has been saved.', retry: 'إعادة المحاولة · Try again', lesson: 'العودة إلى عناصر الدرس · Lesson sections', rules: 'العودة إلى القواعد · Grammar rules', exam: 'بدء امتحان الدرس · Take the exam', examLocked: 'أكمل جميع عناصر الدرس لفتح الامتحان. · Complete every section to unlock the exam.',
    saving: 'جارٍ حفظ تقدمك… · Saving your progress…', localOnly: 'حُفظ على هذا الجهاز، وتنتظر المزامنة السحابية. · Saved locally; cloud sync is pending.', saveFailed: 'تعذّر حفظ تقدمك الآن. · Your progress could not be saved yet.', retrySave: 'إعادة محاولة الحفظ · Retry saving',
  },
};

type SaveState = 'idle' | 'saving' | 'cloud-saved' | 'local-only' | 'failed';

export default function LessonCompletion({ level, lesson, section, passed, markCompleted = passed, score, onRetry, grammarRulesRemain = false, onBackToRules }: {
  level: LearningLevel;
  lesson: number;
  section: LearningSection;
  passed: boolean;
  markCompleted?: boolean;
  score?: string;
  onRetry?: () => void;
  grammarRulesRemain?: boolean;
  onBackToRules?: () => void;
}) {
  const [examReady, setExamReady] = useState(() => isLessonComplete(level, lesson));
  const [saveState, setSaveState] = useState<SaveState>(markCompleted ? 'saving' : 'idle');
  const text = copy[level];

  useEffect(() => {
    let active = true;
    if (!markCompleted) return () => { active = false; };
    void markSectionComplete(level, lesson, section).then((result) => {
      if (!active) return;
      setSaveState(result.cloudSaved ? 'cloud-saved' : result.localSaved ? 'local-only' : 'failed');
      setExamReady(isLessonComplete(level, lesson));
    });
    return () => { active = false; };
  }, [level, lesson, markCompleted, section]);

  async function retrySave() {
    setSaveState('saving');
    const result = await markSectionComplete(level, lesson, section);
    setSaveState(result.cloudSaved ? 'cloud-saved' : result.localSaved ? 'local-only' : 'failed');
    setExamReady(isLessonComplete(level, lesson));
  }

  return <section className={`unified-completion level-${level.toLowerCase()} ${passed ? 'passed' : 'review-needed'}`}>
    <div className="completion-symbol" aria-hidden="true">{passed ? '✓' : '↻'}</div>
    <div className="eyebrow">{text.eyebrow}</div>
    <h1>{passed ? text.passed : text.retryNeeded}</h1>
    {score && <strong className="completion-score">{score}</strong>}
    {markCompleted && <p role="status" aria-live="polite">
      {saveState === 'saving' ? text.saving : saveState === 'cloud-saved' ? text.saved : saveState === 'local-only' ? text.localOnly : text.saveFailed}
    </p>}
    {markCompleted && (saveState === 'local-only' || saveState === 'failed') && <button type="button" className="review-button" onClick={retrySave}>{text.retrySave}</button>}
    {!examReady && <small>{text.examLocked}</small>}
    <div className="completion-actions">
      {onRetry && <button type="button" className="button" onClick={onRetry}>{text.retry}</button>}
      {section === 'grammar' && grammarRulesRemain && onBackToRules
        ? <button type="button" className="review-button" onClick={onBackToRules}>{text.rules}</button>
        : <Link className="review-button" href={lessonHubHref(level, lesson)}>{text.lesson}</Link>}
      {examReady && <Link className="button" href={lessonExamHref(level, lesson)}>{text.exam}</Link>}
    </div>
  </section>;
}
