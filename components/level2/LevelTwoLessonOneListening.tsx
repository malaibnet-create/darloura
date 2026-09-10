'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { markSectionComplete } from '../../lib/learning-progress';
import { userStorage as localStorage } from '../../lib/user-scoped-storage.mjs';
import LessonCompletion from '../learning/LessonCompletion';

type Phase = 'before' | 'first' | 'gist' | 'details' | 'language' | 'inference' | 'results';
type PublicExercise = {
  id: string; type: string; promptAr: string; promptEn: string;
  audio?: string; choices?: string[]; events?: string[]; image?: string; words?: string[];
  minimumWords?: number; maximumWords?: number; minimumTargetVocabulary?: number;
};
type PublicStage = { id: string; titleAr: string; titleEn: string; audio?: string; items: PublicExercise[] };
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
type Transcript = {
  speakers: Array<{ id: string; nameAr: string; roleAr: string }>;
  turns: Array<{ id: string; speaker: string; displayAr: string }>;
};
type LessonInfo = { titleAr: string; titleEn: string; estimatedMinutes: number; openingImage: { altAr: string; altEn: string } };
type LessonPayload = {
  lesson: LessonInfo;
  listening: { fullAudio: string };
  stages: PublicStage[];
};
type SavedProgress = {
  attemptId?: string; phase?: Phase; unlockedPhaseIndex?: number; indexes?: Record<string, number>;
  responses?: Record<string, unknown>; attempts?: Record<string, number>; grades?: Record<string, GradeResult>;
  reviewIds?: string[]; playCounts?: Record<string, number>; audioCompleted?: Record<string, boolean>;
  bestObjectiveCorrect?: number;
};

const STORAGE_KEY = 'darlugha-a2-lesson-1-listening';
const SECTION_KEY = 'darlugha-a2-lesson-1-sections';
const RECORDING_DB = 'darlugha-listening-recordings';
const RECORDING_STORE = 'responses';
const RECORDING_KEY = 'a2-lesson-1-solution';
const objectiveStageIds = new Set(['gist', 'details', 'language', 'inference']);
const phaseOrder: Exclude<Phase, 'results'>[] = ['before', 'first', 'gist', 'details', 'language', 'inference'];
const phaseLabels: Record<Phase, { ar: string; en: string }> = {
  before: { ar: 'قبل الاستماع', en: 'Before' },
  first: { ar: 'الاستماع الأول', en: 'First listen' },
  gist: { ar: 'الفكرة العامة', en: 'Gist' },
  details: { ar: 'التفاصيل', en: 'Details' },
  language: { ar: 'اللغة في السياق', en: 'Language' },
  inference: { ar: 'الاستنتاج', en: 'Inference' },
  results: { ar: 'المراجعة', en: 'Review' },
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
  { target: 'تَطَوَّرَ', patterns: [/^(تطور|يتطور|متطور|تطوير)/u] },
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

function detectedTargets(value: string) {
  const tokens = value.split(/\s+/u).map((token) => {
    const normalized = normalizeArabic(token);
    return targetRules.find((rule) => rule.patterns.some((pattern) => pattern.test(normalized)))?.target || '';
  }).filter(Boolean);
  return [...new Set(tokens)];
}

function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/u).length : 0;
}

function hasResponse(item: PublicExercise, value: unknown) {
  if (item.type === 'summaryBuilder') {
    return value && typeof value === 'object' && Object.values(value as Record<string, unknown>).some((entry) => String(entry || '').trim());
  }
  if (item.type === 'solutionTask') {
    if (typeof value === 'string') return Boolean(value.trim());
    const data = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    return Boolean(String(data.text || '').trim()) || data.hasRecording === true;
  }
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(String(value ?? '').trim());
}

function stageForPhase(stages: PublicStage[], phase: Phase) {
  return stages.find((stage) => stage.id === phase);
}

function openRecordingDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(RECORDING_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(RECORDING_STORE)) request.result.createObjectStore(RECORDING_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveRecording(blob: Blob | null) {
  const db = await openRecordingDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(RECORDING_STORE, 'readwrite');
    const store = transaction.objectStore(RECORDING_STORE);
    const request = blob ? store.put(blob, RECORDING_KEY) : store.delete(RECORDING_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  db.close();
}

async function loadRecording() {
  const db = await openRecordingDb();
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const request = db.transaction(RECORDING_STORE, 'readonly').objectStore(RECORDING_STORE).get(RECORDING_KEY);
    request.onsuccess = () => resolve(request.result as Blob | undefined);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return blob;
}

export default function LevelTwoLessonOneListening() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [payload, setPayload] = useState<LessonPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attemptId, setAttemptId] = useState('');
  const [phase, setPhase] = useState<Phase>('before');
  const [unlockedPhaseIndex, setUnlockedPhaseIndex] = useState(0);
  const [indexes, setIndexes] = useState<Record<string, number>>({});
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [grades, setGrades] = useState<Record<string, GradeResult>>({});
  const [reviewIds, setReviewIds] = useState<string[]>([]);
  const [bestObjectiveCorrect, setBestObjectiveCorrect] = useState(0);
  const [playCounts, setPlayCounts] = useState<Record<string, number>>({});
  const [audioCompleted, setAudioCompleted] = useState<Record<string, boolean>>({});
  const [audioState, setAudioState] = useState<AudioState>(null);
  const [audioSpeed, setAudioSpeed] = useState<0.9 | 1>(1);
  const [audioAnnouncement, setAudioAnnouncement] = useState('');
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let saved: SavedProgress = {};
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { /* Ignore invalid local progress. */ }
    const id = typeof saved.attemptId === 'string' ? saved.attemptId : crypto.randomUUID();
    const frame = window.requestAnimationFrame(() => {
      setAttemptId(id);
      if (saved.phase && ((phaseOrder as readonly Phase[]).includes(saved.phase) || saved.phase === 'results')) setPhase(saved.phase);
      if (typeof saved.unlockedPhaseIndex === 'number' && Number.isInteger(saved.unlockedPhaseIndex)) setUnlockedPhaseIndex(saved.unlockedPhaseIndex);
      if (saved.indexes) setIndexes(saved.indexes);
      if (saved.responses) setResponses(saved.responses);
      if (saved.attempts) setAttempts(saved.attempts);
      if (saved.grades) setGrades(saved.grades);
      if (saved.reviewIds) setReviewIds(saved.reviewIds);
      if (saved.playCounts) setPlayCounts(saved.playCounts);
      if (saved.audioCompleted) setAudioCompleted(saved.audioCompleted);
      if (typeof saved.bestObjectiveCorrect === 'number') setBestObjectiveCorrect(saved.bestObjectiveCorrect);
    });
    let active = true;
    fetch(`/api/level2-listening?attempt=${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('LOAD_FAILED');
        return response.json();
      })
      .then((data) => { if (active) setPayload(data); })
      .catch(() => { if (active) setError('تعذّر تحميل أنشطة الاستماع. حدّث الصفحة وحاول مرة أخرى.'); })
      .finally(() => { if (active) { setLoading(false); setHydrated(true); } });
    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      attemptId, phase, unlockedPhaseIndex, indexes, responses, attempts, grades, reviewIds,
      playCounts, audioCompleted, bestObjectiveCorrect,
    }));
  }, [hydrated, attemptId, phase, unlockedPhaseIndex, indexes, responses, attempts, grades, reviewIds, playCounts, audioCompleted, bestObjectiveCorrect]);

  const objectiveItems = useMemo(() => payload?.stages.filter((stage) => objectiveStageIds.has(stage.id)).flatMap((stage) => stage.items) || [], [payload]);
  const objectiveComplete = objectiveItems.length > 0 && objectiveItems.every((item) => Boolean(grades[item.id]));
  const currentObjectiveCorrect = objectiveItems.filter((item) => grades[item.id]?.correct).length;
  const bestCorrect = Math.max(bestObjectiveCorrect, currentObjectiveCorrect);
  const objectivePercent = objectiveItems.length ? Math.round((bestCorrect / objectiveItems.length) * 100) : 0;
  const mastered = objectivePercent >= 75;

  useEffect(() => {
    if (!objectiveComplete || transcript) return;
    fetch('/api/level2-listening', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'transcript', submittedIds: objectiveItems.filter((item) => grades[item.id]).map((item) => item.id) }),
    }).then(async (response) => {
      if (!response.ok) throw new Error('TRANSCRIPT_LOCKED');
      return response.json();
    }).then(setTranscript).catch(() => undefined);
  }, [objectiveComplete, grades, objectiveItems, transcript]);

  useEffect(() => {
    if (!hydrated || !mastered) return;
    try {
      const current = JSON.parse(localStorage.getItem(SECTION_KEY) || '[]');
      const progress = Array.from({ length: 7 }, (_, index) => Boolean(current[index]));
      progress[2] = true;
      localStorage.setItem(SECTION_KEY, JSON.stringify(progress));
      markSectionComplete('A2', 1, 'listening');
    } catch { /* Progress will be retried after the next answer. */ }
  }, [hydrated, mastered, objectivePercent]);

  function unlockAndGo(next: Exclude<Phase, 'results'>) {
    audioRef.current?.pause();
    setAudioState(null);
    const index = phaseOrder.indexOf(next);
    setUnlockedPhaseIndex((current) => Math.max(current, index));
    setPhase(next);
  }

  function playAudio(url: string, id: string, label: string, restart = false) {
    const current = audioRef.current;
    if (current && audioState?.id === id && !restart) {
      if (current.paused) {
        current.playbackRate = audioSpeed;
        void current.play().then(() => setAudioState({ id, status: 'playing' })).catch(() => setAudioState({ id, status: 'error' }));
      } else {
        current.pause();
        setAudioState({ id, status: 'paused' });
      }
      return;
    }
    const used = playCounts[id] || 0;
    if (used >= 2) {
      setAudioAnnouncement(`استهلكت مرتي الاستماع المتاحتين لـ${label}.`);
      return;
    }
    current?.pause();
    const audio = new Audio(url);
    audio.preload = 'metadata';
    audio.playbackRate = audioSpeed;
    audioRef.current = audio;
    setAudioState({ id, status: 'loading' });
    audio.onended = () => {
      setAudioCompleted((state) => ({ ...state, [id]: true }));
      setAudioState(null);
      setAudioAnnouncement(`اكتمل ${label}. تبقّت ${Math.max(0, 1 - used)} مرة.`);
    };
    audio.onerror = () => setAudioState({ id, status: 'error' });
    void audio.play().then(() => {
      setPlayCounts((state) => ({ ...state, [id]: used + 1 }));
      setAudioState({ id, status: 'playing' });
      setAudioAnnouncement(`بدأ ${label}. هذه المرة ${used + 1} من مرتين.`);
    }).catch(() => setAudioState({ id, status: 'error' }));
  }

  async function submitExercise(item: PublicExercise) {
    if (submitting || grades[item.id]?.correct || grades[item.id]?.reveal) return;
    const attemptNumber = Math.min(2, (attempts[item.id] || 0) + 1);
    setSubmitting(true);
    setError('');
    try {
      const request = await fetch('/api/level2-listening', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: item.id, response: responses[item.id], attemptNumber }),
      });
      const result = await request.json();
      if (!request.ok) throw new Error(result.error || 'GRADE_FAILED');
      const nextGrades = { ...grades, [item.id]: result as GradeResult };
      setGrades(nextGrades);
      setAttempts((current) => ({ ...current, [item.id]: attemptNumber }));
      if (result.reveal) setReviewIds((current) => current.includes(item.id) ? current : [...current, item.id]);
      const nextCorrect = objectiveItems.filter((entry) => nextGrades[entry.id]?.correct).length;
      setBestObjectiveCorrect((current) => Math.max(current, nextCorrect));
    } catch {
      setError('تعذّر تصحيح الإجابة. إجابتك محفوظة؛ حاول مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  }

  function retryItem(item: PublicExercise) {
    setGrades((current) => { const next = { ...current }; delete next[item.id]; return next; });
    setResponses((current) => { const next = { ...current }; delete next[item.id]; return next; });
  }

  function nextExercise(stage: PublicStage) {
    const index = indexes[stage.id] || 0;
    if (index < stage.items.length - 1) setIndexes((current) => ({ ...current, [stage.id]: index + 1 }));
    else setIndexes((current) => ({ ...current, [stage.id]: stage.items.length }));
  }

  function retryStage(stage: PublicStage) {
    const ids = new Set(stage.items.map((item) => item.id));
    setIndexes((current) => ({ ...current, [stage.id]: 0 }));
    setResponses((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !ids.has(id))));
    setAttempts((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !ids.has(id))));
    setGrades((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !ids.has(id))));
  }

  function continueAfterStage(stage: PublicStage) {
    const next: Record<string, Exclude<Phase, 'results'>> = { before: 'first', gist: 'details', details: 'language', language: 'inference' };
    if (stage.id === 'inference') {
      setBestObjectiveCorrect((current) => Math.max(current, currentObjectiveCorrect));
      setPhase('results');
      return;
    }
    unlockAndGo(next[stage.id]);
  }

  if (loading || !payload) return <main className="a2l-page" dir="rtl"><div className="a2l-loading" aria-live="polite">جارٍ إعداد درس الاستماع…</div>{error && <p role="alert">{error}</p>}</main>;

  const stage = stageForPhase(payload.stages, phase);
  const stageIndex = stage ? indexes[stage.id] || 0 : 0;
  const item = stage?.items[stageIndex];
  const stageFinished = Boolean(stage && stageIndex >= stage.items.length);
  const audioKey = item?.audio ? `${phase}-${item.audio.split('/').pop()?.replace('.mp3', '')}` : '';

  return <main className="a2l-page" dir="rtl">
    <header className="a2l-hero">
      <div><Link href="/levels/A2">← المستوى المتوسط · Intermediate</Link><div className="eyebrow">المستوى المتوسط · الدرس الأول · Listening</div><h1>{payload.lesson.titleAr}</h1><p dir="ltr">{payload.lesson.titleEn} · {payload.lesson.estimatedMinutes} minutes</p></div>
      <div className="a2l-hero-meta"><strong>{objectivePercent}%</strong><span>أفضل فهم موضوعي</span><label>سرعة الصوت<select value={audioSpeed} onChange={(event) => { const speed = Number(event.target.value) as 0.9 | 1; setAudioSpeed(speed); if (audioRef.current) audioRef.current.playbackRate = speed; }} aria-label="سرعة الصوت"><option value="0.9">0.9×</option><option value="1">1×</option></select></label></div>
    </header>

    <nav className="a2l-steps" aria-label="مراحل درس الاستماع">{phaseOrder.map((entry, index) => <button key={entry} type="button" className={`${phase === entry ? 'active' : ''} ${unlockedPhaseIndex > index ? 'completed' : ''}`} disabled={index > unlockedPhaseIndex} onClick={() => index <= unlockedPhaseIndex && setPhase(entry)}><b>{unlockedPhaseIndex > index ? <CheckIcon /> : index + 1}</b><span>{phaseLabels[entry].ar}</span><small dir="ltr">{phaseLabels[entry].en}</small></button>)}</nav>
    <p className="sr-only" aria-live="polite">{audioAnnouncement}</p>

    {phase === 'before' && <section className="a2l-panel"><StageRunner stage={stage} item={item} exerciseIndex={stageIndex} stageFinished={stageFinished} response={item ? responses[item.id] : undefined} grade={item ? grades[item.id] : undefined} submitting={submitting} error={error} lesson={payload.lesson} onResponse={(value: unknown) => item && setResponses((current) => ({ ...current, [item.id]: value }))} onSubmit={() => item && void submitExercise(item)} onRetry={() => item && retryItem(item)} onNext={() => stage && nextExercise(stage)} onContinue={() => stage && continueAfterStage(stage)} onRetryStage={() => stage && retryStage(stage)} /></section>}

    {phase === 'first' && <section className="a2l-panel a2l-first-listen"><div className="a2l-first-copy"><div className="eyebrow">الاستماع الأول · من دون نص أو ترجمة</div><h2>استمع إلى الحوار كاملًا</h2><p>ركّز على موضوع الحوار، والمتحدثين، والمشكلتين، والقرار العام. لا يظهر النص ولا يوجد شريط للتقديم.</p><div className="a2l-listening-tips"><span><HeadphonesIcon />استمع مرة للفكرة العامة</span><span><LockIcon />النص مقفل حتى نهاية أسئلة الفهم</span></div></div><LimitedAudioControl id="first-full" url={payload.listening.fullAudio} label="الحوار الكامل" state={audioState} count={playCounts['first-full'] || 0} speed={audioSpeed} onPlay={playAudio} />{audioCompleted['first-full'] ? <button type="button" className="a2l-primary" onClick={() => unlockAndGo('gist')}>أجب عن أسئلة الفكرة العامة ←</button> : <p className="a2l-audio-note">استمع إلى نهاية الحوار مرة واحدة على الأقل لفتح الأسئلة.</p>}</section>}

    {(phase === 'gist' || phase === 'details' || phase === 'language' || phase === 'inference') && <section className="a2l-panel"><div className="a2l-stage-heading"><div><div className="eyebrow">{phaseLabels[phase].ar} · <span dir="ltr">{phaseLabels[phase].en}</span></div><h2>{phase === 'gist' ? 'اختر الفكرة العامة بعد الاستماع الكامل' : phase === 'details' ? 'استمع إلى المقاطع الأربعة بالترتيب' : phase === 'language' ? 'افهم الكلمات والصيغ داخل السياق المسموع' : 'استنتج الأسباب والنتائج من الحوار'}</h2>{phase === 'details' && <p>كل مقطع متاح مرتين، وتظهر أسئلته تحته قبل فتح المقطع التالي.</p>}</div></div>{phase === 'inference' && <div className="a2l-inference-replay"><strong>استمع إلى الحوار مرة أخرى قبل الإجابة · Listen again before answering</strong><LimitedAudioControl id="inference-review" url={payload.listening.fullAudio} label="الحوار الكامل للمراجعة" state={audioState} count={playCounts['inference-review'] || 0} speed={audioSpeed} onPlay={playAudio} /></div>}{item?.audio && <LimitedAudioControl id={audioKey} url={item.audio} label={`المقطع ${item.audio.match(/(\d+)/)?.[1] || ''}`} state={audioState} count={playCounts[audioKey] || 0} speed={audioSpeed} onPlay={playAudio} />}<StageRunner stage={stage} item={item} exerciseIndex={stageIndex} stageFinished={stageFinished} response={item ? responses[item.id] : undefined} grade={item ? grades[item.id] : undefined} submitting={submitting} error={error} lesson={payload.lesson} onResponse={(value: unknown) => item && setResponses((current) => ({ ...current, [item.id]: value }))} onSubmit={() => item && void submitExercise(item)} onRetry={() => item && retryItem(item)} onNext={() => stage && nextExercise(stage)} onContinue={() => stage && continueAfterStage(stage)} onRetryStage={() => stage && retryStage(stage)} /></section>}

    {phase === 'results' && <Results objectivePercent={objectivePercent} objectiveCorrect={bestCorrect} objectiveTotal={objectiveItems.length} mastered={mastered} transcript={transcript} reviewIds={reviewIds} onReview={() => { setPhase('gist'); setIndexes((current) => ({ ...current, gist: 0 })); }} />}
  </main>;
}

type StageRunnerProps = {
  stage?: PublicStage; item?: PublicExercise; exerciseIndex: number; stageFinished: boolean; response: unknown;
  grade?: GradeResult; submitting: boolean; error: string; lesson: LessonInfo; onResponse: (value: unknown) => void;
  onSubmit: () => void; onRetry: () => void; onNext: () => void; onContinue: () => void; onRetryStage: () => void;
};

function StageRunner({ stage, item, exerciseIndex, stageFinished, response, grade, submitting, error, lesson, onResponse, onSubmit, onRetry, onNext, onContinue, onRetryStage }: StageRunnerProps) {
  if (!stage) return <p className="a2l-error" role="alert">لم تُحمّل بيانات هذه المرحلة.</p>;
  if (stageFinished) return <div className="a2l-stage-complete" aria-live="polite"><div className="a2l-complete-mark"><CheckIcon /></div><div className="eyebrow">اكتملت مرحلة {stage.titleAr}</div><h2>{stage.id === 'gist' ? 'أحسنت، انتقل الآن إلى المقاطع التفصيلية.' : stage.id === 'inference' ? 'اكتملت أسئلة الفهم وفُتح نص المراجعة.' : 'حُفظت إجابات هذه المرحلة.'}</h2><p>{stage.id === 'before' ? 'توقعاتك محفوظة للمقارنة ولا تدخل في النتيجة.' : 'يمكنك مراجعة الاستماع ثم متابعة المرحلة التالية.'}</p><div className="a2l-actions"><button type="button" className="a2l-secondary" onClick={onRetryStage}>إعادة المرحلة</button><button type="button" className="a2l-primary" onClick={onContinue}>{stage.id === 'inference' ? 'عرض النتيجة والنص' : 'المرحلة التالية ←'}</button></div></div>;
  if (!item) return null;
  return <div className="a2l-exercise"><header className="a2l-exercise-head"><div><div className="eyebrow">{stage.titleAr} · <span dir="ltr">{stage.titleEn}</span></div><h2>النشاط {exerciseIndex + 1} من {stage.items.length}</h2></div><strong>{Math.round(((exerciseIndex + 1) / stage.items.length) * 100)}%</strong></header><div className="a2l-progress"><span style={{ width: `${((exerciseIndex + 1) / stage.items.length) * 100}%` }} /></div><ExerciseField key={item.id} item={item} value={response} disabled={Boolean(grade)} lesson={lesson} onChange={onResponse} /><details className="a2l-english"><summary>Show English instruction</summary><p dir="ltr">{item.promptEn}</p></details>{grade && <Feedback result={grade} />}{error && <p className="a2l-error" role="alert">{error}</p>}<div className="a2l-actions">{!grade && <button type="button" className="a2l-primary" disabled={submitting || !hasResponse(item, response)} onClick={onSubmit}>{submitting ? 'جارٍ التصحيح…' : ['predictionChoice', 'predictionOpen', 'keyWords'].includes(item.type) ? 'حفظ المشاركة' : 'تحقق من الإجابة'}</button>}{grade && !grade.correct && !grade.reveal && <button type="button" className="a2l-primary" onClick={onRetry}>المحاولة الثانية</button>}{grade && (grade.correct || grade.reveal) && <button type="button" className="a2l-primary" onClick={onNext}>{exerciseIndex === stage.items.length - 1 ? 'إنهاء المرحلة' : 'النشاط التالي ←'}</button>}</div></div>;
}

function ExerciseField({ item, value, disabled, lesson, onChange }: { item: PublicExercise; value: unknown; disabled: boolean; lesson: LessonInfo; onChange: (value: unknown) => void }) {
  const selected = Array.isArray(value) ? value as string[] : [];
  const objectValue = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const textValue = typeof value === 'string' ? value : '';
  const choiceTypes = ['singleChoice', 'predictionChoice', 'contextMeaning', 'fillBlank', 'audioChoice', 'trueFalse'];
  return <div className="a2l-field"><h3>{item.promptAr}</h3>{item.type === 'imageObservation' && item.image && <Image className="a2l-opening-image" src={item.image} alt={`${lesson.openingImage.altAr} ${lesson.openingImage.altEn}`} width={1672} height={941} sizes="(max-width: 800px) 100vw, 900px" priority />}{item.type === 'keyWords' && <div className="a2l-keywords">{item.words?.map((word: string) => <span key={word}>{word}</span>)}</div>}{choiceTypes.includes(item.type) && <div className="a2l-choices">{item.choices?.map((choice: string) => <button type="button" disabled={disabled} className={value === choice ? 'selected' : ''} key={choice} onClick={() => onChange(choice)}>{choice}</button>)}</div>}{item.type === 'multiSelect' && <div className="a2l-choices multi">{item.choices?.map((choice: string) => <button type="button" disabled={disabled} className={selected.includes(choice) ? 'selected' : ''} aria-pressed={selected.includes(choice)} key={choice} onClick={() => onChange(selected.includes(choice) ? selected.filter((entry) => entry !== choice) : [...selected, choice])}>{choice}</button>)}</div>}{item.type === 'sequence' && <SequenceField events={item.events || []} selected={selected} disabled={disabled} onChange={onChange} />}{['imageObservation', 'predictionOpen', 'keyWords', 'shortEvidence', 'reflection'].includes(item.type) && <textarea className="a2l-textarea" value={textValue} disabled={disabled} onChange={(event) => onChange(event.target.value)} placeholder={item.type === 'imageObservation' ? 'اذكر ما تراه وما تتوقعه…' : 'اكتب إجابتك بالعربية…'} />}{item.type === 'summaryBuilder' && <SummaryBuilder item={item} value={objectValue} disabled={disabled} onChange={onChange} />}{item.type === 'solutionTask' && <SolutionTask item={item} value={objectValue} disabled={disabled} onChange={onChange} />}</div>;
}

function SequenceField({ events, selected, disabled, onChange }: { events: string[]; selected: string[]; disabled: boolean; onChange: (value: unknown) => void }) {
  return <div className="a2l-sequence"><div className="a2l-ordered-list" aria-live="polite">{selected.length ? selected.map((event, index) => <div key={event}><b>{index + 1}</b><span>{event}</span><button type="button" disabled={disabled} onClick={() => onChange(selected.filter((entry) => entry !== event))} aria-label={`إزالة ${event}`}>×</button></div>) : <p>اضغط على القرارات بالترتيب الذي سمعته.</p>}</div><div className="a2l-token-bank">{events.map((event) => <button type="button" key={event} disabled={disabled || selected.includes(event)} onClick={() => onChange([...selected, event])}>{event}</button>)}</div><button type="button" className="a2l-small" disabled={disabled || selected.length === 0} onClick={() => onChange(selected.slice(0, -1))}>تراجع عن آخر اختيار</button></div>;
}

function SummaryBuilder({ item, value, disabled, onChange }: { item: PublicExercise; value: Record<string, unknown>; disabled: boolean; onChange: (value: unknown) => void }) {
  const parts = [['goal', 'الهدف'], ['activities', 'الأنشطة'], ['problems', 'المشكلتان'], ['success', 'معيار النجاح']];
  const combined = parts.map(([id]) => String(value[id] || '')).join(' ');
  return <div className="a2l-summary">{parts.map(([id, label], index) => <label key={id}><span>{index + 1}</span>{label}<textarea value={String(value[id] || '')} disabled={disabled} onChange={(event) => onChange({ ...value, [id]: event.target.value })} placeholder={`جملة عن ${label}…`} /></label>)}<LiveTargets text={combined} minimum={Number(item.minimumTargetVocabulary || 4)} /></div>;
}

function SolutionTask({ item, value, disabled, onChange }: { item: PublicExercise; value: Record<string, unknown>; disabled: boolean; onChange: (value: unknown) => void }) {
  const mode = value.mode === 'audio' ? 'audio' : 'text';
  const text = String(value.text || '');
  const words = countWords(text);
  const targets = detectedTargets(text);
  const minimumWords = item.minimumWords ?? 60;
  const maximumWords = item.maximumWords ?? 80;
  const minimumTargetVocabulary = item.minimumTargetVocabulary ?? 5;
  return <div className="a2l-solution"><div className="a2l-mode-tabs" role="group" aria-label="طريقة الإجابة"><button type="button" disabled={disabled} className={mode === 'text' ? 'active' : ''} onClick={() => onChange({ ...value, mode: 'text' })}><WriteIcon />اكتب الرد</button><button type="button" disabled={disabled} className={mode === 'audio' ? 'active' : ''} onClick={() => onChange({ ...value, mode: 'audio' })}><MicIcon />سجّل الرد</button></div>{mode === 'text' ? <><div className="a2l-requirements" aria-live="polite"><span className={words >= minimumWords && words <= maximumWords ? 'met' : ''}>{words}/{minimumWords}–{maximumWords} كلمة</span><span className={targets.length >= minimumTargetVocabulary ? 'met' : ''}>{targets.length}/{minimumTargetVocabulary} مفردات</span><span>20 متعلمًا · 6 حواسيب · ساعة</span></div><textarea className="a2l-textarea large" value={text} disabled={disabled} onChange={(event) => onChange({ ...value, mode: 'text', text: event.target.value })} placeholder="اشرح كيف ستقسم المتعلمين وتنظم الوقت والأجهزة…" /><LiveTargets text={text} minimum={minimumTargetVocabulary} /></> : <RecordingField value={value} disabled={disabled} onChange={onChange} />}</div>;
}

function RecordingField({ value, disabled, onChange }: { value: Record<string, unknown>; disabled: boolean; onChange: (value: unknown) => void }) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const secondsRef = useRef(Number(value.durationSeconds || 0));
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(Number(value.durationSeconds || 0));
  const [blobUrl, setBlobUrl] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    loadRecording().then((blob) => {
      if (!active || !blob) return;
      setBlobUrl(URL.createObjectURL(blob));
    }).catch(() => undefined);
    return () => { active = false; streamRef.current?.getTracks().forEach((track) => track.stop()); if (timerRef.current) window.clearInterval(timerRef.current); };
  }, []);

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setMessage('التسجيل غير مدعوم في هذا المتصفح؛ استخدم الرد الكتابي.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      setSeconds(0);
      secondsRef.current = 0;
      setMessage('');
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        setBlobUrl(URL.createObjectURL(blob));
        await saveRecording(blob).catch(() => setMessage('حُفظت الإجابة مؤقتًا، لكن تعذّر حفظ ملف التسجيل بعد تحديث الصفحة.'));
        onChange({ ...value, mode: 'audio', hasRecording: true, durationSeconds: secondsRef.current });
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      setRecording(true);
      timerRef.current = window.setInterval(() => setSeconds((current) => {
        secondsRef.current = current + 1;
        return current + 1;
      }), 1000);
    } catch { setMessage('تعذّر الوصول إلى الميكروفون. اسمح به أو استخدم الرد الكتابي.'); }
  }

  function stop() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setRecording(false);
  }

  async function remove() {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl('');
    setSeconds(0);
    secondsRef.current = 0;
    await saveRecording(null).catch(() => undefined);
    onChange({ mode: 'audio', hasRecording: false, durationSeconds: 0 });
  }

  return <div className="a2l-recorder"><div className={`a2l-recorder-status ${recording ? 'recording' : ''}`}><span aria-hidden="true" /><div><strong>{recording ? 'جارٍ التسجيل…' : blobUrl ? 'تسجيلك محفوظ' : 'جاهز للتسجيل'}</strong><small dir="ltr">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</small></div></div><div className="a2l-recorder-actions">{!recording ? <button type="button" disabled={disabled} onClick={() => void start()}><MicIcon />{blobUrl ? 'تسجيل جديد' : 'ابدأ التسجيل'}</button> : <button type="button" onClick={stop}><StopIcon />أوقف واحفظ</button>}{blobUrl && !recording && <><audio src={blobUrl} controls preload="metadata" aria-label="الاستماع إلى إجابتك المسجلة" /><button type="button" className="danger" disabled={disabled} onClick={() => void remove()}>حذف التسجيل</button></>}</div><p>سجّل إجابة حرة وواضحة لمدة لا تقل عن عشر ثوانٍ.</p>{message && <p className="a2l-error" role="alert">{message}</p>}</div>;
}

function LiveTargets({ text, minimum }: { text: string; minimum: number }) {
  const terms = detectedTargets(text);
  return <div className="a2l-live-targets"><strong>المفردات المكتشفة:</strong>{terms.length ? <div>{terms.map((term) => <span key={term}>{term}</span>)}</div> : <p>لم تُكتشف مفردات مستهدفة بعد.</p>}<small className={terms.length >= minimum ? 'met' : ''}>{terms.length >= minimum ? 'اكتمل شرط المفردات.' : `تحتاج إلى ${minimum - terms.length} مفردات إضافية.`}</small></div>;
}

function Feedback({ result }: { result: GradeResult }) {
  return <div className={`a2l-feedback ${result.correct ? 'correct' : 'wrong'}`} role="status" aria-live="polite"><strong>{result.feedbackAr}</strong><span dir="ltr">{result.feedbackEn}</span>{result.missingRequirements?.length ? <div className="a2l-missing"><b>المتطلبات الناقصة:</b>{result.missingRequirements.map((entry) => <span key={entry}>{entry}</span>)}</div> : null}{result.detectedTerms?.length ? <div className="a2l-detected">{result.detectedTerms.map((entry) => <span key={entry}>{entry}</span>)}</div> : null}{result.rubricScore && <div className="a2l-rubric">{Object.entries(result.rubricScore).map(([key, score]) => <span key={key}>{key}: {score}</span>)}</div>}{result.reveal && result.modelAnswer !== undefined && <div className="a2l-model"><b>الدليل أو النموذج:</b><p>{typeof result.modelAnswer === 'string' ? result.modelAnswer : JSON.stringify(result.modelAnswer)}</p></div>}</div>;
}

function LimitedAudioControl({ id, url, label, state, count, speed, onPlay }: { id: string; url: string; label: string; state: AudioState; count: number; speed: 0.9 | 1; onPlay: (url: string, id: string, label: string, restart?: boolean) => void }) {
  const own = state?.id === id;
  const playing = own && state.status === 'playing';
  const exhausted = count >= 2 && !own;
  return <div className="a2l-audio"><div className="a2l-audio-copy"><HeadphonesIcon /><div><strong>{label}</strong><span>المتبقي: {Math.max(0, 2 - count)} من 2 · السرعة {speed}×</span></div></div><div className="a2l-audio-actions"><button type="button" disabled={exhausted || (own && state.status === 'loading')} onClick={() => onPlay(url, id, label)} aria-label={`${playing ? 'إيقاف' : 'تشغيل'} ${label}`}>{own && state.status === 'loading' ? <LoadingIcon /> : playing ? <PauseIcon /> : <PlayIcon />}{playing ? 'إيقاف مؤقت' : own && state.status === 'paused' ? 'متابعة' : 'تشغيل'}</button><button type="button" disabled={count >= 2} onClick={() => onPlay(url, id, label, true)} aria-label={`إعادة ${label} من البداية`}><ReplayIcon />إعادة</button></div>{own && state.status === 'error' && <p className="a2l-error" role="alert">تعذّر تحميل هذا المقطع. تحقق من الاتصال وحاول مرة أخرى.</p>}</div>;
}

function Results({ objectivePercent, objectiveCorrect, objectiveTotal, mastered, transcript, reviewIds, onReview }: { objectivePercent: number; objectiveCorrect: number; objectiveTotal: number; mastered: boolean; transcript: Transcript | null; reviewIds: string[]; onReview: () => void }) {
  const speakerMap = Object.fromEntries((transcript?.speakers || []).map((speaker) => [speaker.id, speaker]));
  return <section className="a2l-panel a2l-results"><div className={`a2l-result-ring ${mastered ? 'passed' : ''}`}><strong>{objectivePercent}%</strong><span>{objectiveCorrect}/{objectiveTotal}</span></div><div className="eyebrow">نتيجة الاستماع · Listening result</div><h2>{mastered ? 'أحسنت! أتقنت فهم «خُطَّةٌ لِوَرْشَةِ السَّبْتِ».' : 'أكملت الدرس، لكن بعض أهداف الاستماع تحتاج إلى مراجعة.'}</h2><p>الإتقان يتطلب 75٪ في أسئلة الفهم. · A score of 75% is required.</p><div className="a2l-result-grid"><article><strong>{mastered ? 'مكتمل · Complete' : 'راجع · Review'}</strong><span>الفهم الموضوعي · Comprehension</span></article><article><strong>{reviewIds.length}</strong><span>أنشطة للمراجعة · Review items</span></article><article><strong>{transcript ? 'مفتوح · Open' : 'مقفل · Locked'}</strong><span>نص الحوار · Transcript</span></article></div>{reviewIds.length > 0 && <div className="a2l-review-list"><strong>راجع الأنشطة · Review:</strong>{reviewIds.map((id) => <span key={id}>{id}</span>)}</div>}{transcript ? <div className="a2l-transcript"><header><div><div className="eyebrow">نص المراجعة · Review transcript</div><h3>الحوار الكامل مع أسماء المتحدثين</h3></div><CheckIcon /></header>{transcript.turns.map((turn) => { const speaker = speakerMap[turn.speaker]; return <article key={turn.id} className={`speaker-${turn.speaker}`}><strong>{speaker?.nameAr}<small>{speaker?.roleAr}</small></strong><p>{turn.displayAr}</p></article>; })}</div> : <div className="a2l-transcript-lock"><LockIcon /><p>لم يفتح النص لأن بعض أسئلة الفهم لم تُسلَّم بعد.</p></div>}<LessonCompletion level="A2" lesson={1} section="listening" passed={mastered} score={`${objectivePercent}% · ${objectiveCorrect}/${objectiveTotal}`} onRetry={onReview} /></section>;
}

function PlayIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>; }
function PauseIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z" fill="currentColor" /></svg>; }
function ReplayIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V3m0 0h5M4 3l3.5 3.5A8 8 0 1 1 4 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function LoadingIcon() { return <svg className="loading" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>; }
function CheckIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function LockIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2" /></svg>; }
function HeadphonesIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v6H5a1 1 0 0 1-1-1zm16 0h-3v6h2a1 1 0 0 0 1-1z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function MicIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>; }
function StopIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /></svg>; }
function WriteIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4-1 11-11-3-3L5 16zm10-13 3 3M4 20h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
