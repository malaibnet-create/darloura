'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import lessonSource from '../../data/level2/lesson-01-reading-source/lesson.json';
import readingSource from '../../data/level2/lesson-01-reading-source/reading.json';
import { markSectionComplete } from '../../lib/learning-progress';
import { userStorage as localStorage } from '../../lib/user-scoped-storage.mjs';
import LessonCompletion from '../learning/LessonCompletion';

type Phase = 'before' | 'first' | 'gist' | 'close' | 'language' | 'inference' | 'results';
type PublicExercise = {
  id: string; type: string; promptAr: string; promptEn: string;
  choices?: string[]; events?: string[]; image?: string; targetVocabulary?: string[];
  minimumSelections?: number; minimumWords?: number; maximumWords?: number; minimumTargetVocabulary?: number;
};
type PublicStage = { id: string; titleAr: string; titleEn: string; items: PublicExercise[] };
type GradeResult = {
  correct: boolean;
  feedbackAr: string;
  feedbackEn: string;
  reveal: boolean;
  modelAnswer?: unknown;
  detectedTerms?: string[];
  missingRequirements?: string[];
  rubricScore?: Record<string, number>;
};
type AudioState = { id: string; status: 'loading' | 'playing' | 'paused' | 'error' } | null;
type ContextCard = { target: string; sentence: string } | null;
type SavedProgress = {
  attemptId?: string; phase?: Phase; unlockedPhaseIndex?: number;
  indexes?: Record<string, number>; responses?: Record<string, unknown>; attempts?: Record<string, number>;
  grades?: Record<string, GradeResult>; reviewIds?: string[]; audioUnlocked?: boolean; closeStudyComplete?: boolean;
  savedSentences?: string[]; highlightedParagraphId?: string; firstStartedAt?: number; firstElapsed?: number;
  bestObjectiveCorrect?: number;
};

const lesson = lessonSource;
const reading = readingSource;
const STORAGE_KEY = 'darlugha-a2-lesson-1-reading';
const SECTION_KEY = 'darlugha-a2-lesson-1-sections';
const AUDIO_ROOT = '/audio/level-02/lesson-01/reading/';
const IMAGE_URL = '/images/level-02/lesson-01/reading/reading-opening-volubilis.png';
const objectiveStageIds = new Set(['gist', 'details', 'language', 'inference']);
const phaseOrder: Exclude<Phase, 'results'>[] = ['before', 'first', 'gist', 'close', 'language', 'inference'];
const phaseLabels: Record<Phase, { ar: string; en: string }> = {
  before: { ar: 'قبل القراءة', en: 'Before' },
  first: { ar: 'القراءة الأولى', en: 'First read' },
  gist: { ar: 'الفكرة العامة', en: 'Gist' },
  close: { ar: 'قراءة متعمقة', en: 'Close read' },
  language: { ar: 'المفردات', en: 'Language' },
  inference: { ar: 'الاستنتاج', en: 'Inference' },
  results: { ar: 'النتيجة', en: 'Results' },
};

const targetRules: Array<{ target: string; patterns: RegExp[] }> = [
  { target: 'تَعَلَّمَ', patterns: [/^(تعلم|يتعلم|متعلم|التعلم)/u] },
  { target: 'عَلَّمَ', patterns: [/^(علم|يعلم|تعليم|معلم)/u] },
  { target: 'دَرَسَ', patterns: [/^(درس|يدرس|دراسه|دارس|مدروس)/u] },
  { target: 'عَمِلَ', patterns: [/^(عمل|يعمل|عامل|معمول)/u] },
  { target: 'شَارَكَ', patterns: [/^(شارك|يشارك|مشارك)/u] },
  { target: 'خَطَّطَ', patterns: [/^(خطط|يخطط|تخطيط|خطه|مخطط)/u] },
  { target: 'قَرَّرَ', patterns: [/^(قرر|يقرر|قرار|مقرر)/u] },
  { target: 'اِخْتَارَ', patterns: [/^(اختار|يختار|اختيار|مختار)/u] },
  { target: 'اِسْتَعْمَلَ', patterns: [/^(استعمل|يستعمل|استعمال|مستعمل)/u] },
  { target: 'سَاعَدَ', patterns: [/^(ساعد|يساعد|مساعد)/u] },
  { target: 'اِحْتَاجَ', patterns: [/^(احتاج|يحتاج|احتياج|محتاج)/u] },
  { target: 'تَوَاصَلَ', patterns: [/^(تواصل|يتواصل|متواصل)/u] },
  { target: 'اِهْتَمَّ', patterns: [/^(اهتم|يهتم|اهتمام|مهتم)/u] },
  { target: 'تَغَيَّرَ', patterns: [/^(تغير|يتغير|متغير)/u] },
  { target: 'تَطَوَّرَ', patterns: [/^(تطور|يتطور|متطور)/u] },
  { target: 'نَجَحَ', patterns: [/^(نجح|ينجح|نجاح|ناجح)/u] },
];

function normalizeArabic(value: string) {
  return value.normalize('NFKD')
    .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/gu, '')
    .replace(/[إأآٱ]/gu, 'ا')
    .replace(/ؤ/gu, 'و')
    .replace(/ئ|ى/gu, 'ي')
    .replace(/ة/gu, 'ه')
    .replace(/[«»"'،؛؟!?.,:()\[\]{}]/gu, '')
    .trim();
}

function targetForToken(token: string) {
  if (/تُعَلِّم|عَلَّم/u.test(token)) return 'عَلَّمَ';
  const normalized = normalizeArabic(token);
  return targetRules.find((rule) => rule.patterns.some((pattern) => pattern.test(normalized)))?.target || '';
}

function detectedTargets(value: string) {
  const tokens = value.split(/\s+/u).map((token) => targetForToken(token)).filter(Boolean);
  return [...new Set(tokens)];
}

function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/u).length : 0;
}

function audioUrl(path: string) {
  return `${AUDIO_ROOT}${path.split('/').pop()}`;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const rest = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${rest}`;
}

function hasResponse(item: PublicExercise, value: unknown) {
  if (item.type === 'vocabularyActivation') {
    const data = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    return Array.isArray(data.selections) && data.selections.length > 0 && Boolean(String(data.explanation || '').trim());
  }
  if (item.type === 'summaryBuilder') {
    return value && typeof value === 'object' && Object.values(value as Record<string, unknown>).some((entry) => String(entry || '').trim());
  }
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(String(value ?? '').trim());
}

function stageIdForPhase(phase: Phase) {
  if (phase === 'close') return 'details';
  if (phase === 'before' || phase === 'gist' || phase === 'language' || phase === 'inference') return phase;
  return '';
}

export default function LevelTwoLessonOneReading() {
  const [hydrated, setHydrated] = useState(false);
  const [attemptId, setAttemptId] = useState('');
  const [phase, setPhase] = useState<Phase>('before');
  const [unlockedPhaseIndex, setUnlockedPhaseIndex] = useState(0);
  const [stages, setStages] = useState<PublicStage[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [error, setError] = useState('');
  const [indexes, setIndexes] = useState<Record<string, number>>({});
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [grades, setGrades] = useState<Record<string, GradeResult>>({});
  const [reviewIds, setReviewIds] = useState<string[]>([]);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [closeStudyComplete, setCloseStudyComplete] = useState(false);
  const [savedSentences, setSavedSentences] = useState<string[]>([]);
  const [highlightedParagraphId, setHighlightedParagraphId] = useState('');
  const [audioParagraphId, setAudioParagraphId] = useState('');
  const [contextCard, setContextCard] = useState<ContextCard>(null);
  const [firstStartedAt, setFirstStartedAt] = useState(0);
  const [firstElapsed, setFirstElapsed] = useState(0);
  const [bestObjectiveCorrect, setBestObjectiveCorrect] = useState(0);
  const [audioState, setAudioState] = useState<AudioState>(null);
  const [audioSpeed, setAudioSpeed] = useState<0.85 | 1>(1);
  const [submitting, setSubmitting] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let saved: SavedProgress = {};
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { /* start clean */ }
    const id = typeof saved.attemptId === 'string' ? saved.attemptId : crypto.randomUUID();
    const frame = window.requestAnimationFrame(() => {
      setAttemptId(id);
      if (saved.phase && ((phaseOrder as readonly Phase[]).includes(saved.phase) || saved.phase === 'results')) setPhase(saved.phase);
      if (typeof saved.unlockedPhaseIndex === 'number' && Number.isInteger(saved.unlockedPhaseIndex)) setUnlockedPhaseIndex(saved.unlockedPhaseIndex);
      if (saved.indexes) setIndexes(saved.indexes);
      if (saved.responses) setResponses(saved.responses);
      if (saved.attempts) setAttempts(saved.attempts);
      if (saved.grades) setGrades(saved.grades);
      if (Array.isArray(saved.reviewIds)) setReviewIds(saved.reviewIds);
      if (typeof saved.audioUnlocked === 'boolean') setAudioUnlocked(saved.audioUnlocked);
      if (typeof saved.closeStudyComplete === 'boolean') setCloseStudyComplete(saved.closeStudyComplete);
      if (Array.isArray(saved.savedSentences)) setSavedSentences(saved.savedSentences);
      if (typeof saved.highlightedParagraphId === 'string') setHighlightedParagraphId(saved.highlightedParagraphId);
      if (typeof saved.firstStartedAt === 'number') setFirstStartedAt(saved.firstStartedAt);
      if (typeof saved.firstElapsed === 'number') setFirstElapsed(saved.firstElapsed);
      if (typeof saved.bestObjectiveCorrect === 'number') setBestObjectiveCorrect(saved.bestObjectiveCorrect);
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!attemptId) return;
    let active = true;
    const frame = window.requestAnimationFrame(() => {
      setLoadingExercises(true);
      fetch(`/api/level2-reading?attempt=${encodeURIComponent(attemptId)}`, { cache: 'no-store' })
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || 'LOAD_FAILED');
          if (active) setStages(payload.stages || []);
        })
        .catch(() => { if (active) setError('تعذّر تحميل أنشطة القراءة. أعد تحميل الصفحة وحاول مرة أخرى.'); })
        .finally(() => { if (active) setLoadingExercises(false); });
    });
    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
    };
  }, [attemptId]);

  useEffect(() => {
    if (!hydrated || !attemptId) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      attemptId, phase, unlockedPhaseIndex, indexes, responses, attempts, grades, reviewIds,
      audioUnlocked, closeStudyComplete, savedSentences, highlightedParagraphId,
      firstStartedAt, firstElapsed, bestObjectiveCorrect,
    }));
  }, [hydrated, attemptId, phase, unlockedPhaseIndex, indexes, responses, attempts, grades, reviewIds, audioUnlocked, closeStudyComplete, savedSentences, highlightedParagraphId, firstStartedAt, firstElapsed, bestObjectiveCorrect]);

  useEffect(() => {
    if (phase !== 'first') return;
    const started = firstStartedAt || Date.now();
    const update = () => setFirstElapsed((current) => Math.max(current, Math.floor((Date.now() - started) / 1000)));
    const frame = window.requestAnimationFrame(() => {
      if (!firstStartedAt) setFirstStartedAt(started);
      update();
    });
    const timer = window.setInterval(update, 1000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
    };
  }, [phase, firstStartedAt]);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const stageId = stageIdForPhase(phase);
  const stage = stages.find((entry) => entry.id === stageId) || null;
  const exerciseIndex = stage ? indexes[stage.id] || 0 : 0;
  const item = stage?.items[exerciseIndex] || null;
  const stageFinished = Boolean(stage && exerciseIndex >= stage.items.length);
  const objectiveItems = useMemo(() => stages.filter((entry) => objectiveStageIds.has(entry.id)).flatMap((entry) => entry.items), [stages]);
  const currentObjectiveCorrect = objectiveItems.filter((entry) => grades[entry.id]?.correct).length;
  const bestCorrect = Math.max(bestObjectiveCorrect, currentObjectiveCorrect);
  const objectivePercent = objectiveItems.length ? Math.round((bestCorrect / objectiveItems.length) * 100) : 0;
  const mastered = objectivePercent >= Number(lesson.mastery.objectivePercent || 75);

  useEffect(() => {
    if (!hydrated || phase !== 'results' || !mastered) return;
    let sections = [false, false, false, false, false, false, false];
    try {
      const parsed = JSON.parse(localStorage.getItem(SECTION_KEY) || '[]');
      if (Array.isArray(parsed)) sections = sections.map((_, index) => Boolean(parsed[index]));
    } catch { /* initialize */ }
    sections[1] = true;
    localStorage.setItem(SECTION_KEY, JSON.stringify(sections));
    markSectionComplete('A2', 1, 'reading');
  }, [hydrated, phase, mastered, objectivePercent]);

  function unlockAndGo(next: Exclude<Phase, 'results'>) {
    const index = phaseOrder.indexOf(next);
    setUnlockedPhaseIndex((current) => Math.max(current, index));
    setPhase(next);
  }

  function setStageIndex(value: number) {
    if (!stage) return;
    setIndexes((current) => ({ ...current, [stage.id]: value }));
  }

  function playAudio(url: string, id: string, paragraphId = '', restart = false) {
    const current = audioRef.current;
    if (current && audioState?.id === id && !restart) {
      if (current.paused) {
        current.playbackRate = audioSpeed;
        void current.play().then(() => { setAudioState({ id, status: 'playing' }); setAudioParagraphId(paragraphId); }).catch(() => setAudioState({ id, status: 'error' }));
      } else {
        current.pause();
        setAudioState({ id, status: 'paused' });
        setAudioParagraphId('');
      }
      return;
    }
    current?.pause();
    const audio = new Audio(url);
    audio.preload = 'metadata';
    audio.playbackRate = audioSpeed;
    audioRef.current = audio;
    audio.onended = () => { setAudioState(null); setAudioParagraphId(''); };
    audio.onerror = () => { setAudioState({ id, status: 'error' }); setAudioParagraphId(''); };
    setAudioState({ id, status: 'loading' });
    setAudioParagraphId(paragraphId);
    void audio.play().then(() => setAudioState({ id, status: 'playing' })).catch(() => setAudioState({ id, status: 'error' }));
  }

  function setSpeed(speed: 0.85 | 1) {
    setAudioSpeed(speed);
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }

  async function submitExercise() {
    if (!item || submitting || grades[item.id]?.correct || grades[item.id]?.reveal) return;
    const attemptNumber = Math.min(2, (attempts[item.id] || 0) + 1);
    setSubmitting(true);
    setError('');
    try {
      const request = await fetch('/api/level2-reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, response: responses[item.id], attemptNumber }),
      });
      const result = await request.json();
      if (!request.ok) throw new Error(result.error || 'GRADE_FAILED');
      const nextGrades = { ...grades, [item.id]: result as GradeResult };
      setGrades(nextGrades);
      setAttempts((current) => ({ ...current, [item.id]: attemptNumber }));
      if (result.reveal) setReviewIds((current) => current.includes(item.id) ? current : [...current, item.id]);
      const nextObjectiveCorrect = objectiveItems.filter((entry) => nextGrades[entry.id]?.correct).length;
      setBestObjectiveCorrect((current) => Math.max(current, nextObjectiveCorrect));
    } catch {
      setError('تعذّر تصحيح الإجابة. إجابتك محفوظة؛ حاول مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  }

  function retryItem() {
    if (!item) return;
    setGrades((current) => { const next = { ...current }; delete next[item.id]; return next; });
    setResponses((current) => ({ ...current, [item.id]: undefined }));
  }

  function nextExercise() {
    if (!stage || !item) return;
    if (exerciseIndex < stage.items.length - 1) setStageIndex(exerciseIndex + 1);
    else setStageIndex(stage.items.length);
  }

  function retryStage() {
    if (!stage) return;
    const ids = new Set(stage.items.map((entry) => entry.id));
    setResponses((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !ids.has(id))));
    setAttempts((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !ids.has(id))));
    setGrades((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !ids.has(id))));
    setStageIndex(0);
  }

  function continueAfterStage() {
    if (!stage) return;
    if (stage.id === 'before') unlockAndGo('first');
    else if (stage.id === 'gist') { setAudioUnlocked(true); unlockAndGo('close'); }
    else if (stage.id === 'details') unlockAndGo('language');
    else if (stage.id === 'language') unlockAndGo('inference');
    else if (stage.id === 'inference') {
      setBestObjectiveCorrect((current) => Math.max(current, currentObjectiveCorrect));
      setPhase('results');
    }
  }

  if (!hydrated) return <main className="level-two-reading"><section className="a2r-loading" aria-live="polite">جارٍ تجهيز درس القراءة…</section></main>;

  return <main className="level-two-reading" dir="rtl">
    <header className="a2r-header">
      <div>
        <Link className="back-link" href="/levels/A2">← المستوى المتوسط · Intermediate</Link>
        <div className="eyebrow">المستوى الثاني · الدرس الأول · قسم القراءة</div>
        <h1>{lesson.titleAr}</h1>
        <p dir="ltr">{lesson.titleEn} · {lesson.estimatedMinutes} minutes</p>
      </div>
      <div className="a2r-header-progress"><strong>{objectivePercent}%</strong><span>أفضل فهم موضوعي</span><small>Best comprehension</small></div>
    </header>

    <nav className="a2r-steps" aria-label="مراحل درس القراءة">
      {phaseOrder.map((entry, index) => <button key={entry} type="button" className={`${phase === entry ? 'active' : ''} ${unlockedPhaseIndex > index ? 'completed' : ''}`} disabled={index > unlockedPhaseIndex} onClick={() => index <= unlockedPhaseIndex && setPhase(entry)}>
        <b>{unlockedPhaseIndex > index ? '✓' : index + 1}</b><span>{phaseLabels[entry].ar}</span><small dir="ltr">{phaseLabels[entry].en}</small>
      </button>)}
    </nav>

    {phase === 'before' && <section className="a2r-panel">
      <OpeningImage />
      <StageRunner stage={stage} item={item} exerciseIndex={exerciseIndex} stageFinished={stageFinished} loading={loadingExercises} response={item ? responses[item.id] : undefined} grade={item ? grades[item.id] : undefined} submitting={submitting} error={error} onResponse={(value: unknown) => item && setResponses((current) => ({ ...current, [item.id]: value }))} onSubmit={() => void submitExercise()} onRetry={retryItem} onNext={nextExercise} onContinue={continueAfterStage} onRetryStage={retryStage} />
    </section>}

    {phase === 'first' && <FirstReading elapsed={firstElapsed} onComplete={() => unlockAndGo('gist')} />}

    {phase === 'gist' && <section className="a2r-panel">
      <div className="a2r-stage-heading"><div><div className="eyebrow">بعد القراءة الصامتة</div><h2>تحقّق من الفكرة العامة</h2><p>أجب عن الأسئلة الأربعة. بعد تسليمها ستُفتح التسجيلات الصوتية.</p></div><LockStatus unlocked={audioUnlocked} /></div>
      <ReadingReference />
      <StageRunner stage={stage} item={item} exerciseIndex={exerciseIndex} stageFinished={stageFinished} loading={loadingExercises} response={item ? responses[item.id] : undefined} grade={item ? grades[item.id] : undefined} submitting={submitting} error={error} onResponse={(value: unknown) => item && setResponses((current) => ({ ...current, [item.id]: value }))} onSubmit={() => void submitExercise()} onRetry={retryItem} onNext={nextExercise} onContinue={continueAfterStage} onRetryStage={retryStage} />
    </section>}

    {phase === 'close' && <section className="a2r-panel">
      {!closeStudyComplete ? <>
        <CloseReadingText audioUnlocked={audioUnlocked} savedSentences={savedSentences} highlightedParagraphId={highlightedParagraphId} audioParagraphId={audioParagraphId} audioState={audioState} audioSpeed={audioSpeed} onHighlight={setHighlightedParagraphId} onSave={(sentence: string) => setSavedSentences((current) => current.includes(sentence) ? current.filter((entry) => entry !== sentence) : [...current, sentence])} onContext={setContextCard} onPlay={playAudio} onSpeed={setSpeed} />
        <div className="a2r-actions"><button type="button" className="primary" onClick={() => setCloseStudyComplete(true)}>ابدأ أسئلة التفاصيل ←</button></div>
      </> : <>
        <details className="a2r-reference-text"><summary>فتح النص والتسجيلات للاستدلال</summary><CloseReadingText audioUnlocked={audioUnlocked} savedSentences={savedSentences} highlightedParagraphId={highlightedParagraphId} audioParagraphId={audioParagraphId} audioState={audioState} audioSpeed={audioSpeed} onHighlight={setHighlightedParagraphId} onSave={(sentence: string) => setSavedSentences((current) => current.includes(sentence) ? current.filter((entry) => entry !== sentence) : [...current, sentence])} onContext={setContextCard} onPlay={playAudio} onSpeed={setSpeed} /></details>
        <StageRunner stage={stage} item={item} exerciseIndex={exerciseIndex} stageFinished={stageFinished} loading={loadingExercises} response={item ? responses[item.id] : undefined} grade={item ? grades[item.id] : undefined} submitting={submitting} error={error} onResponse={(value: unknown) => item && setResponses((current) => ({ ...current, [item.id]: value }))} onSubmit={() => void submitExercise()} onRetry={retryItem} onNext={nextExercise} onContinue={continueAfterStage} onRetryStage={retryStage} />
      </>}
    </section>}

    {(phase === 'language' || phase === 'inference') && <section className="a2r-panel">
      <div className="a2r-stage-heading"><div><div className="eyebrow">{phaseLabels[phase].ar} · <span dir="ltr">{phaseLabels[phase].en}</span></div><h2>{phase === 'language' ? 'افهم الكلمات والبنية من السياق' : 'اقرأ ما بين السطور وقدّم الدليل'}</h2></div></div>
      <ReadingReference />
      <StageRunner stage={stage} item={item} exerciseIndex={exerciseIndex} stageFinished={stageFinished} loading={loadingExercises} response={item ? responses[item.id] : undefined} grade={item ? grades[item.id] : undefined} submitting={submitting} error={error} onResponse={(value: unknown) => item && setResponses((current) => ({ ...current, [item.id]: value }))} onSubmit={() => void submitExercise()} onRetry={retryItem} onNext={nextExercise} onContinue={continueAfterStage} onRetryStage={retryStage} />
    </section>}

    {phase === 'results' && <Results objectivePercent={objectivePercent} objectiveCorrect={bestCorrect} objectiveTotal={objectiveItems.length} mastered={mastered} reviewIds={reviewIds} savedSentences={savedSentences} onReview={() => { setPhase('gist'); setIndexes((current) => ({ ...current, gist: 0 })); }} />}

    {contextCard && <ContextModal card={contextCard} onClose={() => setContextCard(null)} />}
  </main>;
}

function OpeningImage() {
  return <figure className="a2r-opening-image">
    <Image src={IMAGE_URL} alt={`${lesson.openingImage.altAr} ${lesson.openingImage.altEn}`} width={1672} height={941} priority sizes="(max-width: 800px) 100vw, 1120px" />
    <figcaption><span>{lesson.openingImage.altAr}</span><small dir="ltr">{lesson.openingImage.altEn}</small></figcaption>
  </figure>;
}

function FirstReading({ elapsed, onComplete }: { elapsed: number; onComplete: () => void }) {
  return <section className="a2r-panel a2r-first-reading">
    <header className="a2r-stage-heading"><div><div className="eyebrow">القراءة الأولى · First reading</div><h2>{reading.titleAr}</h2><p>اقرأ النص قراءة صامتة لفهم الفكرة العامة. لا تستعمل قاموسًا، ولا توجد ترجمة أو تسجيلات في هذه المرحلة.</p></div><div className="a2r-timer" aria-label={`وقت القراءة ${formatTime(elapsed)}`}><ClockIcon /><strong dir="ltr">{formatTime(elapsed)}</strong><span>مؤقت إرشادي فقط</span></div></header>
    <div className="a2r-clean-text">{reading.paragraphs.map((paragraph, index) => <p key={paragraph.id}><span>{index + 1}</span>{paragraph.textAr}</p>)}</div>
    <div className="a2r-actions"><button type="button" className="primary" onClick={onComplete}>أنهيت القراءة الأولى ←</button></div>
  </section>;
}

function ReadingReference() {
  return <details className="a2r-reference-text">
    <summary>العودة إلى النص للبحث عن الإجابة · Return to the text</summary>
    <div className="a2r-clean-text">{reading.paragraphs.map((paragraph, index) => <p key={paragraph.id}><span>{index + 1}</span>{paragraph.textAr}</p>)}</div>
    <p dir="ltr">Close this reference to continue from the same question.</p>
  </details>;
}

type CloseReadingTextProps = {
  audioUnlocked: boolean; savedSentences: string[]; highlightedParagraphId: string; audioParagraphId: string;
  audioState: AudioState; audioSpeed: 0.85 | 1; onHighlight: (id: string) => void; onSave: (sentence: string) => void;
  onContext: (card: ContextCard) => void; onPlay: (url: string, id: string, paragraphId?: string, restart?: boolean) => void;
  onSpeed: (speed: 0.85 | 1) => void;
};

function CloseReadingText({ audioUnlocked, savedSentences, highlightedParagraphId, audioParagraphId, audioState, audioSpeed, onHighlight, onSave, onContext, onPlay, onSpeed }: CloseReadingTextProps) {
  return <div className="a2r-close-reader">
    <header className="a2r-reader-tools"><div><div className="eyebrow">النص الكامل · 353 كلمة</div><h2>{reading.titleAr}</h2><p>اضغط على الكلمات المظللة لفتح بطاقة السياق، واحفظ الجمل التي تريد مراجعتها.</p></div>{audioUnlocked ? <AudioControls id="reading-full" url={audioUrl(reading.fullAudio)} label="تشغيل النص الكامل" state={audioState} speed={audioSpeed} onPlay={onPlay} onSpeed={onSpeed} /> : <LockStatus unlocked={false} />}</header>
    <div className="a2r-paragraphs">{reading.paragraphs.map((paragraph, index) => <article key={paragraph.id} className={`${highlightedParagraphId === paragraph.id ? 'highlighted' : ''} ${audioParagraphId === paragraph.id ? 'audio-active' : ''}`}>
      <header><strong>الفقرة {index + 1}</strong><div><button type="button" className="a2r-inline-button" onClick={() => onHighlight(highlightedParagraphId === paragraph.id ? '' : paragraph.id)} aria-pressed={highlightedParagraphId === paragraph.id}><HighlightIcon />{highlightedParagraphId === paragraph.id ? 'إلغاء التمييز' : 'تمييز الفقرة'}</button>{audioUnlocked && <AudioControls id={`reading-${paragraph.id}`} url={audioUrl(paragraph.audio)} paragraphId={paragraph.id} label={`تشغيل الفقرة ${index + 1}`} state={audioState} speed={audioSpeed} onPlay={onPlay} onSpeed={onSpeed} />}</div></header>
      <div className="a2r-sentences">{splitSentences(paragraph.textAr).map((sentence, sentenceIndex) => <span className="a2r-sentence" key={`${paragraph.id}-${sentenceIndex}`}><span>{renderTargetText(sentence, onContext)}</span><button type="button" className={savedSentences.includes(sentence) ? 'saved' : ''} onClick={() => onSave(sentence)} aria-label={savedSentences.includes(sentence) ? 'إزالة الجملة من المراجعة' : 'حفظ الجملة للمراجعة'}><BookmarkIcon />{savedSentences.includes(sentence) ? 'محفوظة' : 'احفظ الجملة'}</button></span>)}</div>
    </article>)}</div>
  </div>;
}

function splitSentences(text: string) {
  return text.split(/(?<=[.؟!»،])\s+/u).filter(Boolean);
}

function renderTargetText(sentence: string, onContext: (card: ContextCard) => void) {
  return sentence.split(/(\s+)/u).map((part, index) => {
    const target = targetForToken(part);
    return target ? <button type="button" className="a2r-target-word" key={index} onClick={() => onContext({ target, sentence })}>{part}</button> : <span key={index}>{part}</span>;
  });
}

type StageRunnerProps = {
  stage?: PublicStage | null; item?: PublicExercise | null; exerciseIndex: number; stageFinished: boolean; loading: boolean;
  response: unknown; grade?: GradeResult; submitting: boolean; error: string;
  onResponse: (value: unknown) => void; onSubmit: () => void; onRetry: () => void; onNext: () => void;
  onContinue: () => void; onRetryStage: () => void;
};

function StageRunner({ stage, item, exerciseIndex, stageFinished, loading, response, grade, submitting, error, onResponse, onSubmit, onRetry, onNext, onContinue, onRetryStage }: StageRunnerProps) {
  if (loading) return <div className="a2r-loading" aria-live="polite">جارٍ تحميل الأنشطة المحمية…</div>;
  if (!stage) return <p className="a2r-error" role="alert">لم تُحمّل بيانات هذه المرحلة.</p>;
  if (stageFinished) {
    return <div className="a2r-stage-complete" aria-live="polite"><div className="a2r-complete-mark"><CheckIcon /></div><div className="eyebrow">اكتملت مرحلة {stage.titleAr}</div><h2>{stage.id === 'gist' ? 'أحسنت، فُتحت الآن تسجيلات النص.' : 'حُفظت إجابات هذه المرحلة.'}</h2><p>{stage.id === 'before' ? 'توقعاتك محفوظة ولا تدخل في النتيجة.' : 'يمكنك العودة إلى النص في أي وقت للمراجعة.'}</p><div className="a2r-actions"><button type="button" className="secondary" onClick={onRetryStage}>إعادة المرحلة</button><button type="button" className="primary" onClick={onContinue}>{stage.id === 'inference' ? 'عرض النتيجة النهائية' : 'المرحلة التالية ←'}</button></div></div>;
  }
  if (!item) return null;
  return <div className="a2r-exercise">
    <header className="a2r-exercise-head"><div><div className="eyebrow">{stage.titleAr} · <span dir="ltr">{stage.titleEn}</span></div><h2>النشاط {exerciseIndex + 1} من {stage.items.length}</h2></div><strong>{Math.round(((exerciseIndex + 1) / stage.items.length) * 100)}%</strong></header>
    <div className="a2r-progress"><span style={{ width: `${((exerciseIndex + 1) / stage.items.length) * 100}%` }} /></div>
    <ExerciseField key={item.id} item={item} value={response} disabled={Boolean(grade)} onChange={onResponse} />
    <details className="a2r-english-instruction"><summary>Show English instruction</summary><p dir="ltr">{item.promptEn}</p></details>
    {grade && <Feedback result={grade} />}
    {error && <p className="a2r-error" role="alert">{error}</p>}
    <div className="a2r-actions">
      {!grade && <button type="button" className="primary" disabled={submitting || !hasResponse(item, response)} onClick={onSubmit}>{submitting ? 'جارٍ التصحيح…' : item.type.startsWith('prediction') ? 'حفظ التوقع' : 'تحقق من الإجابة'}</button>}
      {grade && !grade.correct && !grade.reveal && <button type="button" className="primary" onClick={onRetry}>المحاولة الثانية</button>}
      {grade && (grade.correct || grade.reveal) && <button type="button" className="primary" onClick={onNext}>{exerciseIndex === stage.items.length - 1 ? 'إنهاء المرحلة' : 'النشاط التالي ←'}</button>}
    </div>
  </div>;
}

function ExerciseField({ item, value, disabled, onChange }: { item: PublicExercise; value: unknown; disabled: boolean; onChange: (value: unknown) => void }) {
  const selected = Array.isArray(value) ? value as string[] : [];
  const objectValue = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const textValue = typeof value === 'string' ? value : '';
  const choiceTypes = ['singleChoice', 'predictionChoice', 'contextMeaning', 'fillBlank', 'reference', 'trueFalse'];
  return <div className="a2r-field">
    <h3>{item.promptAr}</h3>
    {item.type === 'imageObservation' && item.image && <Image className="a2r-question-image" src={item.image} alt={lesson.openingImage.altAr} width={1672} height={941} sizes="(max-width: 800px) 100vw, 850px" />}
    {choiceTypes.includes(item.type) && <div className="a2r-choices">{item.choices?.map((choice: string) => <button type="button" disabled={disabled} className={value === choice ? 'selected' : ''} key={choice} onClick={() => onChange(choice)}>{choice}</button>)}</div>}
    {item.type === 'multiSelect' && <div className="a2r-choices multi">{item.choices?.map((choice: string) => <button type="button" disabled={disabled} className={selected.includes(choice) ? 'selected' : ''} aria-pressed={selected.includes(choice)} key={choice} onClick={() => onChange(selected.includes(choice) ? selected.filter((entry) => entry !== choice) : [...selected, choice])}>{choice}</button>)}</div>}
    {item.type === 'sequence' && <SequenceField events={item.events || []} selected={selected} disabled={disabled} onChange={onChange} />}
    {(item.type === 'imageObservation' || item.type === 'predictionOpen' || item.type === 'shortEvidence' || item.type === 'discussion') && <textarea className="a2r-textarea" value={textValue} disabled={disabled} onChange={(event) => onChange(event.target.value)} placeholder={item.type === 'imageObservation' ? 'مثال: يخططون، يدرسون، يتواصلون…' : 'اكتب إجابتك بالعربية…'} />}
    {item.type === 'vocabularyActivation' && <VocabularyActivation item={item} value={objectValue} disabled={disabled} onChange={onChange} />}
    {item.type === 'summaryBuilder' && <SummaryBuilder value={objectValue} disabled={disabled} onChange={onChange} />}
    {item.type === 'transferTask' && <TransferTask item={item} value={textValue} disabled={disabled} onChange={onChange} />}
  </div>;
}

function SequenceField({ events, selected, disabled, onChange }: { events: string[]; selected: string[]; disabled: boolean; onChange: (value: unknown) => void }) {
  return <div className="a2r-sequence"><div className="a2r-ordered-list">{selected.length ? selected.map((event, index) => <div key={event}><b>{index + 1}</b><span>{event}</span><button type="button" disabled={disabled} onClick={() => onChange(selected.filter((entry) => entry !== event))} aria-label={`إزالة ${event}`}>×</button></div>) : <p>اضغط على الأحداث بالترتيب الصحيح.</p>}</div><div className="a2r-token-bank">{events.map((event) => <button type="button" key={event} disabled={disabled || selected.includes(event)} onClick={() => onChange([...selected, event])}>{event}</button>)}</div><button type="button" className="a2r-small-button" disabled={disabled || selected.length === 0} onClick={() => onChange(selected.slice(0, -1))}>تراجع عن آخر حدث</button></div>;
}

function VocabularyActivation({ item, value, disabled, onChange }: { item: PublicExercise; value: Record<string, unknown>; disabled: boolean; onChange: (value: unknown) => void }) {
  const selections = Array.isArray(value.selections) ? value.selections.map(String) : [];
  return <div className="a2r-activation"><div className="a2r-target-grid">{item.targetVocabulary?.map((target) => <button type="button" key={target} disabled={disabled} className={selections.includes(target) ? 'selected' : ''} onClick={() => onChange({ ...value, selections: selections.includes(target) ? selections.filter((entry) => entry !== target) : [...selections, target] })}>{target}</button>)}</div><label>فسّر اختيارك بجملة واحدة<textarea value={String(value.explanation || '')} disabled={disabled} onChange={(event) => onChange({ ...value, explanation: event.target.value })} placeholder="أتوقع هذه الكلمات لأن…" /></label><small>{selections.length}/{item.minimumSelections || 4} كلمات مختارة</small></div>;
}

function SummaryBuilder({ value, disabled, onChange }: { value: Record<string, unknown>; disabled: boolean; onChange: (value: unknown) => void }) {
  const parts = [
    ['beginning', 'البداية'], ['planning', 'التخطيط'], ['problem', 'المشكلة'], ['result', 'النتيجة'],
  ];
  const combined = parts.map(([id]) => String(value[id] || '')).join(' ');
  return <div className="a2r-summary-builder">{parts.map(([id, label], index) => <label key={id}><span>{index + 1}</span>{label}<textarea value={String(value[id] || '')} disabled={disabled} onChange={(event) => onChange({ ...value, [id]: event.target.value })} placeholder={`جملة عن ${label}…`} /></label>)}<LiveTargets text={combined} minimum={4} /></div>;
}

function TransferTask({ item, value, disabled, onChange }: { item: PublicExercise; value: string; disabled: boolean; onChange: (value: unknown) => void }) {
  const words = countWords(value);
  const terms = detectedTargets(value);
  const inRange = words >= Number(item.minimumWords) && words <= Number(item.maximumWords);
  return <div className="a2r-transfer"><div className="a2r-requirements" aria-live="polite"><span className={inRange ? 'met' : ''}>{words}/{item.minimumWords}–{item.maximumWords} كلمة</span><span className={terms.length >= Number(item.minimumTargetVocabulary) ? 'met' : ''}>{terms.length}/{item.minimumTargetVocabulary} مفردات مستهدفة</span><span>الموضوع · المهام · الأدوات · المشكلة</span></div><textarea className="a2r-textarea large" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} placeholder="اقترح مشروعك الثقافي هنا…" /><LiveTargets text={value} minimum={Number(item.minimumTargetVocabulary)} /></div>;
}

function LiveTargets({ text, minimum }: { text: string; minimum: number }) {
  const terms = detectedTargets(text);
  return <div className="a2r-live-targets"><strong>المفردات المكتشفة قبل التسليم:</strong>{terms.length ? <div>{terms.map((term) => <span key={term}>{term}</span>)}</div> : <p>لم تُكتشف مفردات مستهدفة بعد.</p>}<small className={terms.length >= minimum ? 'met' : ''}>{terms.length >= minimum ? 'اكتمل شرط المفردات.' : `تحتاج إلى ${minimum - terms.length} مفردات إضافية.`}</small></div>;
}

function Feedback({ result }: { result: GradeResult }) {
  return <div className={`a2r-feedback ${result.correct ? 'correct' : 'wrong'}`} role="status" aria-live="polite"><strong>{result.feedbackAr}</strong><span dir="ltr">{result.feedbackEn}</span>{result.missingRequirements && result.missingRequirements.length > 0 && <div className="a2r-missing"><b>المتطلبات الناقصة:</b>{result.missingRequirements.map((entry) => <span key={entry}>{entry}</span>)}</div>}{result.detectedTerms && result.detectedTerms.length > 0 && <div className="a2r-detected">{result.detectedTerms.map((entry) => <span key={entry}>{entry}</span>)}</div>}{result.rubricScore && <div className="a2r-rubric">{Object.entries(result.rubricScore).map(([key, score]) => <span key={key}>{key}: {score}</span>)}</div>}{result.reveal && result.modelAnswer !== undefined && <div className="a2r-model"><b>الدليل أو النموذج:</b><p>{typeof result.modelAnswer === 'string' ? result.modelAnswer : JSON.stringify(result.modelAnswer)}</p></div>}</div>;
}

function AudioControls({ id, url, paragraphId = '', label, state, speed, onPlay, onSpeed }: { id: string; url: string; paragraphId?: string; label: string; state: AudioState; speed: 0.85 | 1; onPlay: (url: string, id: string, paragraphId?: string, restart?: boolean) => void; onSpeed: (speed: 0.85 | 1) => void }) {
  const own = state?.id === id;
  const playing = own && state.status === 'playing';
  return <div className="a2r-audio-controls"><button type="button" onClick={() => onPlay(url, id, paragraphId)} aria-label={label}>{own && state.status === 'loading' ? <LoadingIcon /> : playing ? <PauseIcon /> : <PlayIcon />}</button><button type="button" onClick={() => onPlay(url, id, paragraphId, true)} aria-label={`إعادة ${label} من البداية`}><ReplayIcon /></button><label><span className="sr-only">سرعة الصوت</span><select value={speed} onChange={(event) => onSpeed(Number(event.target.value) as 0.85 | 1)} aria-label="سرعة الصوت"><option value="0.85">0.85×</option><option value="1">1×</option></select></label>{own && state.status === 'error' && <span className="a2r-audio-error" role="alert">تعذّر الصوت</span>}</div>;
}

function LockStatus({ unlocked }: { unlocked: boolean }) {
  return <div className={`a2r-lock-status ${unlocked ? 'unlocked' : ''}`}>{unlocked ? <CheckIcon /> : <LockIcon />}<span>{unlocked ? 'التسجيلات متاحة' : 'التسجيلات مقفلة حتى تسليم أسئلة الفكرة العامة'}</span></div>;
}

function ContextModal({ card, onClose }: { card: NonNullable<ContextCard>; onClose: () => void }) {
  return <div className="a2r-modal-backdrop" role="presentation" onClick={onClose}><div className="a2r-context-card" role="dialog" aria-modal="true" aria-labelledby="a2r-context-title" onClick={(event) => event.stopPropagation()}><button type="button" className="a2r-modal-close" onClick={onClose} aria-label="إغلاق بطاقة السياق">×</button><div className="eyebrow">مفردة داخل السياق</div><h2 id="a2r-context-title">{card.target}</h2><p>{card.sentence}</p><Link href="/levels/A2/lessons/1/vocabulary">افتح عائلة الكلمة في قسم المفردات ←</Link><small>لا تعرض هذه البطاقة ترجمة كاملة؛ استعمل السياق لفهم المعنى.</small></div></div>;
}

function Results({ objectivePercent, objectiveCorrect, objectiveTotal, mastered, reviewIds, savedSentences, onReview }: { objectivePercent: number; objectiveCorrect: number; objectiveTotal: number; mastered: boolean; reviewIds: string[]; savedSentences: string[]; onReview: () => void }) {
  return <section className="a2r-panel a2r-results"><div className={`a2r-result-ring ${mastered ? 'passed' : ''}`}><strong>{objectivePercent}%</strong><span>{objectiveCorrect}/{objectiveTotal}</span></div><div className="eyebrow">نتيجة قراءة الدرس الأول · Reading result</div><h2>{mastered ? 'أحسنت! أتقنت قراءة «مشروع صغير يُعَرِّفُ بمدينة وليلي».' : 'أكملت القراءة، لكن بعض أهداف الفهم تحتاج إلى مراجعة.'}</h2><p>الحد المطلوب للفهم الموضوعي 75٪. · A score of 75% is required.</p><div className="a2r-result-grid"><article><strong>{mastered ? 'مكتمل · Complete' : 'راجع · Review'}</strong><span>الفهم الموضوعي · Comprehension</span></article><article><strong>{savedSentences.length}</strong><span>جمل محفوظة · Saved sentences</span></article><article><strong>{reviewIds.length}</strong><span>أنشطة للمراجعة · Review items</span></article></div>{reviewIds.length > 0 && <div className="a2r-review-list"><strong>راجع الأنشطة · Review:</strong>{reviewIds.map((id) => <span key={id}>{id}</span>)}</div>}<LessonCompletion level="A2" lesson={1} section="reading" passed={mastered} score={`${objectivePercent}% · ${objectiveCorrect}/${objectiveTotal}`} onRetry={onReview} /></section>;
}

function PlayIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>; }
function PauseIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z" fill="currentColor" /></svg>; }
function ReplayIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V3m0 0h5M4 3l3.5 3.5A8 8 0 1 1 4 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function LoadingIcon() { return <svg className="loading" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>; }
function ClockIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>; }
function BookmarkIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12v17l-6-4-6 4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>; }
function HighlightIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 16 9-9 3 3-9 9H5zm8-10 2-2 3 3-2 2M4 21h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function LockIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2" /></svg>; }
function CheckIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
