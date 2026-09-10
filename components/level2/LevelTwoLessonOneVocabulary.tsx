'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import lessonSource from '../../data/level2/lesson-01-vocabulary-source/lesson.json';
import vocabularySource from '../../data/level2/lesson-01-vocabulary-source/vocabulary.json';
import { markSectionComplete, removeReviewItem, upsertReviewItem } from '../../lib/learning-progress';
import { userStorage as localStorage } from '../../lib/user-scoped-storage.mjs';
import LessonCompletion from '../learning/LessonCompletion';

type Phase = 'discover' | 'recall' | 'understand' | 'activate' | 'results';
type StageId = 'recall' | 'understand' | 'activate';
type MasteryStatus = 'new' | 'learning' | 'mastered';
type VocabularyProgress = {
  lessonId: string;
  itemId: string;
  status: MasteryStatus;
  correctAttempts: number;
  totalAttempts: number;
  addedToReview: boolean;
  lastReviewedAt: string;
};
type PublicExercise = {
  id: string;
  type: string;
  promptAr: string;
  promptEn: string;
  audio?: string;
  choices?: string[];
  left?: string[];
  right?: string[];
  groupNames?: string[];
  terms?: string[];
  tokens?: string[];
  requiredTerms?: string[];
  requiredAny?: string[];
  requiredCount?: number;
  targetTerms?: string[];
  starters?: string[];
  minimumSentences?: number;
  minimumWords?: number;
  maximumWords?: number;
  minimumTargetTerms?: number;
  rubric?: Record<string, number>;
};
type PublicStage = { id: StageId; titleAr: string; titleEn: string; items: PublicExercise[] };
type GradeResult = {
  correct: boolean;
  feedbackAr: string;
  feedbackEn: string;
  reveal: boolean;
  modelAnswer?: unknown;
  detectedTerms?: string[];
  rubricScore?: Record<string, number>;
};
type AudioState = { id: string; status: 'loading' | 'playing' | 'paused' | 'error' } | null;
type VocabularyFamily = (typeof vocabularySource)[number];
type SavedProgress = {
  attemptId?: string; phase?: Phase; englishIds?: string[]; progress?: Record<string, VocabularyProgress>;
  exerciseIndex?: number; responses?: Record<string, unknown>; attempts?: Record<string, number>;
  grades?: Record<string, GradeResult>; exerciseReviewIds?: string[]; bestStageScores?: Record<string, number>;
  bestOverall?: number;
};

const STORAGE_KEY = 'darlugha-a2-lesson-1-vocabulary';
const SECTION_KEY = 'darlugha-a2-lesson-1-sections';
const lesson = lessonSource;
const vocabulary = vocabularySource;
const thresholds: Record<StageId, number> = { recall: 70, understand: 75, activate: 70 };
const phaseOrder: Phase[] = ['discover', 'recall', 'understand', 'activate', 'results'];
const phaseLabels: Record<Phase, { ar: string; en: string }> = {
  discover: { ar: 'اكتشف', en: 'Discover' },
  recall: { ar: 'تذكّر', en: 'Recall' },
  understand: { ar: 'افهم', en: 'Understand' },
  activate: { ar: 'استعمل', en: 'Activate' },
  results: { ar: 'النتيجة', en: 'Results' },
};

function publicAudio(value: string) {
  return `/audio/level-02/lesson-01/vocabulary/${value.split('/').pop()}`;
}

function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/u).length : 0;
}

function defaultProgress(itemId: string): VocabularyProgress {
  return {
    lessonId: lesson.id,
    itemId,
    status: 'new',
    correctAttempts: 0,
    totalAttempts: 0,
    addedToReview: false,
    lastReviewedAt: '',
  };
}

export default function LevelTwoLessonOneVocabulary() {
  const [loaded, setLoaded] = useState(false);
  const [phase, setPhase] = useState<Phase>('discover');
  const [attemptId, setAttemptId] = useState('');
  const [stages, setStages] = useState<PublicStage[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [exerciseError, setExerciseError] = useState('');
  const [englishIds, setEnglishIds] = useState<string[]>([]);
  const [progress, setProgress] = useState<Record<string, VocabularyProgress>>({});
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [grades, setGrades] = useState<Record<string, GradeResult>>({});
  const [exerciseReviewIds, setExerciseReviewIds] = useState<string[]>([]);
  const [bestStageScores, setBestStageScores] = useState<Record<string, number>>({});
  const [bestOverall, setBestOverall] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [audioState, setAudioState] = useState<AudioState>(null);
  const [audioSpeed, setAudioSpeed] = useState<0.85 | 1>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let saved: SavedProgress = {};
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { /* clean start */ }
    const id = typeof saved.attemptId === 'string' ? saved.attemptId : crypto.randomUUID();
    const frame = window.requestAnimationFrame(() => {
      setAttemptId(id);
      if (saved.phase && phaseOrder.includes(saved.phase)) setPhase(saved.phase);
      if (Array.isArray(saved.englishIds)) setEnglishIds(saved.englishIds);
      if (saved.progress) setProgress(saved.progress);
      if (typeof saved.exerciseIndex === 'number' && Number.isInteger(saved.exerciseIndex)) setExerciseIndex(saved.exerciseIndex);
      if (saved.responses) setResponses(saved.responses);
      if (saved.attempts) setAttempts(saved.attempts);
      if (saved.grades) setGrades(saved.grades);
      if (Array.isArray(saved.exerciseReviewIds)) setExerciseReviewIds(saved.exerciseReviewIds);
      if (saved.bestStageScores) setBestStageScores(saved.bestStageScores);
      if (typeof saved.bestOverall === 'number') setBestOverall(saved.bestOverall);
      setLoaded(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!attemptId) return;
    let active = true;
    const frame = window.requestAnimationFrame(() => {
      setLoadingExercises(true);
      fetch(`/api/level2-vocabulary?attempt=${encodeURIComponent(attemptId)}`, { cache: 'no-store' })
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || 'LOAD_FAILED');
          if (active) setStages(payload.stages || []);
        })
        .catch(() => { if (active) setExerciseError('تعذّر تحميل تدريبات المفردات. أعد تحميل الصفحة وحاول مرة أخرى.'); })
        .finally(() => { if (active) setLoadingExercises(false); });
    });
    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
    };
  }, [attemptId]);

  useEffect(() => {
    if (!loaded || !attemptId) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      attemptId, phase, englishIds, progress, exerciseIndex,
      responses, attempts, grades, exerciseReviewIds, bestStageScores, bestOverall,
    }));
  }, [loaded, attemptId, phase, englishIds, progress, exerciseIndex, responses, attempts, grades, exerciseReviewIds, bestStageScores, bestOverall]);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const stage = stages.find((entry) => entry.id === phase) || null;
  const item = stage?.items[exerciseIndex] || null;
  const stageFinished = Boolean(stage && exerciseIndex >= stage.items.length);
  const stageCorrect = stage ? stage.items.filter((entry) => grades[entry.id]?.correct).length : 0;
  const stagePercent = stage ? Math.round((stageCorrect / stage.items.length) * 100) : 0;
  const stagePassed = stage ? stagePercent >= thresholds[stage.id] : false;
  const totalBest = Object.values(bestStageScores).reduce((sum, value) => sum + Number(value || 0), 0);
  const overallPercent = Math.round((totalBest / 28) * 100);
  const finalTaskSubmitted = Boolean(grades.a08);
  const mastered = overallPercent >= lesson.mastery.overallPercent
    && (bestStageScores.recall || 0) >= 7
    && (bestStageScores.understand || 0) >= 8
    && (bestStageScores.activate || 0) >= 6
    && finalTaskSubmitted;
  const masteredWords = Object.values(progress).filter((entry) => entry.status === 'mastered').length;

  function display(value: string) {
    return value;
  }

  function updateWord(itemId: string, changes: Partial<VocabularyProgress>) {
    setProgress((current) => ({
      ...current,
      [itemId]: { ...(current[itemId] || defaultProgress(itemId)), ...changes, lastReviewedAt: new Date().toISOString() },
    }));
  }

  function playAudio(url: string, id: string, restart = false) {
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
    current?.pause();
    const audio = new Audio(url);
    audio.preload = 'metadata';
    audio.playbackRate = audioSpeed;
    audioRef.current = audio;
    audio.onended = () => setAudioState(null);
    audio.onerror = () => setAudioState({ id, status: 'error' });
    setAudioState({ id, status: 'loading' });
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
    setExerciseError('');
    try {
      const rawResponse = responses[item.id];
      const response = item.type === 'sentenceBuilder' && Array.isArray(rawResponse) ? rawResponse.join(' ') : rawResponse;
      const request = await fetch('/api/level2-vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, response, attemptNumber }),
      });
      const result = await request.json();
      if (!request.ok) throw new Error(result.error || 'GRADE_FAILED');
      setAttempts((current) => ({ ...current, [item.id]: attemptNumber }));
      setGrades((current) => ({ ...current, [item.id]: result }));
      if (result.reveal) setExerciseReviewIds((current) => current.includes(item.id) ? current : [...current, item.id]);
    } catch {
      setExerciseError('تعذّر تصحيح الإجابة. إجابتك محفوظة؛ حاول مرة أخرى.');
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
    if (exerciseIndex < stage.items.length - 1) {
      setExerciseIndex((index) => index + 1);
      return;
    }
    const correct = stage.items.filter((entry) => grades[entry.id]?.correct).length;
    setBestStageScores((current) => ({ ...current, [stage.id]: Math.max(current[stage.id] || 0, correct) }));
    setExerciseIndex(stage.items.length);
  }

  function retryStage() {
    if (!stage) return;
    const ids = new Set(stage.items.map((entry) => entry.id));
    setResponses((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !ids.has(id))));
    setAttempts((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !ids.has(id))));
    setGrades((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !ids.has(id))));
    setExerciseIndex(0);
  }

  function continueStage() {
    if (!stage || !stagePassed) return;
    if (stage.id === 'recall') setPhase('understand');
    else if (stage.id === 'understand') setPhase('activate');
    else {
      const nextBest = { ...bestStageScores, activate: Math.max(bestStageScores.activate || 0, stageCorrect) };
      const nextOverall = Math.round((Object.values(nextBest).reduce((sum, value) => sum + Number(value || 0), 0) / 28) * 100);
      setBestOverall((current) => Math.max(current, nextOverall));
      setPhase('results');
    }
    setExerciseIndex(0);
  }

  useEffect(() => {
    if (!loaded || phase !== 'results' || !mastered) return;
    let sections = [false, false, false, false, false, false, false];
    try {
      const parsed = JSON.parse(localStorage.getItem(SECTION_KEY) || '[]');
      if (Array.isArray(parsed)) sections = sections.map((_, index) => Boolean(parsed[index]));
    } catch { /* fresh section progress */ }
    sections[0] = true;
    localStorage.setItem(SECTION_KEY, JSON.stringify(sections));
    markSectionComplete('A2', 1, 'vocabulary');
  }, [loaded, phase, mastered, bestOverall, overallPercent]);

  if (!loaded) return <main className="level-two-vocabulary"><section className="a2v-loading" aria-live="polite">جارٍ تجهيز مفردات الدرس…</section></main>;

  return <main className="level-two-vocabulary" dir="rtl">
    <header className="a2v-header">
      <div>
        <Link href="/levels/A2" className="back-link">← المستوى المتوسط · Intermediate</Link>
        <div className="eyebrow">المستوى الثاني · الدرس الأول · Level 2, Lesson 1</div>
        <h1>{lesson.titleAr}</h1>
        <p dir="ltr">{lesson.titleEn} · {lesson.estimatedMinutes} minutes</p>
      </div>
      <div className="a2v-header-actions"><div className="a2v-mastery"><strong>{masteredWords}/16</strong><span>عائلة أتقنتها · Mastered families</span></div></div>
    </header>

    <nav className="a2v-steps" aria-label="مراحل درس المفردات">
      {phaseOrder.map((entry, index) => <button key={entry} type="button" className={`${phase === entry ? 'active' : ''} ${phaseOrder.indexOf(phase) > index ? 'completed' : ''}`} disabled={index > phaseOrder.indexOf(phase)} onClick={() => index <= phaseOrder.indexOf(phase) && setPhase(entry)}>
        <b>{phaseOrder.indexOf(phase) > index ? '✓' : index + 1}</b><span>{phaseLabels[entry].ar}</span><small dir="ltr">{phaseLabels[entry].en}</small>
      </button>)}
    </nav>

    {phase === 'discover' && <DiscoverStage
      lesson={lesson}
      vocabulary={vocabulary}
      progress={progress}
      englishIds={englishIds}
      audioState={audioState}
      audioSpeed={audioSpeed}
      display={display}
      onEnglish={(id: string) => setEnglishIds((current) => current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id])}
      onProgress={updateWord}
      onPlay={playAudio}
      onSpeed={setSpeed}
      onContinue={() => { setExerciseIndex(0); setPhase('recall'); }}
    />}

    {(phase === 'recall' || phase === 'understand' || phase === 'activate') && loadingExercises && <section className="a2v-panel a2v-loading" aria-live="polite">جارٍ تحميل التدريب المحمي…</section>}
    {(phase === 'recall' || phase === 'understand' || phase === 'activate') && !loadingExercises && stage && !stageFinished && item && <section className="a2v-panel a2v-exercise">
      <header className="a2v-exercise-head"><div><div className="eyebrow">{stage.titleAr} · <span dir="ltr">{stage.titleEn}</span></div><h2>النشاط {exerciseIndex + 1} من {stage.items.length}</h2></div><strong>{Math.round((exerciseIndex / stage.items.length) * 100)}%</strong></header>
      <div className="a2v-progress"><span style={{ width: `${((exerciseIndex + 1) / stage.items.length) * 100}%` }} /></div>
      <ExerciseField key={item.id} item={item} response={responses[item.id]} display={display} audioState={audioState} audioSpeed={audioSpeed} locked={Boolean(grades[item.id])} onResponse={(value) => setResponses((current) => ({ ...current, [item.id]: value }))} onPlay={playAudio} onSpeed={setSpeed} />
      <details className="a2v-english-instruction"><summary>Show English instruction</summary><p dir="ltr">{item.promptEn}</p></details>
      {grades[item.id] && <Feedback result={grades[item.id]} />}
      {exerciseError && <p className="a2v-error" role="alert">{exerciseError}</p>}
      <div className="a2v-actions">
        <button type="button" className="secondary" onClick={() => setPhase('discover')}>مراجعة البطاقات</button>
        {!grades[item.id] && <button type="button" className="primary" disabled={submitting || responses[item.id] === undefined || responses[item.id] === ''} onClick={() => void submitExercise()}>{submitting ? 'جارٍ التصحيح…' : 'تحقق من الإجابة'}</button>}
        {grades[item.id] && !grades[item.id].correct && !grades[item.id].reveal && <button type="button" className="primary" onClick={retryItem}>المحاولة الثانية</button>}
        {grades[item.id] && (grades[item.id].correct || grades[item.id].reveal) && <button type="button" className="primary" onClick={nextExercise}>{exerciseIndex === stage.items.length - 1 ? 'نتيجة المرحلة' : 'النشاط التالي ←'}</button>}
      </div>
    </section>}

    {(phase === 'recall' || phase === 'understand' || phase === 'activate') && stage && stageFinished && <section className="a2v-panel a2v-checkpoint" aria-live="polite">
      <div className={`a2v-score-ring ${stagePassed ? 'passed' : ''}`}><strong>{stagePercent}%</strong><span>{stageCorrect}/{stage.items.length}</span></div>
      <div className="eyebrow">اكتملت مرحلة {stage.titleAr}</div>
      <h2>{stagePassed ? 'أحسنت، فتحت المرحلة التالية.' : 'تحتاج إلى مراجعة هذه المرحلة.'}</h2>
      <p>الحد المطلوب في هذه المرحلة: {thresholds[stage.id]}٪. أفضل نتيجة محفوظة ولن تستبدل بنتيجة أقل.</p>
      {exerciseReviewIds.some((id) => stage.items.some((entry) => entry.id === id)) && <p className="a2v-review-notice">العناصر التي كُشف نموذجها أُضيفت إلى قائمة المراجعة.</p>}
      <div className="a2v-actions"><button type="button" className="secondary" onClick={retryStage}>إعادة المرحلة</button>{stagePassed && <button type="button" className="primary" onClick={continueStage}>{stage.id === 'activate' ? 'عرض النتيجة النهائية' : 'المرحلة التالية ←'}</button>}</div>
    </section>}

    {phase === 'results' && <section className="a2v-panel a2v-results">
      <div className={`a2v-score-ring ${mastered ? 'passed' : ''}`}><strong>{overallPercent}%</strong><span>أفضل إتقان</span></div>
      <div className="eyebrow">نتيجة مفردات الدرس الأول</div>
      <h2>{mastered ? 'أحسنت! أتقنت مفردات الدراسة والعمل والتطور الشخصي.' : 'أكملت المراحل، لكن ما زالت بعض المهارات تحتاج إلى مراجعة.'}</h2>
      <div className="a2v-stage-results">{(['recall', 'understand', 'activate'] as StageId[]).map((id) => { const targetStage = stages.find((entry) => entry.id === id); const score = bestStageScores[id] || 0; return <article key={id}><strong>{phaseLabels[id].ar}</strong><span>{score}/{targetStage?.items.length || 0}</span><small>{targetStage ? Math.round((score / targetStage.items.length) * 100) : 0}%</small></article>; })}</div>
      <p>أفضل نتيجة كلية محفوظة: {Math.max(bestOverall, overallPercent)}٪ · المهمة الختامية: {finalTaskSubmitted ? 'مُرسلة ✓' : 'غير مكتملة'}</p>
      {exerciseReviewIds.length > 0 && <div className="a2v-review-list"><strong>أنشطة للمراجعة:</strong>{exerciseReviewIds.map((id) => <span key={id}>{id}</span>)}</div>}
      <LessonCompletion level="A2" lesson={1} section="vocabulary" passed={mastered} score={`${overallPercent}%`} onRetry={() => { setPhase('discover'); setExerciseIndex(0); }} />
    </section>}

    {exerciseError && phase === 'discover' && <p className="a2v-error global" role="alert">{exerciseError}</p>}
  </main>;
}

type DiscoverStageProps = {
  lesson: typeof lessonSource; vocabulary: VocabularyFamily[]; progress: Record<string, VocabularyProgress>;
  englishIds: string[]; audioState: AudioState; audioSpeed: 0.85 | 1; display: (value: string) => string;
  onEnglish: (id: string) => void; onProgress: (id: string, changes: Partial<VocabularyProgress>) => void;
  onPlay: (url: string, id: string, restart?: boolean) => void; onSpeed: (speed: 0.85 | 1) => void; onContinue: () => void;
};

function DiscoverStage({ lesson, vocabulary, progress, englishIds, audioState, audioSpeed, display, onEnglish, onProgress, onPlay, onSpeed, onContinue }: DiscoverStageProps) {
  return <section className="a2v-panel">
    <header className="a2v-stage-intro"><div><div className="eyebrow">المرحلة الأولى · Discover</div><h2>اكتشف العائلات الصرفية الست عشرة</h2><p>استمع إلى ما تريد من العائلات، واكشف المعنى عند الحاجة. يمكنك بدء التمارين في أي وقت.</p></div><div><strong>{vocabulary.length}</strong><span>عائلة متاحة · Available families</span></div></header>
    <details className="a2v-objectives"><summary>أهداف الدرس · Lesson objectives</summary><div><ul>{lesson.objectivesAr.map((objective) => <li key={objective}>{objective}</li>)}</ul><ul dir="ltr">{lesson.objectivesEn.map((objective) => <li key={objective}>{objective}</li>)}</ul></div></details>
    <div className="a2v-card-grid">{vocabulary.map((entry) => <FamilyCard key={entry.id} item={entry} state={progress[entry.id] || defaultProgress(entry.id)} english={englishIds.includes(entry.id)} audioState={audioState} audioSpeed={audioSpeed} display={display} onEnglish={() => onEnglish(entry.id)} onStatus={(status: MasteryStatus) => { const old = progress[entry.id] || defaultProgress(entry.id); onProgress(entry.id, { status, correctAttempts: old.correctAttempts + (status === 'mastered' ? 1 : 0), totalAttempts: old.totalAttempts + 1 }); }} onReview={() => { const old = progress[entry.id] || defaultProgress(entry.id); const reviewId = `a2-l1-vocabulary-${entry.id}`; if (old.addedToReview) removeReviewItem(reviewId); else upsertReviewItem({ id: reviewId, level: 'A2', lesson: 1, section: 'vocabulary', arabic: entry.headwordAr, english: entry.meaningEn, example: entry.exampleAr, audioUrl: publicAudio(entry.familyAudio) }); onProgress(entry.id, { addedToReview: !old.addedToReview }); }} onPlay={onPlay} onSpeed={onSpeed} />)}</div>
    <div className="a2v-actions"><button type="button" className="primary" onClick={onContinue}>ابدأ التمارين · Start exercises ←</button></div>
  </section>;
}

type FamilyCardProps = {
  item: VocabularyFamily; state: VocabularyProgress; english: boolean; audioState: AudioState; audioSpeed: 0.85 | 1;
  display: (value: string) => string; onEnglish: () => void; onStatus: (status: MasteryStatus) => void;
  onReview: () => void; onPlay: (url: string, id: string, restart?: boolean) => void; onSpeed: (speed: 0.85 | 1) => void;
};

function FamilyCard({ item, state, english, audioState, audioSpeed, display, onEnglish, onStatus, onReview, onPlay, onSpeed }: FamilyCardProps) {
  const forms: Array<[string, string, string | null]> = [
    ['الماضي', 'Past', item.past], ['المضارع', 'Present', item.present], ['المصدر', 'Verbal noun', item.masdar],
    ['اسم الفاعل', 'Active participle', item.activeParticiple], ['اسم المفعول', 'Passive participle', item.passiveParticiple],
  ];
  const availableForms = forms.filter((entry): entry is [string, string, string] => typeof entry[2] === 'string' && entry[2].length > 0);
  return <article className={`a2v-family-card status-${state.status}`}>
    <div className="a2v-card-top"><VocabularyIcon name={item.icon} /><span className={`a2v-status ${state.status}`}>{state.status === 'new' ? 'جديدة' : state.status === 'learning' ? 'قيد التعلّم' : 'أتقنتها'}</span></div>
    <div className="a2v-headword"><div><small>الجذر · Root</small><span>{item.root}</span><h3>{display(item.headwordAr)}</h3></div><AudioControls id={`family-${item.id}`} url={publicAudio(item.familyAudio)} labelAr={`استمع إلى عائلة ${item.headwordAr}`} labelEn={`Play the word family for ${item.meaningEn}`} state={audioState} speed={audioSpeed} onPlay={onPlay} onSpeed={onSpeed} /></div>
    <button type="button" className="a2v-meaning-toggle" onClick={onEnglish}>{english ? 'Hide meaning' : 'Show meaning'}</button>
    {english && <div className="a2v-english" dir="ltr"><strong>{item.meaningEn}</strong><p>{item.noteEn}</p></div>}
    <div className="a2v-family-strip">{availableForms.map(([ar, en, value]) => <div key={ar}><small>{ar}<span dir="ltr">{en}</span></small><strong>{display(value)}</strong></div>)}</div>
    <div className="a2v-example"><div><small>مثال في السياق</small><p>{display(item.exampleAr)}</p>{english && <span dir="ltr">{item.exampleEn}</span>}</div><AudioControls id={`example-${item.id}`} url={publicAudio(item.exampleAudio)} labelAr={`استمع إلى مثال ${item.headwordAr}`} labelEn={`Play the example for ${item.meaningEn}`} state={audioState} speed={audioSpeed} onPlay={onPlay} onSpeed={onSpeed} /></div>
    <div className="a2v-card-actions"><button type="button" className={state.addedToReview ? 'saved' : ''} onClick={onReview}>{state.addedToReview ? '✓ في المراجعة' : '＋ أضف إلى المراجعة'}</button><label>الحالة<select value={state.status} onChange={(event) => onStatus(event.target.value as MasteryStatus)}><option value="new">جديدة</option><option value="learning">قيد التعلّم</option><option value="mastered">أتقنتها</option></select></label></div>
  </article>;
}

function AudioControls({ id, url, labelAr, labelEn, state, speed, onPlay, onSpeed }: { id: string; url: string; labelAr: string; labelEn: string; state: AudioState; speed: 0.85 | 1; onPlay: (url: string, id: string, restart?: boolean) => void; onSpeed: (speed: 0.85 | 1) => void }) {
  const own = state?.id === id;
  const playing = own && state.status === 'playing';
  return <div className="a2v-audio-controls">
    <button type="button" onClick={() => onPlay(url, id)} aria-label={`${labelAr}. ${labelEn}`} title={labelAr}>{state?.id === id && state.status === 'loading' ? <LoadingIcon /> : playing ? <PauseIcon /> : <PlayIcon />}</button>
    <button type="button" onClick={() => onPlay(url, id, true)} aria-label={`إعادة المقطع من البداية. Replay ${labelEn}`} title="إعادة من البداية"><ReplayIcon /></button>
    <label><span className="sr-only">سرعة الصوت</span><select value={speed} onChange={(event) => onSpeed(Number(event.target.value) as 0.85 | 1)} aria-label="سرعة الصوت · Audio speed"><option value="0.85">0.85×</option><option value="1">1×</option></select></label>
    {own && state.status === 'error' && <span className="a2v-audio-error" role="alert">تعذّر الصوت</span>}
  </div>;
}

function ExerciseField({ item, response, display, audioState, audioSpeed, locked, onResponse, onPlay, onSpeed }: { item: PublicExercise; response: unknown; display: (value: string) => string; audioState: AudioState; audioSpeed: 0.85 | 1; locked: boolean; onResponse: (value: unknown) => void; onPlay: (url: string, id: string, restart?: boolean) => void; onSpeed: (speed: 0.85 | 1) => void }) {
  const mapping = response && typeof response === 'object' && !Array.isArray(response) ? response as Record<string, string> : {};
  const tokens = Array.isArray(response) ? response as string[] : [];
  return <div className="a2v-field">
    <h1>{display(item.promptAr)}</h1>
    {item.audio && <AudioControls id={`exercise-${item.id}`} url={item.audio} labelAr="تشغيل صوت السؤال" labelEn="Play exercise audio" state={audioState} speed={audioSpeed} onPlay={onPlay} onSpeed={onSpeed} />}
    {item.choices && <div className="a2v-choices">{item.choices.map((choice) => <button key={choice} type="button" disabled={locked} className={response === choice ? 'selected' : ''} onClick={() => onResponse(choice)}>{display(choice)}</button>)}</div>}
    {item.left && item.right && <TapMatching left={item.left} right={item.right} value={mapping} disabled={locked} display={display} onChange={onResponse} />}
    {item.groupNames && item.terms && <TapSorting groups={item.groupNames} terms={item.terms} value={mapping} disabled={locked} display={display} onChange={onResponse} />}
    {item.tokens && <div className="a2v-builder"><div className="a2v-built-sentence">{tokens.length ? display(tokens.join(' ')) : 'اضغط على الكلمات بالترتيب الصحيح'}</div><div className="a2v-token-bank">{item.tokens.map((token, index) => <button type="button" disabled={locked || tokens.includes(token)} key={`${token}-${index}`} onClick={() => onResponse([...tokens, token])}>{display(token)}</button>)}</div><button type="button" className="secondary" disabled={locked || tokens.length === 0} onClick={() => onResponse(tokens.slice(0, -1))}>تراجع عن آخر كلمة</button></div>}
    {!item.choices && !item.left && !item.groupNames && !item.tokens && item.type !== 'guidedResponse' && item.type !== 'miniTask' && <input className="a2v-text-answer" value={typeof response === 'string' ? response : ''} disabled={locked} onChange={(event) => onResponse(event.target.value)} autoComplete="off" spellCheck={false} placeholder="اكتب إجابتك بالعربية…" />}
    {(item.type === 'guidedResponse' || item.type === 'miniTask') && <div className="a2v-writing-task">{item.starters && <div className="a2v-requirements">{item.starters.map((starter) => <span key={starter}>{display(starter)}…</span>)}</div>}{item.type === 'miniTask' && <div className="a2v-requirements"><span>{item.minimumWords}–{item.maximumWords} كلمة</span><span>{item.minimumTargetTerms} كلمات مستهدفة على الأقل</span><span>المهمة 3 · المفردات 4 · الوضوح 2 · الدقة 1</span></div>}<textarea value={typeof response === 'string' ? response : ''} disabled={locked} onChange={(event) => onResponse(event.target.value)} spellCheck={false} autoCorrect="off" placeholder="اكتب إجابتك هنا…" />{item.type === 'miniTask' && <div className="a2v-word-count">{countWords(typeof response === 'string' ? response : '')} كلمة</div>}</div>}
  </div>;
}

function TapMatching({ left, right, value, disabled, display, onChange }: { left: string[]; right: string[]; value: Record<string, string>; disabled: boolean; display: (value: string) => string; onChange: (value: unknown) => void }) {
  const [selected, setSelected] = useState('');
  return <div className="a2v-match"><div><h3>اختر عنصرًا من العمود الأول</h3>{left.map((entry: string) => <button type="button" disabled={disabled} className={selected === entry ? 'selected' : value[entry] ? 'paired' : ''} key={entry} onClick={() => setSelected(entry)}>{display(entry)}{value[entry] && <small>← {display(value[entry])}</small>}</button>)}</div><div><h3>ثم اختر ما يطابقه</h3>{right.map((entry: string) => <button type="button" disabled={disabled || !selected} key={entry} className={Object.values(value).includes(entry) ? 'paired' : ''} onClick={() => { if (!selected) return; onChange({ ...value, [selected]: entry }); setSelected(''); }}>{display(entry)}</button>)}</div></div>;
}

function TapSorting({ groups, terms, value, disabled, display, onChange }: { groups: string[]; terms: string[]; value: Record<string, string>; disabled: boolean; display: (value: string) => string; onChange: (value: unknown) => void }) {
  const [selected, setSelected] = useState('');
  return <div className="a2v-sort"><div className="a2v-token-bank">{terms.map((term: string) => <button type="button" disabled={disabled} className={selected === term ? 'selected' : value[term] ? 'paired' : ''} key={term} onClick={() => setSelected(term)}>{display(term)}{value[term] && <small>{display(value[term])}</small>}</button>)}</div><div className="a2v-groups">{groups.map((group: string) => <button type="button" disabled={disabled || !selected} key={group} onClick={() => { if (!selected) return; onChange({ ...value, [selected]: group }); setSelected(''); }}><strong>{display(group)}</strong><span>{Object.entries(value).filter(([, target]) => target === group).map(([term]) => display(term)).join('، ') || 'اختر كلمة ثم اضغط هنا'}</span></button>)}</div></div>;
}

function Feedback({ result }: { result: GradeResult }) {
  const rubricTotal = result.rubricScore ? Object.values(result.rubricScore).reduce((sum, value) => sum + value, 0) : null;
  return <div className={`a2v-feedback ${result.correct ? 'correct' : 'wrong'}`} aria-live="polite"><strong>{result.correct ? '✓ إجابة صحيحة' : result.reveal ? 'انتهت المحاولتان' : 'ليست صحيحة بعد'}</strong><p>{result.feedbackAr}</p><p dir="ltr">{result.feedbackEn}</p>{result.reveal && <div className="a2v-model"><b>النموذج:</b><span>{typeof result.modelAnswer === 'string' ? result.modelAnswer : JSON.stringify(result.modelAnswer)}</span></div>}{result.detectedTerms && result.detectedTerms.length > 0 && <div className="a2v-detected"><b>الكلمات المكتشفة:</b>{result.detectedTerms.map((term) => <span key={term}>{term}</span>)}</div>}{result.rubricScore && <div className="a2v-rubric">{Object.entries(result.rubricScore).map(([key, value]) => <span key={key}>{key}: {value}</span>)}<strong>المجموع: {rubricTotal}/10</strong></div>}</div>;
}

function VocabularyIcon({ name }: { name: string }) {
  const category = ['GraduationCap', 'Presentation', 'BookOpen'].includes(name) ? 'study' : ['BriefcaseBusiness', 'Wrench', 'ListChecks'].includes(name) ? 'work' : ['Users', 'HandHelping', 'MessagesSquare', 'HeartHandshake'].includes(name) ? 'people' : 'progress';
  return <span className="a2v-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{category === 'study' && <><path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M7 12v4c3 2 7 2 10 0v-4"/></>}{category === 'work' && <><rect x="3" y="7" width="18" height="12" rx="2"/><path d="M9 7V5h6v2M3 12h18"/></>}{category === 'people' && <><circle cx="9" cy="8" r="3"/><path d="M3 19c0-3.5 2.5-6 6-6s6 2.5 6 6"/><path d="M16 8c2 0 4 1.8 4 4"/></>}{category === 'progress' && <><path d="M4 17 9 12l3 3 7-8"/><path d="M15 7h4v4"/></>}</svg></span>;
}

function PlayIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7V5Z"/></svg>; }
function PauseIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM14 5h4v14h-4z"/></svg>; }
function ReplayIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7v5h5M5.5 17A8 8 0 1 0 6 6" fill="none" stroke="currentColor" strokeWidth="2"/></svg>; }
function LoadingIcon() { return <svg className="spin" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="20 40"/></svg>; }
