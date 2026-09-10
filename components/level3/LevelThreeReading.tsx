'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { level03Lesson01Reading } from '../../data/level3/reading';
import { level03Lesson01ReadingPractice } from '../../data/level3/reading-practice';
import readingAudioManifest from '../../data/level3/reading-audio-manifest.json';
import { levelThreeVocabularyLesson } from '../../data/level3/vocabulary';
import { level03Lesson01Phrases } from '../../data/level3/phrases';
import { markSectionComplete } from '../../lib/learning-progress';
import { userStorage as localStorage } from '../../lib/user-scoped-storage.mjs';
import LessonCompletion from '../learning/LessonCompletion';

type Phase = 'predict' | 'skim' | 'close' | 'analyze' | 'infer' | 'summarize';
type ReadingMode = 'authentic' | 'assisted';
type AnswerRecord = Record<string, { choice: number; correct: boolean }>;

const STORAGE_KEY = 'darlugha-level-03-reading-lesson-01';
const SECTION_KEY = 'darlugha-b1-lesson-1-sections';
const AUDIO_ROOT = '/audio/level-03/reading/lesson-01/';
const phases: { id: Phase; ar: string; en: string }[] = [
  { id: 'predict', ar: 'توقّع', en: 'Predict' },
  { id: 'skim', ar: 'اقرأ سريعًا', en: 'Skim' },
  { id: 'close', ar: 'اقرأ بدقة', en: 'Read closely' },
  { id: 'analyze', ar: 'حلّل', en: 'Analyze' },
  { id: 'infer', ar: 'استنتج', en: 'Infer' },
  { id: 'summarize', ar: 'لخّص', en: 'Summarize' },
];

const lesson = level03Lesson01Reading;
const practice = level03Lesson01ReadingPractice;
const vocabulary = levelThreeVocabularyLesson.items;
const phrases = level03Lesson01Phrases.phrases;

function normalizeArabic(value: string) {
  return value.normalize('NFKD').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').replace(/[ـ\s،؛؟.!«»"'():]/g, '').toLowerCase();
}

function audioUrl(id: string) {
  const item = readingAudioManifest.items.find((entry) => entry.id === id);
  return item ? `${AUDIO_ROOT}${item.file.split('/').pop()}` : '';
}

function targetReference(id: string, kind: string) {
  return kind === 'vocabulary'
    ? vocabulary.find((item) => item.id === id)
    : phrases.find((item) => item.id === id);
}

export default function LevelThreeReading() {
  const [hydrated, setHydrated] = useState(false);
  const [phase, setPhase] = useState<Phase>('predict');
  const [skimIndex, setSkimIndex] = useState(0);
  const [visitedSectionIds, setVisitedSectionIds] = useState<string[]>([]);
  const [readingMode, setReadingMode] = useState<ReadingMode>('authentic');
  const [listenedIds, setListenedIds] = useState<string[]>([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord>({});
  const [reviewSectionIds, setReviewSectionIds] = useState<string[]>([]);
  const [lastScore, setLastScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [summaryDraft, setSummaryDraft] = useState('');
  const [summaryFeedback, setSummaryFeedback] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [showTargetEnglish, setShowTargetEnglish] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [audioError, setAudioError] = useState('');
  const [highlightedSectionId, setHighlightedSectionId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (phases.some((entry) => entry.id === saved.phase)) setPhase(saved.phase);
        if (Number.isInteger(saved.skimIndex)) setSkimIndex(Math.min(4, Math.max(0, saved.skimIndex)));
        if (Array.isArray(saved.visitedSectionIds)) setVisitedSectionIds(saved.visitedSectionIds);
        if (saved.readingMode === 'authentic' || saved.readingMode === 'assisted') setReadingMode(saved.readingMode);
        if (Array.isArray(saved.listenedIds)) setListenedIds(saved.listenedIds);
        if (Number.isInteger(saved.practiceIndex)) setPracticeIndex(Math.min(19, Math.max(0, saved.practiceIndex)));
        if (saved.answers && typeof saved.answers === 'object') setAnswers(saved.answers);
        if (Array.isArray(saved.reviewSectionIds)) setReviewSectionIds(saved.reviewSectionIds);
        if (Number.isFinite(saved.lastScore)) setLastScore(saved.lastScore);
        if (Number.isFinite(saved.bestScore)) setBestScore(saved.bestScore);
        if (typeof saved.summaryDraft === 'string') setSummaryDraft(saved.summaryDraft);
      } catch {}
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      phase, skimIndex, visitedSectionIds, readingMode, listenedIds,
      practiceIndex, answers, reviewSectionIds, lastScore, bestScore, summaryDraft,
    }));
  }, [hydrated, phase, skimIndex, visitedSectionIds, readingMode, listenedIds, practiceIndex, answers, reviewSectionIds, lastScore, bestScore, summaryDraft]);

  useEffect(() => () => audioRef.current?.pause(), []);

  const currentSection = lesson.sections[skimIndex];
  const currentQuestion = practice.questions[practiceIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const firstReadingComplete = visitedSectionIds.length === lesson.sections.length;
  const allQuestionsComplete = Object.keys(answers).length === practice.questions.length;
  const selectedTarget = lesson.targetItems.find((item) => item.id === selectedTargetId);
  const selectedReference = selectedTarget ? targetReference(selectedTarget.id, selectedTarget.kind) : null;

  const summaryStats = useMemo(() => {
    const normalized = normalizeArabic(summaryDraft);
    const usedVocabulary = lesson.targetItems.filter((item) => item.kind === 'vocabulary' && normalized.includes(normalizeArabic(item.surface)));
    const usedPhrases = lesson.targetItems.filter((item) => item.kind === 'phrase' && normalized.includes(normalizeArabic(item.surface)));
    const words = summaryDraft.trim() ? summaryDraft.trim().split(/\s+/).length : 0;
    return { words, usedVocabulary, usedPhrases };
  }, [summaryDraft]);

  function canOpen(target: Phase) {
    if (target === 'predict' || target === 'skim') return true;
    if (target === 'close') return firstReadingComplete;
    if (target === 'analyze') return firstReadingComplete;
    if (target === 'infer') return practice.questions.slice(0, 16).every((question) => answers[question.id]);
    return allQuestionsComplete;
  }

  function visitSection(index: number) {
    const section = lesson.sections[index];
    setSkimIndex(index);
    setVisitedSectionIds((current) => current.includes(section.id) ? current : [...current, section.id]);
  }

  function playAudio(id: string, sectionId?: string) {
    const url = audioUrl(id);
    if (!url) {
      setAudioError('تعذر العثور على ملف الصوت المطلوب. · The requested audio file could not be found.');
      return;
    }
    if (playingId === id && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlayingId(null);
      setHighlightedSectionId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setAudioError('');
    setLoadingId(id);
    setPlayingId(null);
    setHighlightedSectionId(sectionId || null);
    const audio = new Audio(url);
    audio.preload = 'none';
    audioRef.current = audio;
    audio.oncanplay = () => setLoadingId(null);
    audio.onended = () => {
      setPlayingId(null);
      setLoadingId(null);
      setHighlightedSectionId(null);
    };
    audio.onerror = () => {
      setAudioError('تعذر تشغيل هذا المقطع. تحقق من الاتصال ثم حاول مرة أخرى. · This clip could not be played. Check your connection and try again.');
      setPlayingId(null);
      setLoadingId(null);
      setHighlightedSectionId(null);
    };
    audio.play().then(() => {
      setPlayingId(id);
      setLoadingId(null);
      setListenedIds((current) => current.includes(id) ? current : [...current, id]);
    }).catch(() => {
      setAudioError('لم يتمكن المتصفح من تشغيل الصوت. اضغط على الزر وحاول مرة أخرى. · Your browser could not play the audio. Press the button and try again.');
      setLoadingId(null);
      setHighlightedSectionId(null);
    });
  }

  function chooseAnswer(choice: number) {
    if (!currentQuestion || currentAnswer) return;
    const correct = choice === currentQuestion.answer;
    setAnswers((current) => ({ ...current, [currentQuestion.id]: { choice, correct } }));
    if (!correct) {
      setReviewSectionIds((current) => Array.from(new Set([...current, ...currentQuestion.sectionIds])));
    }
  }

  function markReadingComplete() {
    let sections = Array(7).fill(false);
    try {
      const parsed = JSON.parse(localStorage.getItem(SECTION_KEY) || '[]');
      if (Array.isArray(parsed)) sections = sections.map((_, index) => Boolean(parsed[index]));
    } catch {}
    sections[1] = true;
    localStorage.setItem(SECTION_KEY, JSON.stringify(sections));
    markSectionComplete('B1', 1, 'reading');
  }

  function nextQuestion() {
    if (!currentAnswer) return;
    if (practiceIndex === 19) {
      const score = Object.values(answers).filter((answer) => answer.correct).length;
      setLastScore(score);
      setBestScore((current) => Math.max(current, score));
      markReadingComplete();
      setPhase('summarize');
      return;
    }
    const next = practiceIndex + 1;
    setPracticeIndex(next);
    if (next === 16) setPhase('infer');
  }

  function beginPractice() {
    setPracticeIndex(0);
    setAnswers({});
    setReviewSectionIds([]);
    setLastScore(0);
    setPhase('analyze');
  }

  function reviewSection(id: string) {
    setReadingMode('assisted');
    setPhase('close');
    requestAnimationFrame(() => document.getElementById(`reading-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function checkSummary() {
    const { words, usedVocabulary, usedPhrases } = summaryStats;
    const issues: string[] = [];
    if (words < 70) issues.push(`أضف ${70 - words} كلمة على الأقل · add at least ${70 - words} words`);
    if (words > 90) issues.push(`اختصر ${words - 90} كلمة · remove ${words - 90} words`);
    if (usedVocabulary.length < 3) issues.push(`استعمل ${3 - usedVocabulary.length} مفردات إضافية من الدرس · use ${3 - usedVocabulary.length} more lesson words`);
    if (usedPhrases.length < 2) issues.push(`استعمل ${2 - usedPhrases.length} عبارتين من الدرس · use ${2 - usedPhrases.length} more lesson phrases`);
    setSummaryFeedback(issues.length
      ? `تلميح للمراجعة · Review hint: ${issues.join('، ')}. راجع أيضًا ترتيب المشكلة والدليل الجديد والقرار النهائي. · Also review the order of the problem, new evidence, and final decision.`
      : 'أحسنت! حققت شروط الطول والعناصر المستهدفة. راجع الآن دقة الفهم وترتيب الأفكار وصحة الاستعمال قبل اعتماد النسخة النهائية. · Well done! You met the length and target-item requirements. Review accuracy, organization, and usage before finalizing.');
  }

  function renderAssistedText(text: string) {
    const sorted = [...lesson.targetItems].sort((a, b) => b.surface.length - a.surface.length);
    const pattern = new RegExp(`(${sorted.map((item) => item.surface.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
    const bySurface = new Map<string, (typeof lesson.targetItems)[number]>(sorted.map((item) => [item.surface, item]));
    return text.split(pattern).map((part, index) => {
      const target = bySurface.get(part);
      if (!target) return <span key={`${part}-${index}`}>{part}</span>;
      return <button
        type="button"
        key={`${target.id}-${index}`}
        className={`reading-target ${target.kind}`}
        aria-label={`افتح شرح ${part} · Open explanation`}
        onClick={() => { setSelectedTargetId(target.id); setShowTargetEnglish(false); }}
      ><span aria-hidden="true">{target.kind === 'vocabulary' ? 'م' : 'ع'}</span>{part}</button>;
    });
  }

  return <main className="level3-reading-page">
    <header className="l3r-header">
      <Link href="/levels/B1">← المستوى المتقدم · Advanced</Link>
      <div className="eyebrow">الدرس الأول · Lesson 1 · القراءة المتقدمة · Advanced reading</div>
      <h1>{lesson.lesson.titleAr}</h1>
      <p dir="ltr">{lesson.lesson.titleEn} · {lesson.lesson.estimatedMinutes} minutes</p>
      <div className="l3r-stats"><strong>{visitedSectionIds.length}/5</strong><span>أقسام مقروءة · Sections read</span><strong>{listenedIds.length}/6</strong><span>مقاطع مستمع إليها · Clips heard</span></div>
    </header>

    <nav className="l3r-phases" aria-label="مراحل قسم القراءة · Reading stages">
      {phases.map((entry, index) => <button type="button" key={entry.id} disabled={!canOpen(entry.id)} className={phase === entry.id ? 'active' : ''} onClick={() => canOpen(entry.id) && setPhase(entry.id)}><span>{index + 1}</span><strong>{entry.ar}</strong><small dir="ltr">{entry.en}</small></button>)}
    </nav>

    {phase === 'predict' && <section className="l3r-panel prediction">
      <Image src={lesson.image.path} alt={lesson.image.altAr} width={1600} height={900} sizes="(max-width: 900px) 100vw, 50vw" />
      <div className="l3r-prediction-copy"><div className="eyebrow">توقّع · Predict</div><h2>{lesson.lesson.titleAr}</h2><div className="genre-row"><span>{lesson.lesson.genreAr}</span><span dir="ltr">{lesson.lesson.genreEn}</span></div><p className="fiction-notice">ⓘ {lesson.lesson.fictionNoticeAr}</p><div className="pre-reading-list">{lesson.preReading.questions.map((question, index) => <details key={index}><summary>{question.ar}</summary><p>فكّر في إجابتك؛ هذا النشاط بلا نقاط. · Think about your answer; this activity is not graded.</p><details className="english-hint" dir="ltr"><summary>تلميح مساعد · Helpful hint</summary><p>{question.enHint}</p></details></details>)}</div><button className="button" type="button" onClick={() => { visitSection(0); setPhase('skim'); }}>ابدأ القراءة السريعة · Start skimming ←</button></div>
    </section>}

    {phase === 'skim' && <section className="l3r-panel">
      <div className="l3r-section-heading"><div><div className="eyebrow">اقرأ سريعًا · Skim</div><h2>الجزء · Section {skimIndex + 1}/5</h2></div><AudioButton id="reading-full" label="النص كاملًا · Full text" playingId={playingId} loadingId={loadingId} onPlay={() => playAudio('reading-full')} /></div>
      <div className="l3r-progress"><span style={{ width: `${((skimIndex + 1) / 5) * 100}%` }} /></div>
      <article className={`reading-section authentic ${highlightedSectionId === currentSection.id ? 'audio-active' : ''}`}>
        <div className="reading-section-title"><h3>{currentSection.headingAr}</h3><AudioButton id={`reading-${currentSection.id}`} label={`الجزء · Section ${skimIndex + 1}`} playingId={playingId} loadingId={loadingId} onPlay={() => playAudio(`reading-${currentSection.id}`, currentSection.id)} /></div>
        <p>{currentSection.authenticTextAr}</p>
        <aside><strong>فكّر بعد القراءة · Think after reading:</strong> {currentSection.focusQuestionAr}<small>لا تُعرض الإجابة في هذه المرحلة. · The answer is not shown at this stage.</small></aside>
      </article>
      <div className="l3r-actions"><button className="review-button" type="button" disabled={skimIndex === 0} onClick={() => visitSection(skimIndex - 1)}>الجزء السابق · Previous section</button>{skimIndex < 4 ? <button className="button" type="button" onClick={() => visitSection(skimIndex + 1)}>الجزء التالي · Next section ←</button> : <button className="button" type="button" onClick={() => setPhase('close')}>أكملت القراءة السريعة · I finished skimming ←</button>}</div>
    </section>}

    {phase === 'close' && <section className="l3r-panel close-reading">
      <div className="l3r-section-heading"><div><div className="eyebrow">اقرأ بدقة · Read closely</div><h2>بدّل بين الوضع الأصيل والمساعد · Switch between authentic and assisted modes</h2></div><div className="reading-mode" role="group" aria-label="وضع القراءة · Reading mode"><button type="button" className={readingMode === 'authentic' ? 'active' : ''} onClick={() => setReadingMode('authentic')}>قراءة أصيلة · Authentic</button><button type="button" className={readingMode === 'assisted' ? 'active' : ''} onClick={() => setReadingMode('assisted')}>قراءة مساعدة · Assisted</button></div></div>
      {readingMode === 'assisted' && <p className="target-legend"><span className="vocabulary">م</span> مفردة من الدرس · Lesson word <span className="phrase">ع</span> عبارة أو تركيب · Phrase — اضغط على العنصر لفتح شرحه. · Select an item to open its explanation.</p>}
      <div className="close-reading-grid"><div>{lesson.sections.map((section, index) => <article id={`reading-${section.id}`} className={`reading-section ${readingMode} ${highlightedSectionId === section.id ? 'audio-active' : ''}`} key={section.id}><div className="reading-section-title"><h3>{section.headingAr}</h3><AudioButton id={`reading-${section.id}`} label={`الجزء ${index + 1}`} playingId={playingId} loadingId={loadingId} onPlay={() => playAudio(`reading-${section.id}`, section.id)} /></div><p>{readingMode === 'authentic' ? section.authenticTextAr : renderAssistedText(section.assistedTextAr)}</p></article>)}</div>
      <aside className="target-reference" aria-live="polite">{selectedTarget && selectedReference ? <><span className={selectedTarget.kind}>{selectedTarget.kind === 'vocabulary' ? 'مفردة · Word' : 'عبارة · Phrase'}</span><h3>{selectedTarget.surface}</h3>{'definitionAr' in selectedReference ? <><p>{selectedReference.definitionAr}</p><dl><dt>التركيب · Collocation</dt><dd>{selectedReference.collocation}</dd></dl><button type="button" onClick={() => setShowTargetEnglish((value) => !value)}>{showTargetEnglish ? 'إخفاء الإنجليزية · Hide English' : 'أظهر المقابل الإنجليزي · Show English'}</button>{showTargetEnglish && <p dir="ltr">{selectedReference.glossEn}</p>}</> : <><p>{selectedReference.functionAr}</p><dl><dt>النمط · Pattern</dt><dd>{selectedReference.pattern}</dd></dl><button type="button" onClick={() => setShowTargetEnglish((value) => !value)}>{showTargetEnglish ? 'إخفاء الإنجليزية · Hide English' : 'أظهر المعنى الإنجليزي · Show English meaning'}</button>{showTargetEnglish && <p dir="ltr">{selectedReference.meaningEn}</p>}</>}</> : <><span>🔎</span><h3>مرجع القراءة · Reading reference</h3><p>في الوضع المساعد، اضغط على مفردة أو عبارة مميزة لفتح تعريفها من دروسك السابقة. · In assisted mode, select a highlighted word or phrase to open its definition.</p></>}</aside></div>
      <div className="l3r-actions"><button className="review-button" type="button" onClick={() => setPhase('skim')}>العودة إلى القراءة السريعة · Back to skimming</button><button className="button" type="button" onClick={() => setPhase(Object.keys(answers).length >= 16 ? 'infer' : 'analyze')}>{Object.keys(answers).length ? 'متابعة التدريب · Continue practice ←' : 'ابدأ التحليل · Start analysis ←'}</button></div>
    </section>}

    {(phase === 'analyze' || phase === 'infer') && currentQuestion && <section className="l3r-panel practice">
      <div className="practice-heading"><div><div className="eyebrow">{phase === 'analyze' ? 'حلّل · Analyze' : 'استنتج · Infer'}</div><p>{practice.instructionsAr}</p><p dir="ltr">{practice.instructionsEn}</p></div><strong>{practiceIndex + 1} / 20</strong></div>
      <div className="l3r-progress"><span style={{ width: `${((practiceIndex + 1) / 20) * 100}%` }} /></div>
      <span className="skill-badge">{currentQuestion.skill}</span><h2>{currentQuestion.promptAr}</h2>
      <div className="reading-choices">{currentQuestion.options.map((option, index) => <button type="button" key={`${option}-${index}`} disabled={Boolean(currentAnswer)} className={currentAnswer ? index === currentQuestion.answer ? 'correct' : currentAnswer.choice === index ? 'wrong' : '' : ''} onClick={() => chooseAnswer(index)}>{option}</button>)}</div>
      {currentAnswer && <div className={`reading-feedback ${currentAnswer.correct ? 'correct' : 'wrong'}`} role="status"><strong>{currentAnswer.correct ? '✓ إجابة صحيحة · Correct' : '✕ تحتاج إلى مراجعة · Review needed'}</strong><p>الإجابة الصحيحة · Correct answer: {currentQuestion.options[currentQuestion.answer]}</p><p dir="ltr">{currentQuestion.feedbackEn}</p>{!currentAnswer.correct && <div className="review-sections">{currentQuestion.sectionIds.map((id) => <button type="button" key={id} onClick={() => reviewSection(id)}>راجع الجزء · Review section {Number(id.slice(1))}</button>)}</div>}</div>}
      <div className="l3r-actions"><button className="review-button" type="button" disabled={practiceIndex === 0} onClick={() => { const previous = practiceIndex - 1; setPracticeIndex(previous); setPhase(previous >= 16 ? 'infer' : 'analyze'); }}>السابق · Previous</button><button className="button" type="button" disabled={!currentAnswer} onClick={nextQuestion}>{practiceIndex === 19 ? 'النتيجة والتلخيص · Result and summary ←' : 'السؤال التالي · Next question ←'}</button></div>
    </section>}

    {phase === 'summarize' && <section className="l3r-panel summary-panel">
      <div className="summary-result"><span>{lastScore >= 16 ? '🎉' : '🌱'}</span><div><div className="eyebrow">نتيجة القراءة · Reading result</div><h2>{lastScore >= 16 ? 'أحسنت! حققت معيار الإتقان. · Well done! You reached mastery.' : 'راجع الأجزاء المحددة ثم حاول مجددًا. · Review the marked sections and try again.'}</h2><strong>{lastScore}/20</strong><p>أفضل نتيجة · Best score: {bestScore}/20 · الإتقان · Mastery: 16/20</p></div></div>
      {reviewSectionIds.length > 0 && <div className="review-strip"><strong>أجزاء تحتاج إلى مراجعة · Sections to review:</strong>{reviewSectionIds.map((id) => <button type="button" key={id} onClick={() => reviewSection(id)}>الجزء · Section {Number(id.slice(1))}</button>)}</div>}
      <div className="eyebrow">لخّص · Summarize</div><h2>تلخيص موجّه — لا يدخل في درجة 20 · Guided summary — not included in the 20-point score</h2><p>{lesson.guidedSummary.promptAr}</p><p dir="ltr">{lesson.guidedSummary.promptEn}</p>
      <textarea value={summaryDraft} onChange={(event) => { setSummaryDraft(event.target.value); setSummaryFeedback(''); }} rows={10} placeholder="اكتب ملخصك هنا… · Write your summary here…" aria-label="ملخص النص · Text summary" />
      <div className="summary-counters"><span className={summaryStats.words >= 70 && summaryStats.words <= 90 ? 'complete' : ''}><strong>{summaryStats.words}</strong> / 70–90 كلمة · words</span><span className={summaryStats.usedVocabulary.length >= 3 ? 'complete' : ''}><strong>{summaryStats.usedVocabulary.length}</strong> / 3 مفردات · words</span><span className={summaryStats.usedPhrases.length >= 2 ? 'complete' : ''}><strong>{summaryStats.usedPhrases.length}</strong> / عبارتين · phrases</span></div>
      {(summaryStats.usedVocabulary.length > 0 || summaryStats.usedPhrases.length > 0) && <div className="used-items">{[...summaryStats.usedVocabulary, ...summaryStats.usedPhrases].map((item) => <span key={item.id}>{item.surface}</span>)}</div>}
      <button className="button" type="button" onClick={checkSummary}>افحص شروط الملخص · Check summary requirements</button>{summaryFeedback && <p className="summary-feedback" role="status">{summaryFeedback}</p>}
      <p className="privacy-note">🔒 يبقى هذا الملخص على جهازك في هذه النسخة، ولا يُرسل إلى أي خدمة خارجية. · This summary stays on your device in this version and is not sent to an external service.</p>
      <LessonCompletion level="B1" lesson={1} section="reading" passed={lastScore >= 16} score={`${lastScore}/20`} onRetry={beginPractice} />
    </section>}

    {audioError && <p className="l3r-audio-error" role="alert">{audioError}</p>}
  </main>;
}

function AudioButton({ id, label, playingId, loadingId, onPlay }: { id: string; label: string; playingId: string | null; loadingId: string | null; onPlay: () => void }) {
  return <button className="l3r-audio" type="button" aria-label={`استمع إلى ${label} · Listen`} onClick={onPlay}>{loadingId === id ? 'جارٍ التحميل… · Loading…' : playingId === id ? '⏸ إيقاف · Stop' : `🔊 ${label}`}</button>;
}
