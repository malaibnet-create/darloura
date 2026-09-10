'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSectionStates, hydrateLearningDataFromCloud, requiredSections, type LearningSection } from '../../../lib/learning-progress';
import { userStorage as localStorage } from '../../../lib/user-scoped-storage.mjs';
import {
  CURRICULUM_LEVELS,
  CURRICULUM_SECTIONS,
  curriculumExamHref,
  getLessonConfig,
  isLessonSectionAvailable,
  lessonSectionHref,
  parseLevelCode,
} from '../../../lib/curriculum.mjs';

type LevelCode = 'A1' | 'A2' | 'B1';

function readProgress(code: LevelCode, lesson: number): boolean[] {
  if (typeof window === 'undefined') return CURRICULUM_SECTIONS.map(() => false);
  const states = getSectionStates(code, lesson);
  return CURRICULUM_SECTIONS.map((section) => states[section.key as LearningSection] === 'completed');
}

export default function LevelPage({ params }: { params: Promise<{ levelCode: string }> }) {
  const router = useRouter();
  const [code, setCode] = useState<LevelCode>('A1');
  const [selectedLesson, setSelectedLesson] = useState(1);
  const [, refresh] = useState(0);

  useEffect(() => {
    params.then(({ levelCode }) => {
      const nextCode = parseLevelCode(levelCode) || 'A1';
      setCode(nextCode);
      const requested = Number(new URLSearchParams(window.location.search).get('lesson') || '1');
      setSelectedLesson(Number.isInteger(requested) && getLessonConfig(nextCode, requested) ? requested : 1);
    });
  }, [params]);

  useEffect(() => {
    const update = () => refresh((value) => value + 1);
    void hydrateLearningDataFromCloud().then(() => update());
    window.addEventListener('storage', update);
    window.addEventListener('darlugha-progress-changed', update);
    window.addEventListener('focus', update);
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener('darlugha-progress-changed', update);
      window.removeEventListener('focus', update);
    };
  }, []);

  const config = CURRICULUM_LEVELS[code];
  const lessons = useMemo(
    () => config.lessons.map((lesson) => lesson.number),
    [config.lessons],
  );
  const selectedLessonConfig = getLessonConfig(code, selectedLesson) || config.lessons[0];
  const progress = readProgress(code, selectedLesson);
  const availableSections = CURRICULUM_SECTIONS.map((section) => isLessonSectionAvailable(code, selectedLesson, section.key));
  const availableCount = availableSections.filter(Boolean).length;
  const completedCount = progress.filter((done, index) => done && availableSections[index]).length;
  const allDone = availableCount > 0 && completedCount === availableCount;
  const visibleSections = CURRICULUM_SECTIONS
    .map((section, index) => ({ section, index }))
    .filter(({ section }) => isLessonSectionAvailable(code, selectedLesson, section.key));

  function isUnlocked(lesson: number) {
    const lessonConfig = getLessonConfig(code, lesson);
    if (!lessonConfig?.implemented) return false;
    if (lesson === 1) return true;
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(`darlugha-${code.toLowerCase()}-lesson-${lesson - 1}-exam`) === 'passed';
  }

  function openSection(key: LearningSection) {
    if (!isUnlocked(selectedLesson)) return;
    const target = lessonSectionHref(code, selectedLesson, key);
    if (target) router.push(target);
  }

  function openExam() {
    if (!allDone) return;
    const target = curriculumExamHref(code, selectedLesson);
    if (target) router.push(target);
  }

  return <main className="shell">
    <section className="level-page">
      <div className="level-head">
        <div>
          <Link className="back-link" href="/lessons">← {code === 'A1' ? 'All levels' : 'كل المستويات · All levels'}</Link>
          <div className="eyebrow">{config.nameAr} · <span dir="ltr">{config.nameEn}</span> · {code}</div>
          <h1>{config.nameAr}</h1>
          <p>{config.description}</p>
        </div>
        {config.lessons.length > 0 && <div className="test-reminder">
          <strong>{completedCount} / {availableCount}</strong><br />
          <small>{code === 'A1' ? 'completed sections' : 'أقسام مكتملة · completed sections'}</small>
        </div>}
      </div>

      {config.lessons.length === 0 ? <div className="lesson-message">
        <strong>المستوى المتوسط قيد الإعداد · Intermediate is coming soon</strong>
        <p>لن يفتح هذا المستوى دروس المبتدئ. ستظهر دروسه هنا عند إضافتها.</p>
        <Link className="button" href="/lessons">العودة إلى المستويات</Link>
      </div> : <>
        <div className="lesson-picker" aria-label={`دروس ${config.nameAr}`}>
          {lessons.map((lesson) => <button
            key={lesson}
            type="button"
            className={`lesson-chip ${selectedLesson === lesson ? 'active' : ''} ${isUnlocked(lesson) ? '' : 'locked'}`}
            onClick={() => isUnlocked(lesson) && setSelectedLesson(lesson)}
            disabled={!isUnlocked(lesson)}
          >
            <span>{isUnlocked(lesson) ? lesson : '🔒'}</span><small>{code === 'A1' ? 'Lesson' : 'الدرس · Lesson'}</small>
          </button>)}
        </div>

        <div className="lesson-title-row">
          <div>
            <div className="eyebrow">{code === 'A1' ? `Lesson ${selectedLesson} of ${config.lessons.length}` : `الدرس ${selectedLesson} من ${config.lessons.length} · Lesson ${selectedLesson}`}</div>
            <h2>{selectedLessonConfig.title}</h2>
          </div>
          <span className="lesson-status">
            {!selectedLessonConfig.implemented
              ? 'هذا الدرس قيد الإعداد · Coming soon'
              : code === 'B1'
              ? allDone ? 'جاهز للامتحان النهائي ✓ · Final exam ready' : 'المفردات والقراءة والاستماع والقواعد والمحادثة والعبارات متاحة الآن · Six advanced sections available'
              : code === 'A2'
                ? allDone ? 'أكملت المفردات والقراءة والاستماع والقواعد والمحادثة ✓ · Five sections complete' : 'المفردات والقراءة والاستماع والقواعد والمحادثة متاحة الآن · Five sections available'
              : allDone ? 'Lesson exam ready ✓' : 'Five lesson sections available'}
          </span>
        </div>

        <div className="category-grid lesson-sections">
          {visibleSections.map(({ section: { icon, titleAr: title, titleEn, descriptionAr: desc, key }, index }) => {
            const available = availableSections[index];
            return <button
              key={key}
              type="button"
              className={`category-card ${progress[index] ? 'done' : ''} ${index === 0 ? 'first-section' : ''} ${available ? '' : 'locked'}`}
              onClick={() => openSection(key)}
              disabled={!available}
              aria-disabled={!available}
            >
              <span className="category-icon">{available ? icon : '🔒'}</span>
              <strong>{title}</strong>
              <span dir="ltr">{titleEn}</span>
              <small>{available ? progress[index] ? (code === 'A1' ? 'Completed ✓' : 'مكتمل ✓ · Completed') : index === 0 ? (code === 'A1' ? 'Start here' : 'ابدأ هنا · Start here') : (code === 'A1' ? 'Open section' : 'افتح القسم · Open section') : 'قريبًا · Coming soon'}<br />{code === 'A1' ? titleEn : desc}</small>
            </button>;
          })}
        </div>

        <div className="lesson-message">
          {!selectedLessonConfig.implemented
            ? 'لم يُنشر محتوى هذا الدرس بعد. سيبقى مقفلًا إلى أن تصبح جميع أقسامه جاهزة.'
            : code === 'B1'
            ? 'ابدأ بالمفردات، ثم اقرأ النص المتقدم، واستمع إلى الحوار، وادرس القواعد، ثم ادخل غرفة المحادثة الصوتية واستعمل العبارات والتراكيب.'
            : code === 'A2'
              ? progress[4]
                ? 'أحسنت! أكملت الأقسام الخمسة. يمكنك الآن بدء الامتحان النهائي للدرس الأول.'
                : progress[3]
                  ? 'أحسنت في القواعد. انتقل الآن إلى غرفة المحادثة وخطّط لورشة ثقافية مع المحاور الصوتي.'
                : progress[2]
                  ? 'أحسنت في الاستماع. انتقل الآن إلى قواعد «مِنَ الفِعْلِ إِلَى المَصْدَرِ».'
                : progress[1]
                  ? 'أحسنت في القراءة. انتقل الآن إلى استماع «خُطَّةٌ لِوَرْشَةِ السَّبْتِ».'
                : progress[0]
                  ? 'أحسنت في المفردات. انتقل الآن إلى قراءة «مشروع صغير يُعَرِّفُ بمدينة وليلي».'
                  : 'ابدأ بالمفردات، ثم القراءة المتعمقة، ثم الاستماع.'
            : allDone
              ? 'Great work! You completed all lesson sections. The lesson exam is now available.'
              : progress[0]
                ? 'Vocabulary is complete. You may now choose any other lesson section.'
                : 'Start with vocabulary, or choose another lesson section.'}
        </div>

        {selectedLessonConfig.implemented && <div className="level-footer">
          <span className="exam-note">{allDone ? code === 'A1' ? 'Lesson exam unlocked.' : (code === 'B1' || code === 'A2' ? 'الامتحان النهائي للدرس الأول متاح الآن.' : 'امتحان الدرس متاح الآن.') : code === 'A1' ? `Complete all ${requiredSections('A1').length} sections to unlock the lesson exam.` : `أكمل الأقسام ${code === 'A2' ? 'الخمسة' : 'الستة'} لفتح امتحان الدرس.`}</span>
          <button className={`exam-button ${allDone ? '' : 'disabled'}`} type="button" onClick={openExam} disabled={!allDone}>{code === 'A1' ? 'Lesson exam' : 'الامتحان النهائي · Final exam'} ←</button>
        </div>}
      </>}
    </section>
  </main>;
}
