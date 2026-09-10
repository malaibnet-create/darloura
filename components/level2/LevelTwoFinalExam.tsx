'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import ExamSpeakingPanel, { ExamTranscriptEntry } from './ExamSpeakingPanel';
import { hydrateLearningDataFromCloud, isLessonComplete } from '../../lib/learning-progress';
import { userStorage as localStorage } from '../../lib/user-scoped-storage.mjs';

type SectionId = 'vocabulary' | 'reading' | 'listening' | 'grammar' | 'writing' | 'speaking';
type ExamQuestion = { id: string; section: SectionId; type: 'multiple_choice'; points: number; promptAr: string; options: string[] };
type PublicExam = {
  exam: { id: string; titleAr: string; titleEn: string; totalScore: number; passScore: number; estimatedMinutes: { minimum: number; maximum: number }; sections: { id: SectionId; titleAr: string; titleEn: string; score: number; minutes: number; minimumToPass?: number }[] };
  reading: { titleAr: string; textAr: string };
  listening: { titleAr: string; audio: string; policy: { maxPlays: number } };
  writing: { promptAr: string; promptEn: string; score: number; rubric: { id: string; max: number; labelAr: string }[] };
  speaking: { scenarioAr: string; score: number; rubric: { id: string; max: number; labelAr: string }[] };
  questions: ExamQuestion[];
};
type ExamReport = {
  resultStatus: 'passed' | 'production_retake' | 'failed'; totalScore: number; bestScore: number; passScore: number;
  sectionScores: Record<SectionId, number>; objectiveFeedback: { id: string; section: SectionId; correct: boolean; points: number; maxPoints: number; selectedAnswer: string; correctAnswer: string; feedbackAr: string; feedbackEn: string }[];
  writingEvaluation: ProductionEvaluation; speakingEvaluation: ProductionEvaluation; suggestedReview: SectionId[]; attemptNumber: number;
  listeningTranscript?: string[];
};
type ProductionEvaluation = {
  evaluationStatus: 'complete' | 'incomplete'; score: number; dimensions: Record<string, number>;
  strengths: string[]; nextSteps: string[]; corrections: { original: string; corrected: string; explanationAr: string; explanationEn: string }[];
  summaryAr: string; summaryEn: string;
};
type ExamCache = {
  attemptId?: string;
  answers?: Record<string, string>;
  writingText?: string;
  speakingTranscript?: ExamTranscriptEntry[];
  submittedSections?: SectionId[];
  listeningPlays?: number;
  sectionIndex?: number;
  questionIndex?: Record<string, number>;
};

const STORAGE_KEY = 'darlugha-level-02-lesson-01-final-exam';
const sectionOrder: SectionId[] = ['vocabulary', 'reading', 'listening', 'grammar', 'writing', 'speaking'];
const reviewLinks: Record<SectionId, string> = {
  vocabulary: '/levels/A2/lessons/1/vocabulary', reading: '/levels/A2/lessons/1/reading', listening: '/levels/A2/lessons/1/listening',
  grammar: '/levels/A2/lessons/1/grammar', writing: '/levels/A2', speaking: '/levels/A2/lessons/1/conversation',
};

function wordCount(text: string) { return text.trim() ? text.trim().split(/\s+/u).length : 0; }
function formatRemaining(seconds: number) { return `${String(Math.max(0, Math.floor(seconds / 60))).padStart(2, '0')}:${String(Math.max(0, seconds % 60)).padStart(2, '0')}`; }
function errorMessage(code: string) {
  const messages: Record<string, string> = {
    AUTH_REQUIRED: 'يجب تسجيل الدخول قبل بدء الامتحان.', EXAM_DATABASE_NOT_READY: 'شغّل Migration رقم 011 في Supabase أولًا.',
    ATTEMPT_EXPIRED: 'انتهى وقت المحاولة. ابدأ محاولة جديدة.', LISTENING_LIMIT_REACHED: 'استعملت فرصتي الاستماع المتاحتين.',
    LISTENING_REQUIRED: 'استمع إلى التسجيل مرة واحدة على الأقل قبل تثبيت القسم.', SECTION_INCOMPLETE: 'أجب عن جميع أسئلة القسم أولًا.',
    WRITING_WORD_COUNT: 'يجب أن تتكوّن الكتابة من 70 إلى 90 كلمة.', SECTIONS_NOT_SUBMITTED: 'ثبّت الأقسام الستة قبل التسليم النهائي.',
    OBJECTIVE_SECTIONS_INCOMPLETE: 'بعض الأسئلة الموضوعية غير مكتملة.', PRODUCTION_SECTIONS_INCOMPLETE: 'أكمل الكتابة والمحادثة الصوتية أولًا.',
    EVALUATION_NOT_CONFIGURED: 'لم تتم إضافة إعدادات OpenAI اللازمة لتقييم الكتابة والمحادثة.',
    EVALUATION_LIMIT_REACHED: 'تم بلوغ حد التقييم مؤقتًا. إجاباتك محفوظة؛ حاول إرسالها لاحقًا.',
  };
  return messages[code] || 'تعذر إكمال العملية. إجاباتك ما زالت محفوظة ويمكنك المحاولة مرة أخرى.';
}

export default function LevelTwoFinalExam() {
  const [accessReady, setAccessReady] = useState(false);
  const [examUnlocked, setExamUnlocked] = useState(false);
  const [screen, setScreen] = useState<'intro' | 'exam' | 'submitting' | 'report'>('intro');
  const [publicExam, setPublicExam] = useState<PublicExam | null>(null);
  const [attemptId, setAttemptId] = useState('');
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [expiresAt, setExpiresAt] = useState('');
  const [remaining, setRemaining] = useState(60 * 60);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState<Record<string, number>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittedSections, setSubmittedSections] = useState<SectionId[]>([]);
  const [writingText, setWritingText] = useState('');
  const [speakingTranscript, setSpeakingTranscript] = useState<ExamTranscriptEntry[]>([]);
  const [listeningPlays, setListeningPlays] = useState(0);
  const [listeningActive, setListeningActive] = useState(false);
  const [readingTab, setReadingTab] = useState<'text' | 'questions'>('text');
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [error, setError] = useState('');
  const [report, setReport] = useState<ExamReport | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const countedPlayRef = useRef(false);

  const currentSection = sectionOrder[sectionIndex];
  const currentQuestions = useMemo(() => publicExam?.questions.filter((question) => question.section === currentSection) || [], [publicExam, currentSection]);
  const currentQuestionIndex = questionIndex[currentSection] || 0;
  const currentQuestion = currentQuestions[currentQuestionIndex];
  const allSectionsSubmitted = sectionOrder.every((section) => submittedSections.includes(section));

  useEffect(() => {
    let active = true;
    void hydrateLearningDataFromCloud().catch(() => false).finally(() => {
      if (!active) return;
      setExamUnlocked(isLessonComplete('A2', 1));
      setAccessReady(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (saved.report) {
          setReport(saved.report);
          setAttemptId(typeof saved.attemptId === 'string' ? saved.attemptId : '');
          setAttemptNumber(Number(saved.attemptNumber) || 1);
          setScreen('report');
        }
      } catch { /* Ignore damaged local cache. */ }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!expiresAt || screen !== 'exam') return;
    const update = () => {
      const value = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setRemaining(value);
      if (value === 0) setError('انتهى وقت الامتحان. أرسل إجاباتك المحفوظة الآن.');
    };
    update(); const timer = setInterval(update, 1000); return () => clearInterval(timer);
  }, [expiresAt, screen]);

  useEffect(() => {
    if (screen !== 'exam' || !attemptId || !publicExam) return;
    const snapshot = { attemptId, attemptNumber, expiresAt, publicExam, sectionIndex, questionIndex, answers, submittedSections, writingText, speakingTranscript, listeningPlays };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    const timer = setTimeout(async () => {
      setSaveState('saving');
      try {
        const response = await fetch('/api/level2-exam/attempt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save', attemptId, answers, writingText, speakingTranscript, currentSection }) });
        setSaveState(response.ok ? 'saved' : 'error');
      } catch { setSaveState('error'); }
    }, 650);
    return () => clearTimeout(timer);
  }, [screen, attemptId, attemptNumber, expiresAt, publicExam, sectionIndex, questionIndex, answers, submittedSections, writingText, speakingTranscript, listeningPlays, currentSection]);

  useEffect(() => {
    if (screen !== 'exam' || !attemptId) return;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') navigator.sendBeacon?.('/api/level2-exam/attempt', new Blob([JSON.stringify({ action: 'save', attemptId, navigationEvent: { type: 'page-hidden' } })], { type: 'application/json' }));
    };
    document.addEventListener('visibilitychange', onVisibility); return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [screen, attemptId]);

  async function startExam(forceNew = false) {
    if (!isLessonComplete('A2', 1)) {
      setExamUnlocked(false);
      setError('أكمل المفردات والقراءة والاستماع والقواعد والمحادثة قبل بدء الامتحان.');
      return;
    }
    setError(''); setReport(null);
    let cached: ExamCache = {};
    try { cached = forceNew ? {} : JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch {}
    const response = await fetch('/api/level2-exam/attempt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start', resumeAttemptId: cached.attemptId }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return setError(errorMessage(payload.error));
    const sameAttempt = payload.attemptId === cached.attemptId;
    setAttemptId(payload.attemptId); setAttemptNumber(payload.attemptNumber || 1); setExpiresAt(payload.expiresAt);
    setPublicExam(payload.publicExam); setAnswers({ ...(payload.answers || {}), ...(sameAttempt ? cached.answers || {} : {}) });
    setWritingText(payload.writingText || (sameAttempt ? cached.writingText || '' : ''));
    setSpeakingTranscript(payload.speakingTranscript || (sameAttempt ? cached.speakingTranscript || [] : []));
    setSubmittedSections(payload.submittedSections || (sameAttempt ? cached.submittedSections || [] : []));
    setListeningPlays(Number(payload.listeningPlays ?? (sameAttempt ? cached.listeningPlays : 0)) || 0);
    const cachedSection = typeof cached.sectionIndex === 'number' ? sectionOrder[cached.sectionIndex] : 'vocabulary';
    const requestedSection = payload.currentSection || (sameAttempt ? cachedSection : 'vocabulary');
    setSectionIndex(Math.max(0, sectionOrder.indexOf(requestedSection)));
    setQuestionIndex(sameAttempt ? cached.questionIndex || {} : {}); setScreen('exam');
  }

  async function postAttempt(body: Record<string, unknown>) {
    const response = await fetch('/api/level2-exam/attempt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attemptId, ...body }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'EXAM_REQUEST_FAILED');
    return payload;
  }

  async function startListening() {
    if (!audioRef.current || listeningPlays >= 2 || listeningActive) return;
    try {
      const payload = await postAttempt({ action: 'listening-start', listeningPlays });
      if (!payload.allowed) return;
      countedPlayRef.current = false; setListeningActive(true);
      audioRef.current.currentTime = 0; audioRef.current.playbackRate = 1;
      await audioRef.current.play();
    } catch (caught) { setError(errorMessage(caught instanceof Error ? caught.message : '')); }
  }

  async function countListeningPlay() {
    if (countedPlayRef.current) return;
    countedPlayRef.current = true;
    try {
      const payload = await postAttempt({ action: 'listening-complete', listeningPlays });
      if (payload.counted) setListeningPlays(Number(payload.plays));
    } catch { countedPlayRef.current = false; }
  }

  function onAudioTime() {
    const audio = audioRef.current;
    if (audio && Number.isFinite(audio.duration) && audio.duration > 0 && audio.currentTime / audio.duration >= 0.8) void countListeningPlay();
  }

  async function cancelListening() {
    setListeningActive(false);
    if (!countedPlayRef.current) await postAttempt({ action: 'listening-cancel' }).catch(() => undefined);
  }

  function sectionComplete(section: SectionId) {
    if (section === 'writing') {
      const count = wordCount(writingText);
      return count > 0;
    }
    if (section === 'speaking') return speakingTranscript.filter((entry) => entry.role === 'learner').length >= 6;
    const questions = publicExam?.questions.filter((question) => question.section === section) || [];
    return questions.every((question) => typeof answers[question.id] === 'string');
  }

  async function submitSection() {
    if (!sectionComplete(currentSection)) return setError('أكمل جميع عناصر هذا القسم قبل تثبيته.');
    if (currentSection === 'listening' && listeningPlays < 1) return setError('استمع إلى التسجيل مرة واحدة على الأقل قبل تثبيت القسم.');
    if (!window.confirm('بعد تثبيت القسم لن تظهر الإجابات الصحيحة الآن. هل تريد المتابعة؟')) return;
    try {
      setError('');
      const nextIndex = Math.min(sectionOrder.length - 1, sectionIndex + 1);
      const payload = await postAttempt({ action: 'submit-section', section: currentSection, answers, writingText, speakingTranscript, currentSection: sectionOrder[nextIndex] });
      const nextSubmitted = payload.submittedSections || [...new Set([...submittedSections, currentSection])];
      setSubmittedSections(nextSubmitted); setSectionIndex(nextIndex); setReadingTab('text');
    } catch (caught) { setError(errorMessage(caught instanceof Error ? caught.message : '')); }
  }

  async function submitExam() {
    if (!allSectionsSubmitted) return setError('ثبّت الأقسام الستة قبل تسليم الامتحان النهائي.');
    if (!window.confirm('هذا هو التسليم النهائي. ستظهر الإجابات والتقرير بعده. هل أنت متأكد؟')) return;
    setScreen('submitting'); setError('');
    try {
      const response = await fetch('/api/level2-exam/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attemptId, attemptNumber, answers, writingText, speakingTranscript }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'EXAM_SUBMIT_FAILED');
      setReport(payload); setScreen('report');
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ report: payload, attemptId, attemptNumber }));
      if (payload.resultStatus === 'passed') {
        localStorage.setItem('darlugha-a2-lesson-1-exam', 'passed');
      }
    } catch (caught) { setScreen('exam'); setError(errorMessage(caught instanceof Error ? caught.message : '')); }
  }

  async function retakeProduction(section: 'writing' | 'speaking') {
    try {
      const payload = await postAttempt({ action: 'retake-production', section });
      setSubmittedSections(payload.submittedSections || submittedSections.filter((item) => item !== section));
      if (payload.expiresAt) setExpiresAt(payload.expiresAt);
      if (section === 'writing') setWritingText(''); else setSpeakingTranscript([]);
      setSectionIndex(sectionOrder.indexOf(section)); setReport(null); setScreen('exam');
    } catch (caught) { setError(errorMessage(caught instanceof Error ? caught.message : '')); }
  }

  if (!accessReady) return <main className="l3-exam-page"><section className="exam-intro"><p>جارٍ التحقق من تقدّمك… · Checking your progress…</p></section></main>;
  if (!examUnlocked) return <main className="l3-exam-page"><section className="exam-intro"><Link href="/levels/A2">← المستوى المتوسط · Intermediate</Link><div className="exam-kicker">الامتحان مقفل · Exam locked</div><h1>أكمل عناصر الدرس أولًا</h1><p>يُفتح الامتحان بعد إكمال المفردات والقراءة والاستماع والقواعد والمحادثة.</p><p dir="ltr">Complete Vocabulary, Reading, Listening, Grammar, and Conversation to unlock the exam.</p><Link className="start-final-exam" href="/levels/A2">العودة إلى عناصر الدرس · Back to lesson sections</Link></section></main>;

  if (screen === 'intro') return <main className="l3-exam-page"><section className="exam-intro">
    <Link href="/levels/A2">← المستوى المتوسط · Intermediate</Link><div className="exam-kicker">المستوى المتوسط · الدرس الأول</div>
    <h1>امتحان الدرس الأول</h1><p dir="ltr">Lesson 1 Final Exam</p>
    <div className="exam-facts"><div><strong>100</strong><span>نقطة</span></div><div><strong>80</strong><span>درجة النجاح</span></div><div><strong>45–55</strong><span>دقيقة تقريبًا</span></div><div><strong>6</strong><span>أقسام</span></div></div>
    <div className="exam-section-preview">{[
      ['م','المفردات','20'],['ق','القراءة','20'],['س','الاستماع','20'],['ن','القواعد','20'],['ك','الكتابة','10'],['ح','المحادثة','10'],
    ].map(([icon,title,score]) => <article key={title}><span>{icon}</span><strong>{title}</strong><small>{score} نقطة</small></article>)}</div>
    <div className="exam-rules"><h2>قبل أن تبدأ</h2><ul><li>لا تظهر الإجابات أو التلميحات قبل التسليم النهائي.</li><li>الاستماع متاح مرتين فقط ولا يمكن تقديمه أو إرجاعه.</li><li>النجاح يتطلب 80/100 و5/10 على الأقل في الكتابة والمحادثة.</li><li>تُحفظ الإجابات تلقائيًا ويمكن استعادة المحاولة بعد تحديث الصفحة.</li></ul></div>
    {error && <div className="exam-alert error">{error}</div>}<button className="start-final-exam" type="button" onClick={() => void startExam()}>ابدأ الامتحان</button>
  </section></main>;

  if (screen === 'submitting') return <main className="l3-exam-page"><section className="exam-evaluating" aria-live="polite"><div className="exam-loader" /><h1>نصحح الامتحان الآن…</h1><p>يُصحح النظام 18 سؤالًا، ثم يقيّم الكتابة والمحادثة وفق السلمين المحددين.</p></section></main>;

  if (screen === 'report' && report) return <ExamReportView report={report} onRetake={retakeProduction} onNew={() => { localStorage.removeItem(STORAGE_KEY); setScreen('intro'); setReport(null); }} />;
  if (!publicExam) return null;

  const sectionMeta = publicExam.exam.sections.find((section) => section.id === currentSection)!;
  const locked = submittedSections.includes(currentSection);
  return <main className="l3-exam-page exam-active">
    <header className="exam-topbar"><div><Link href="/levels/A2">دار اللغة</Link><span>امتحان الدرس الأول</span></div><div className="exam-save" aria-live="polite">{saveState === 'saving' ? 'جارٍ الحفظ…' : saveState === 'saved' ? 'محفوظ تلقائيًا ✓' : 'تعذر الحفظ على الخادم'}</div><div className={`exam-timer ${remaining < 600 ? 'warning' : ''}`}><strong>{formatRemaining(remaining)}</strong><small>الوقت المتبقي</small></div></header>
    <nav className="exam-progress" aria-label="أقسام الامتحان">{publicExam.exam.sections.map((section, index) => <button key={section.id} type="button" className={`${section.id === currentSection ? 'active' : ''} ${submittedSections.includes(section.id) ? 'submitted' : ''}`} onClick={() => {
      if (section.id === 'listening' && submittedSections.includes('listening')) return;
      if (submittedSections.includes(section.id) || index <= sectionIndex) setSectionIndex(index);
    }}><b>{submittedSections.includes(section.id) ? '✓' : index + 1}</b><span>{section.titleAr}</span><small>{section.score} نقطة</small></button>)}</nav>
    <section className="exam-workspace">
      <header><div><div className="exam-kicker">القسم {sectionIndex + 1} من 6 · {sectionMeta.titleEn}</div><h1>{sectionMeta.titleAr}</h1></div><strong>{sectionMeta.score} نقطة</strong></header>
      {error && <div className="exam-alert error" role="alert">{error}</div>}
      {locked ? <div className="locked-section"><strong>تم تثبيت هذا القسم ✓</strong><p>لن تظهر الإجابات الصحيحة إلا بعد التسليم النهائي.</p></div> : <>
        {currentSection === 'reading' && <div className={`reading-exam-layout tab-${readingTab}`}><div className="mobile-reading-tabs"><button type="button" onClick={() => setReadingTab('text')}>النص</button><button type="button" onClick={() => setReadingTab('questions')}>الأسئلة</button></div><article className="reading-exam-text"><h2>{publicExam.reading.titleAr}</h2>{publicExam.reading.textAr.split('\n\n').map((paragraph, index) => <p key={index}>{paragraph}</p>)}</article><div className="reading-question-column">{currentQuestion && <ObjectiveQuestion question={currentQuestion} index={currentQuestionIndex} total={currentQuestions.length} value={answers[currentQuestion.id]} onAnswer={(value) => setAnswers((old) => ({ ...old, [currentQuestion.id]: value }))} onNavigate={(index) => setQuestionIndex((old) => ({ ...old, [currentSection]: index }))} answered={answers} questions={currentQuestions} />}</div></div>}
        {currentSection === 'listening' && <><div className="exam-listening-player"><audio ref={audioRef} src={publicExam.listening.audio} preload="none" controls={false} controlsList="nodownload noplaybackrate" onTimeUpdate={onAudioTime} onEnded={() => { setListeningActive(false); void countListeningPlay(); }} onError={() => { setListeningActive(false); void cancelListening(); setError('تعذر تحميل ملف الاستماع. تحقق من الاتصال ولا تُثبت القسم الآن.'); }} /><div className="audio-disc">🎧</div><div><strong>{publicExam.listening.titleAr}</strong><p>استمع إلى الحوار ثم أجب. لن يظهر النص قبل التسليم.</p><span>التشغيلات المكتملة: {listeningPlays} / 2</span></div><button type="button" disabled={listeningPlays >= 2 || listeningActive} onClick={() => void startListening()}>{listeningActive ? 'التسجيل يعمل…' : listeningPlays >= 2 ? 'استُعملت المرتان' : 'تشغيل من البداية'}</button></div>{currentQuestion && <ObjectiveQuestion question={currentQuestion} index={currentQuestionIndex} total={currentQuestions.length} value={answers[currentQuestion.id]} onAnswer={(value) => setAnswers((old) => ({ ...old, [currentQuestion.id]: value }))} onNavigate={(index) => setQuestionIndex((old) => ({ ...old, [currentSection]: index }))} answered={answers} questions={currentQuestions} />}</>}
        {(currentSection === 'vocabulary' || currentSection === 'grammar') && currentQuestion && <ObjectiveQuestion question={currentQuestion} index={currentQuestionIndex} total={currentQuestions.length} value={answers[currentQuestion.id]} onAnswer={(value) => setAnswers((old) => ({ ...old, [currentQuestion.id]: value }))} onNavigate={(index) => setQuestionIndex((old) => ({ ...old, [currentSection]: index }))} answered={answers} questions={currentQuestions} />}
        {currentSection === 'writing' && <div className="exam-writing"><details><summary>English instructions</summary><p dir="ltr">{publicExam.writing.promptEn}</p></details><h2>مهمة الكتابة</h2><p>{publicExam.writing.promptAr}</p><textarea value={writingText} onChange={(event) => setWritingText(event.target.value)} spellCheck={false} autoCorrect="off" autoCapitalize="off" placeholder="اكتب إجابتك هنا من غير استعمال مصحح آلي…" /><div className={`word-counter ${wordCount(writingText) < 70 || wordCount(writingText) > 90 ? 'warning' : 'ok'}`}><strong>{wordCount(writingText)}</strong> كلمة · النطاق المطلوب 70–90 كلمة</div><div className="rubric-chips">{publicExam.writing.rubric.map((item) => <span key={item.id}>{item.labelAr}: {item.max}</span>)}</div></div>}
        {currentSection === 'speaking' && <><div className="speaking-scenario"><strong>المهمة</strong><p>{publicExam.speaking.scenarioAr}</p><small>المدة المستهدفة 3–5 دقائق وستة أدوار للطالب على الأقل. لا توجد تلميحات أو تصحيحات أثناء الجلسة.</small></div><ExamSpeakingPanel attemptId={attemptId} initialTranscript={speakingTranscript} locked={false} onChange={setSpeakingTranscript} onComplete={setSpeakingTranscript} /></>}
        <div className="section-submit"><span>{sectionComplete(currentSection) ? 'القسم مكتمل وجاهز للتثبيت.' : 'أكمل جميع عناصر القسم.'}</span><button type="button" disabled={!sectionComplete(currentSection)} onClick={() => void submitSection()}>تثبيت القسم والمتابعة</button></div>
      </>}
    </section>
    <footer className="exam-final-footer"><span>المحاولة رقم {attemptNumber} · {submittedSections.length}/6 أقسام مثبتة</span><button type="button" disabled={!allSectionsSubmitted} onClick={() => void submitExam()}>التسليم النهائي وإظهار النتيجة</button></footer>
  </main>;
}

function ObjectiveQuestion({ question, index, total, value, onAnswer, onNavigate, answered, questions }: {
  question: ExamQuestion; index: number; total: number; value?: string; onAnswer: (value: string) => void; onNavigate: (index: number) => void; answered: Record<string, string>; questions: ExamQuestion[];
}) {
  return <article className="objective-question"><div className="question-count">السؤال {index + 1} من {total} · {question.points} {question.points === 1 ? 'نقطة' : 'نقطتان أو أكثر'}</div><h2>{question.promptAr}</h2><div className="exam-options">{question.options.map((option) => <label key={option} className={value === option ? 'selected' : ''}><input type="radio" name={question.id} checked={value === option} onChange={() => onAnswer(option)} /><span>{option}</span></label>)}</div><div className="question-navigation"><button type="button" disabled={index === 0} onClick={() => onNavigate(index - 1)}>السابق</button><div className="question-map" aria-label="خريطة أسئلة القسم">{questions.map((item, itemIndex) => <button type="button" key={item.id} className={`${itemIndex === index ? 'current' : ''} ${answered[item.id] ? 'answered' : ''}`} onClick={() => onNavigate(itemIndex)} aria-label={`السؤال ${itemIndex + 1}${answered[item.id] ? ' مجاب' : ''}`}>{itemIndex + 1}</button>)}</div><button type="button" disabled={index === total - 1} onClick={() => onNavigate(index + 1)}>التالي</button></div></article>;
}

function ExamReportView({ report, onRetake, onNew }: { report: ExamReport; onRetake: (section: 'writing' | 'speaking') => void; onNew: () => void }) {
  const passed = report.resultStatus === 'passed';
  const labels: Record<SectionId, string> = { vocabulary: 'المفردات والعبارات', reading: 'القراءة', listening: 'الاستماع', grammar: 'القواعد', writing: 'الكتابة', speaking: 'المحادثة' };
  const maximums: Record<SectionId, number> = { vocabulary: 20, reading: 20, listening: 20, grammar: 20, writing: 10, speaking: 10 };
  return <main className="l3-exam-page"><section className="final-report"><header><div><div className="exam-kicker">التقرير النهائي · Final report</div><h1>{passed ? 'أحسنت! نجحت في امتحان الدرس.' : report.resultStatus === 'production_retake' ? 'المجموع جيد، ويجب إعادة قسم إنتاجي.' : 'اكتملت المحاولة. راجع الأقسام المحددة.'}</h1><p>{passed ? 'تم حفظ نجاحك. الدرس الثاني قيد الإعداد وسيبقى مقفلًا حتى نشر محتواه كاملًا.' : 'أفضل نتيجة محفوظة ولن تُمسح عند الإعادة.'}</p></div><div className={`final-score ${passed ? 'passed' : ''}`}><strong>{report.totalScore}</strong><span>/ 100</span><small>أفضل نتيجة: {report.bestScore}</small></div></header><div className="section-score-grid">{sectionOrder.map((section) => <article key={section}><div><strong>{labels[section]}</strong><small dir="ltr">{section}</small></div><b>{report.sectionScores[section]} / {maximums[section]}</b></article>)}</div>
    {report.resultStatus === 'production_retake' && <div className="production-retake"><h2>أعد القسم الذي لم يبلغ 5/10 فقط</h2>{report.sectionScores.writing < 5 && <button type="button" onClick={() => onRetake('writing')}>إعادة الكتابة</button>}{report.sectionScores.speaking < 5 && <button type="button" onClick={() => onRetake('speaking')}>إعادة المحادثة</button>}</div>}
    {!passed && report.suggestedReview.length > 0 && <div className="suggested-review"><h2>وحدات المراجعة المقترحة</h2>{report.suggestedReview.map((section) => <Link key={section} href={reviewLinks[section]}>{labels[section]} ←</Link>)}</div>}
    <ProductionReport title="تقييم الكتابة" evaluation={report.writingEvaluation} /><ProductionReport title="تقييم المحادثة" evaluation={report.speakingEvaluation} />
    {report.listeningTranscript?.length ? <details className="objective-feedback"><summary>عرض نص الاستماع بعد إغلاق المحاولة</summary><ol>{report.listeningTranscript.map((line, index) => <li key={index}>{line}</li>)}</ol></details> : null}
    <details className="objective-feedback"><summary>عرض تصحيح الأسئلة الموضوعية بعد إغلاق المحاولة</summary>{report.objectiveFeedback.map((item, index) => <article key={item.id} className={item.correct ? 'correct' : 'incorrect'}><strong>{index + 1}. {item.correct ? 'إجابة صحيحة' : 'إجابة تحتاج مراجعة'} · {item.points}/{item.maxPoints}</strong><p>إجابتك: {item.selectedAnswer || 'لم تُجب'}</p>{!item.correct && <p>الإجابة الصحيحة: {item.correctAnswer}</p>}<small>{item.feedbackAr}</small><small dir="ltr">{item.feedbackEn}</small></article>)}</details>
    <div className="report-actions">{report.resultStatus === 'failed' ? <button type="button" onClick={onNew}>بدء محاولة جديدة</button> : null}<Link href="/levels/A2">العودة إلى المستوى المتوسط</Link></div>
  </section></main>;
}

function ProductionReport({ title, evaluation }: { title: string; evaluation: ProductionEvaluation }) {
  return <details className="production-report"><summary>{title}: {evaluation.score}/10</summary><p>{evaluation.summaryAr}</p><p dir="ltr">{evaluation.summaryEn}</p><div className="production-columns"><div><h3>نقاط القوة</h3><ul>{evaluation.strengths.map((item, index) => <li key={index}>{item}</li>)}</ul></div><div><h3>الخطوات التالية</h3><ul>{evaluation.nextSteps.map((item, index) => <li key={index}>{item}</li>)}</ul></div></div>{evaluation.corrections.length > 0 && <div className="exam-corrections">{evaluation.corrections.map((item, index) => <article key={index}><del>{item.original}</del><strong>{item.corrected}</strong><small>{item.explanationAr}</small><small dir="ltr">{item.explanationEn}</small></article>)}</div>}</details>;
}
