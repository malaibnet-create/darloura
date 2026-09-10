'use client';

import Link from 'next/link';
import { DragEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { grammarLesson } from '../../data/level3/grammar';
import { grammarPractice } from '../../data/level3/grammar-practice';
import grammarAudioManifest from '../../data/level3/grammar-audio-manifest.json';
import { markSectionComplete } from '../../lib/learning-progress';
import { userStorage as localStorage } from '../../lib/user-scoped-storage.mjs';
import LessonCompletion from '../learning/LessonCompletion';

type Phase = 'prepare' | 'understand' | 'notice' | 'lab' | 'practice' | 'use' | 'results';
type AnswerValue = number | readonly number[] | string;
type StoredAnswer = { value: AnswerValue; correct: boolean };

const STORAGE_KEY = 'darlugha-level-03-grammar-lesson-01';
const LEVEL_PROGRESS_KEY = 'darlugha-b1-lesson-1-sections';
const AUDIO_ROOT = '/audio/level-03/grammar/lesson-01/';
const phaseOrder: Phase[] = ['prepare', 'understand', 'notice', 'lab', 'practice', 'use', 'results'];
const phaseLabels: Record<Phase, string> = {
  prepare: 'تهيئة · Prepare', understand: 'افهم · Understand', notice: 'لاحظ · Notice', lab: 'جرّب المختبر · Lab', practice: 'تدرّب · Practice', use: 'استعمل · Use', results: 'اختبر نفسك · Self-check',
};

const lesson = grammarLesson;
const practice = grammarPractice;
const modules = lesson.modules;
const questions = practice.questions;

function audioPath(id: string) {
  const item = grammarAudioManifest.items.find((entry) => entry.id === id);
  return item ? `${AUDIO_ROOT}${String(item.path).split('/').pop()}` : '';
}

function audioIdFromDataPath(path: string) {
  return grammarAudioManifest.items.find((entry) => entry.path === path)?.id || '';
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00';
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

function normalizeSpaces(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function sameAnswer(value: AnswerValue, answer: AnswerValue) {
  return Array.isArray(value) && Array.isArray(answer)
    ? value.length === answer.length && value.every((item, index) => item === answer[index])
    : normalizeSpaces(String(value)) === normalizeSpaces(String(answer));
}

function AudioButton({ id, label, playingId, loadingId, errorId, progress, duration, onPlay, onReset }: {
  id: string; label: string; playingId: string; loadingId: string; errorId: string;
  progress: number; duration: number; onPlay: () => void; onReset: () => void;
}) {
  const playing = playingId === id;
  const loading = loadingId === id;
  return <div className="l3g-audio">
    <div><button type="button" onClick={onPlay} disabled={loading} aria-label={`${playing ? 'إيقاف · Stop' : 'استمع إلى · Listen to'} المثال · Example: ${label}`}><span aria-hidden="true">{loading ? '◌' : playing ? '⏸' : '▶'}</span>{loading ? 'تحميل… · Loading…' : playing ? 'إيقاف · Stop' : 'استمع · Listen'}</button><button className="reset-audio" type="button" onClick={onReset} aria-label={`إعادة المثال من البداية · Restart example: ${label}`}>↺</button></div>
    <div className="l3g-audio-track"><span style={{ width: `${playing && duration ? Math.min(100, progress / duration * 100) : 0}%` }} /></div>
    <small>{playing ? `${formatTime(progress)} / ${formatTime(duration)}` : 'الصوت لا يبدأ تلقائيًا · Audio never starts automatically'}</small>
    {errorId === id && <p role="alert">تعذّر تشغيل المثال. حاول مرة أخرى. · The example could not be played. Please try again.</p>}
  </div>;
}

const hollowForms: Record<string, Record<string, Record<string, string>>> = {
  'قال / يقول': {
    'هو': { 'الماضي': 'قالَ', 'المضارع': 'يقولُ', 'المجزوم': 'لم يَقُلْ', 'الأمر': '—' },
    'أنا': { 'الماضي': 'قُلْتُ', 'المضارع': 'أقولُ', 'المجزوم': 'لم أَقُلْ', 'الأمر': '—' },
    'نحن': { 'الماضي': 'قُلْنا', 'المضارع': 'نقولُ', 'المجزوم': 'لم نَقُلْ', 'الأمر': '—' },
    'أنتَ': { 'الماضي': 'قُلْتَ', 'المضارع': 'تقولُ', 'المجزوم': 'لم تَقُلْ', 'الأمر': 'قُلْ' },
  },
  'باع / يبيع': {
    'هو': { 'الماضي': 'باعَ', 'المضارع': 'يبيعُ', 'المجزوم': 'لم يَبِعْ', 'الأمر': '—' },
    'أنا': { 'الماضي': 'بِعْتُ', 'المضارع': 'أبيعُ', 'المجزوم': 'لم أَبِعْ', 'الأمر': '—' },
    'نحن': { 'الماضي': 'بِعْنا', 'المضارع': 'نبيعُ', 'المجزوم': 'لم نَبِعْ', 'الأمر': '—' },
    'أنتَ': { 'الماضي': 'بِعْتَ', 'المضارع': 'تبيعُ', 'المجزوم': 'لم تَبِعْ', 'الأمر': 'بِعْ' },
  },
};

const maaLabItems = [
  { ruleId: 'g03r01', category: 'نافية', evidenceAr: 'جاءت «ما» قبل فعل ماضٍ ونفت حدوثه.', evidenceEn: 'ما comes before a past verb and negates it.' },
  { ruleId: 'g03r02', category: 'نافية', evidenceAr: 'جاءت «ما» قبل فعل مضارع ونفت معناه.', evidenceEn: 'ما negates a present verb here.' },
  { ruleId: 'g03r03', category: 'رابط ظرفي', evidenceAr: 'اتصلت «ما» بـ«عند» و«بعد» لتكوين رابطين زمنيين.', evidenceEn: 'ما joins عند and بعد to form temporal connectors.' },
  { ruleId: 'g03r04', category: 'رابط ظرفي', evidenceAr: '«كلما» للتكرار و«بينما» للتزامن.', evidenceEn: 'كلما marks recurrence and بينما simultaneity.' },
  { ruleId: 'g03r05', category: 'ظرفية زمنية مع دام', evidenceAr: 'جاءت «ما» مع «دام» فصار المعنى: طوال استمرار الشرط.', evidenceEn: 'ما دام means as long as the condition continues.' },
];

export default function LevelThreeGrammar() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [phase, setPhase] = useState<Phase>('prepare');
  const [moduleIndex, setModuleIndex] = useState(0);
  const [visitedModules, setVisitedModules] = useState<string[]>([]);
  const [openedExamples, setOpenedExamples] = useState<string[]>([]);
  const [playingId, setPlayingId] = useState('');
  const [loadingId, setLoadingId] = useState('');
  const [errorId, setErrorId] = useState('');
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [labTab, setLabTab] = useState('g01');
  const [demoOrder, setDemoOrder] = useState<number[]>([]);
  const [demoChoice, setDemoChoice] = useState('');
  const [hollowVerb, setHollowVerb] = useState('قال / يقول');
  const [hollowPronoun, setHollowPronoun] = useState('هو');
  const [hollowTense, setHollowTense] = useState('الماضي');
  const [hollowPrediction, setHollowPrediction] = useState('');
  const [hollowRevealed, setHollowRevealed] = useState(false);
  const [maaIndex, setMaaIndex] = useState(0);
  const [maaAnswers, setMaaAnswers] = useState<Record<number, string>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, StoredAnswer>>({});
  const [ordering, setOrdering] = useState<number[]>([]);
  const [transformationDraft, setTransformationDraft] = useState('');
  const [reviewModules, setReviewModules] = useState<string[]>([]);
  const [lastScore, setLastScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [productionDrafts, setProductionDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (phaseOrder.includes(saved.phase)) setPhase(saved.phase);
        if (Number.isInteger(saved.moduleIndex)) setModuleIndex(saved.moduleIndex);
        if (saved.visitedModules) setVisitedModules(saved.visitedModules);
        if (saved.openedExamples) setOpenedExamples(saved.openedExamples);
        if (Number.isInteger(saved.questionIndex)) setQuestionIndex(saved.questionIndex);
        if (saved.answers) setAnswers(saved.answers);
        if (saved.reviewModules) setReviewModules(saved.reviewModules);
        if (saved.productionDrafts) setProductionDrafts(saved.productionDrafts);
        if (typeof saved.lastScore === 'number') setLastScore(saved.lastScore);
        if (typeof saved.bestScore === 'number') setBestScore(saved.bestScore);
        if (typeof saved.attempts === 'number') setAttempts(saved.attempts);
      } catch { /* Ignore invalid local progress. */ }
      setHydrated(true);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ phase, moduleIndex, visitedModules, openedExamples, questionIndex, answers, reviewModules, lastScore, bestScore, attempts, productionDrafts }));
  }, [hydrated, phase, moduleIndex, visitedModules, openedExamples, questionIndex, answers, reviewModules, lastScore, bestScore, attempts, productionDrafts]);

  const currentModule = modules[moduleIndex];
  const currentQuestion = questions[questionIndex];
  const currentAnswer = answers[currentQuestion?.id];
  const currentMaa = maaLabItems[maaIndex];
  const currentMaaRule = modules[2].rules.find((rule) => rule.id === currentMaa.ruleId)!;
  function stopAudio() { audioRef.current?.pause(); setPlayingId(''); setLoadingId(''); }

  function playAudio(id: string) {
    const path = audioPath(id);
    if (!path) { setErrorId(id); return; }
    if (playingId === id && audioRef.current && !audioRef.current.paused) { stopAudio(); return; }
    audioRef.current?.pause();
    setErrorId(''); setLoadingId(id); setProgress(0); setDuration(0);
    const audio = new Audio(path);
    audio.preload = 'none';
    audioRef.current = audio;
    audio.onloadedmetadata = () => { setDuration(audio.duration); setLoadingId(''); };
    audio.ontimeupdate = () => { setProgress(audio.currentTime); setDuration(audio.duration || 0); };
    audio.onplaying = () => { setPlayingId(id); setLoadingId(''); };
    audio.onended = () => { setPlayingId(''); setProgress(0); };
    audio.onerror = () => { setErrorId(id); setLoadingId(''); setPlayingId(''); };
    audio.play().catch(() => { setErrorId(id); setLoadingId(''); setPlayingId(''); });
  }

  function resetAudio(id: string) {
    if (playingId === id && audioRef.current) { audioRef.current.currentTime = 0; setProgress(0); }
    else playAudio(id);
  }

  function visitModule(index: number) {
    const id = modules[index].id;
    setModuleIndex(index);
    setVisitedModules((current) => current.includes(id) ? current : [...current, id]);
  }

  function nextModule() {
    if (moduleIndex < modules.length - 1) visitModule(moduleIndex + 1);
    else setPhase('notice');
  }

  function toggleExample(id: string, open: boolean) {
    if (open) setOpenedExamples((current) => current.includes(id) ? current : [...current, id]);
  }

  function chooseAnswer(value: AnswerValue) {
    if (currentAnswer) return;
    const expected = currentQuestion.type === 'transformation' ? currentQuestion.options[currentQuestion.answer] : currentQuestion.answer;
    const correct = sameAnswer(value, expected);
    setAnswers((current) => ({ ...current, [currentQuestion.id]: { value, correct } }));
    if (!correct) setReviewModules((current) => {
      const related = currentQuestion.moduleId === 'mixed' ? modules.map((module) => module.id) : [currentQuestion.moduleId];
      return Array.from(new Set([...current, ...related]));
    });
  }

  function finishPractice() {
    const finalScore = questions.reduce((sum, question) => sum + (answers[question.id]?.correct ? question.points : 0), 0);
    setLastScore(finalScore);
    setBestScore((current) => Math.max(current, finalScore));
    setAttempts((current) => current + 1);
    if (finalScore >= lesson.lesson.masteryScore) {
      try {
        const saved = JSON.parse(localStorage.getItem(LEVEL_PROGRESS_KEY) || '[]');
        const progressState = Array.from({ length: 7 }, (_, index) => Boolean(saved[index]));
        progressState[3] = true;
        localStorage.setItem(LEVEL_PROGRESS_KEY, JSON.stringify(progressState));
        markSectionComplete('B1', 1, 'grammar');
      } catch { /* Progress will be saved on a later successful attempt. */ }
      setPhase('use');
    } else setPhase('results');
  }

  function nextQuestion() {
    if (questionIndex < questions.length - 1) {
      setQuestionIndex((index) => index + 1);
      setOrdering([]);
      setTransformationDraft('');
    } else finishPractice();
  }

  function retryPractice() {
    setAnswers({}); setQuestionIndex(0); setOrdering([]); setTransformationDraft(''); setReviewModules([]); setLastScore(0); setPhase('practice');
  }

  function moveOrderedItem(from: number, to: number) {
    setOrdering((current) => {
      if (from < 0 || to < 0 || from >= current.length || to >= current.length || from === to) return current;
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function handleOrderKey(event: KeyboardEvent<HTMLButtonElement>, position: number) {
    if (event.key === 'ArrowRight') { event.preventDefault(); moveOrderedItem(position, Math.max(0, position - 1)); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); moveOrderedItem(position, Math.min(ordering.length - 1, position + 1)); }
    if (event.key === 'Backspace' || event.key === 'Delete') { event.preventDefault(); setOrdering((current) => current.filter((_, index) => index !== position)); }
  }

  function renderQuestionInput() {
    if (currentQuestion.type === 'ordering') return <div className="l3g-ordering">
      <div className="ordered-zone" aria-live="polite">{ordering.length ? ordering.map((optionIndex, position) => <button
        type="button" draggable key={`${optionIndex}-${position}`}
        aria-label={`${position + 1}. ${currentQuestion.options[optionIndex]}. استخدم السهمين لتغيير الترتيب أو Delete للحذف · Use the arrow keys to reorder or Delete to remove`}
        onDragStart={(event: DragEvent<HTMLButtonElement>) => event.dataTransfer.setData('text/plain', String(position))}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => { event.preventDefault(); moveOrderedItem(Number(event.dataTransfer.getData('text/plain')), position); }}
        onKeyDown={(event) => handleOrderKey(event, position)}
      >{position + 1}. {currentQuestion.options[optionIndex]}</button>) : <p>اختر الكلمات بالترتيب. يمكنك إعادة ترتيبها بالسحب أو بالسهمين. · Select the words in order; drag or use the arrow keys to rearrange them.</p>}</div>
      <div className="l3g-choices">{currentQuestion.options.map((option: string, index: number) => <button type="button" key={option} disabled={ordering.includes(index) || Boolean(currentAnswer)} onClick={() => setOrdering((current) => [...current, index])}>{option}</button>)}</div>
      {!currentAnswer && <div className="order-tools"><button type="button" onClick={() => setOrdering((current) => current.slice(0, -1))} disabled={!ordering.length}>إلغاء آخر اختيار · Undo last</button><button type="button" onClick={() => chooseAnswer(ordering)} disabled={ordering.length !== currentQuestion.options.length}>ثبّت الترتيب · Submit order</button></div>}
    </div>;
    if (currentQuestion.type === 'transformation') return <div className="transformation-box"><label htmlFor="grammar-transformation">اكتب الجملة المحوّلة كاملةً · Write the complete transformed sentence:</label><input id="grammar-transformation" value={transformationDraft} onChange={(event) => setTransformationDraft(event.target.value)} disabled={Boolean(currentAnswer)} dir="rtl" /><small>تُطبع المسافات الزائدة فقط، مع المحافظة على الحروف والحركات المؤثرة. · Extra spaces are normalized; preserve meaningful letters and marks.</small>{!currentAnswer && <button type="button" className="button" onClick={() => chooseAnswer(transformationDraft)} disabled={!transformationDraft.trim()}>ثبّت الإجابة · Submit answer</button>}</div>;
    return <div className="l3g-choices">{currentQuestion.options.map((option: string, index: number) => <button type="button" key={option} disabled={Boolean(currentAnswer)} onClick={() => chooseAnswer(index)}>{option}</button>)}</div>;
  }

  function openReviewModule(moduleId: string) {
    const index = modules.findIndex((module) => module.id === moduleId);
    if (index >= 0) { visitModule(index); setPhase('understand'); }
  }

  const demoWords = ['خُطَّةُ', 'الجَامِعَةِ', 'هَذِهِ', 'مُتَوَازِنَةٌ'];
  const demoCorrect = demoOrder.length === 4 && demoOrder.every((item, index) => item === index) && demoChoice === 'هذه';
  const hollowResult = hollowForms[hollowVerb][hollowPronoun][hollowTense];

  return <main className="level3-grammar-page" dir="rtl">
    <header className="l3g-hero"><div><Link href="/levels/B1">← المستوى المتقدم · Advanced</Link><div className="eyebrow">المستوى المتقدم · Advanced · الدرس الأول · Lesson 1 · Grammar</div><h1>{lesson.lesson.titleAr}</h1><p dir="ltr">{lesson.lesson.titleEn} · {lesson.lesson.estimatedMinutes} minutes</p></div><div className="l3g-summary"><strong>{phase === 'practice' ? `${questionIndex + 1}/30` : `${visitedModules.length}/3`}</strong><span>{phase === 'practice' ? 'سؤال · Question' : 'وحدات شوهدت · Units viewed'}</span><small>أفضل نتيجة · Best score: {bestScore}/30</small></div></header>

    <nav className="l3g-phases" aria-label="مراحل درس القواعد · Grammar stages">{phaseOrder.map((item, index) => <span key={item} className={`${phase === item ? 'active' : ''} ${phaseOrder.indexOf(phase) > index ? 'done' : ''}`}><b>{index + 1}</b>{phaseLabels[item]}</span>)}</nav>

    {phase === 'prepare' && <section className="l3g-panel intro-panel"><div><div className="eyebrow">تهيئة · Preparation</div><h2>ثلاث قواعد مترابطة لفهم العربية المتقدمة · Three connected rules for advanced Arabic</h2><p>{lesson.audioIntro.textAr}</p><p dir="ltr">This lesson connects demonstrative placement, hollow-verb conjugation, and the grammatical meanings of ما.</p><AudioButton id="lesson-intro" label="مقدمة درس القواعد · Grammar lesson introduction" playingId={playingId} loadingId={loadingId} errorId={errorId} progress={progress} duration={duration} onPlay={() => playAudio('lesson-intro')} onReset={() => resetAudio('lesson-intro')} /></div><div className="module-preview">{modules.map((module, index) => <button type="button" key={module.id} onClick={() => { visitModule(index); setPhase('understand'); }}><span>{index + 1}</span><strong>{module.titleAr}</strong><small dir="ltr">{module.titleEn}</small></button>)}</div><button className="button" type="button" onClick={() => { visitModule(0); setPhase('understand'); }}>ابدأ الفهم · Start understanding ←</button></section>}

    {phase === 'understand' && <section className="l3g-panel understand-panel"><div className="module-tabs" role="tablist" aria-label="وحدات القواعد · Grammar units">{modules.map((module, index) => <button type="button" role="tab" aria-selected={moduleIndex === index} className={moduleIndex === index ? 'active' : ''} key={module.id} onClick={() => visitModule(index)}>{index + 1}. {module.titleAr}<small dir="ltr">{module.titleEn}</small></button>)}</div><div className="eyebrow">افهم · Understand · الوحدة · Unit {moduleIndex + 1}</div><h2>{currentModule.titleAr}</h2><p dir="ltr">{currentModule.titleEn}</p><p className="objective">{currentModule.objectiveAr}</p><div className="parallel-explanation"><div><h3>الشرح بالعربية · Arabic explanation</h3><p>{currentModule.explanationAr}</p></div></div>

      <div className="rule-grid">{currentModule.rules.map((rule) => <details key={rule.id} open={openedExamples.includes(rule.id)} onToggle={(event) => toggleExample(rule.id, event.currentTarget.open)}><summary><span>{rule.labelAr}</span><small dir="ltr">{rule.labelEn}</small></summary><div className="rule-content"><code>{rule.formula}</code>{'meaningEn' in rule && rule.meaningEn && <small dir="ltr">{rule.meaningEn}</small>}<p className="arabic-example">{rule.exampleAr}</p><p dir="ltr">{rule.exampleEn}</p><AudioButton id={audioIdFromDataPath(rule.audio)} label={rule.exampleAr} playingId={playingId} loadingId={loadingId} errorId={errorId} progress={progress} duration={duration} onPlay={() => playAudio(audioIdFromDataPath(rule.audio))} onReset={() => resetAudio(audioIdFromDataPath(rule.audio))} /></div></details>)}</div>

      {'agreementTable' in currentModule && <div className="grammar-table-wrap"><table><thead><tr><th>الاسم المرجع · Referent</th><th>القريب · Near</th><th>البعيد · Far</th></tr></thead><tbody>{currentModule.agreementTable.map((row) => <tr key={row.referent}><th>{row.referent}</th><td>{row.near}</td><td>{row.far}</td></tr>)}</tbody></table></div>}
      {'conjugationTables' in currentModule && currentModule.conjugationTables.map((table) => <div className="grammar-table-wrap" key={table.verb}><h3>{table.verb} · الجذر · Root: {table.root}</h3><table><thead><tr><th>الضمير · Pronoun</th><th>الماضي · Past</th><th>المضارع · Present</th></tr></thead><tbody>{table.rows.map((row) => <tr key={row.pronoun}><th>{row.pronoun}</th><td>{row.past}</td><td>{row.present}</td></tr>)}</tbody></table></div>)}
      {'decisionGuide' in currentModule && <div className="decision-guide"><h3>دليل القرار · Decision guide</h3>{currentModule.decisionGuide.map((item, index) => <article key={index}><strong>{item.questionAr}</strong><p dir="ltr">{item.questionEn}</p><span>{item.resultAr}</span></article>)}</div>}
      <div className="l3g-actions"><button type="button" className="review-button" onClick={() => moduleIndex > 0 && visitModule(moduleIndex - 1)} disabled={moduleIndex === 0}>الوحدة السابقة · Previous unit</button><button type="button" className="button" onClick={nextModule}>{moduleIndex === modules.length - 1 ? 'انتقل إلى الملاحظة · Go to noticing ←' : 'الوحدة التالية · Next unit ←'}</button></div>
    </section>}

    {phase === 'notice' && <section className="l3g-panel notice-panel"><div className="eyebrow">لاحظ · Notice</div><h2>لاحظ موضع الخطأ وسبب التصحيح · Notice the error and why it was corrected</h2><p>اقرأ التصحيح بالعربية، ثم حدّد سبب الخطأ. · Read the Arabic correction, then identify the reason for the error.</p><div className="error-grid">{modules.flatMap((module) => module.commonErrors.map((error) => ({ ...error, module }))).map((item, index) => <article key={index}><span className="error-module">{item.module.titleAr}</span><p className="wrong-form"><del>{item.wrong}</del></p><p className="correct-form">✓ {item.correct}</p><p>{item.whyAr}</p>{item.whyEn && <p dir="ltr">{item.whyEn}</p>}</article>)}</div><div className="l3g-actions"><button className="review-button" type="button" onClick={() => setPhase('understand')}>العودة إلى الشرح · Back to explanation</button><button className="button" type="button" onClick={() => setPhase('lab')}>جرّب المختبرات · Try the labs ←</button></div></section>}

    {phase === 'lab' && <section className="l3g-panel lab-panel"><div className="eyebrow">جرّب المختبر · Interactive labs</div><h2>اكتشف القاعدة بالتجربة · Discover the rule through practice</h2><div className="lab-tabs" role="tablist" aria-label="مختبرات القواعد · Grammar labs">{modules.map((module) => <button type="button" role="tab" aria-selected={labTab === module.id} className={labTab === module.id ? 'active' : ''} key={module.id} onClick={() => setLabTab(module.id)}>{module.titleAr}<small dir="ltr">{module.titleEn}</small></button>)}</div>
      {labTab === 'g01' && <div className="lab-workspace demonstrative-lab"><div><h3>{modules[0].lab.instructionAr}</h3><p dir="ltr">{modules[0].lab.instructionEn}</p><p>رأس المركب الاسمي · Head noun: <mark>خُطَّةُ</mark> — وهو مؤنث مفرد · feminine singular.</p></div><div className="lab-selected">{demoOrder.length ? demoOrder.map((index, position) => <span key={`${index}-${position}`}>{position + 1}. {demoWords[index]}</span>) : 'اضغط الكلمات لبناء الجملة. · Select the words to build the sentence.'}</div><div className="lab-word-bank">{demoWords.map((word, index) => <button type="button" key={word} disabled={demoOrder.includes(index)} onClick={() => setDemoOrder((current) => [...current, index])}>{word}</button>)}</div><label>اختر اسم الإشارة المطابق · Choose the matching demonstrative:<select value={demoChoice} onChange={(event) => setDemoChoice(event.target.value)}><option value="">— اختر · Choose —</option><option>هذا</option><option>هذه</option><option>هذان</option><option>هذين</option><option>هؤلاء</option></select></label><div className="order-tools"><button type="button" onClick={() => setDemoOrder((current) => current.slice(0, -1))}>إلغاء آخر اختيار · Undo last</button><button type="button" onClick={() => { setDemoOrder([]); setDemoChoice(''); }}>إعادة · Reset</button></div>{demoOrder.length === 4 && demoChoice && <div className={`lab-feedback ${demoCorrect ? 'correct' : 'wrong'}`} role="status"><strong>{demoCorrect ? '✓ بناء صحيح · Correct structure' : '✕ راجع الترتيب والمطابقة · Review order and agreement'}</strong><p>الصحيح · Correct: خُطَّةُ الجَامِعَةِ هَذِهِ مُتَوَازِنَةٌ.</p><p>اخترنا «هذه» لأنها تطابق الرأس «خطة»، لا المضاف إليه «الجامعة».</p><p dir="ltr">هذه agrees with the feminine head noun خطة and follows the complete idafa.</p></div>}</div>}
      {labTab === 'g02' && <div className="lab-workspace hollow-lab"><div><h3>{modules[1].lab.instructionAr}</h3><p dir="ltr">{modules[1].lab.instructionEn}</p></div><div className="machine-controls"><label>الفعل · Verb<select value={hollowVerb} onChange={(event) => { setHollowVerb(event.target.value); setHollowRevealed(false); }}><option>قال / يقول</option><option>باع / يبيع</option></select></label><label>الضمير · Pronoun<select value={hollowPronoun} onChange={(event) => { setHollowPronoun(event.target.value); setHollowRevealed(false); }}><option>هو</option><option>أنا</option><option>نحن</option><option>أنتَ</option></select></label><label>الزمن · Tense<select value={hollowTense} onChange={(event) => { setHollowTense(event.target.value); setHollowRevealed(false); }}><option>الماضي · Past</option><option>المضارع · Present</option><option>المجزوم · Jussive</option><option>الأمر · Imperative</option></select></label></div><label className="prediction-input">توقّع الصيغة قبل الكشف · Predict before revealing<input value={hollowPrediction} onChange={(event) => setHollowPrediction(event.target.value)} placeholder="اكتب توقعك… · Write your prediction…" /></label><button className="button" type="button" onClick={() => setHollowRevealed(true)}>اكشف التحول · Reveal transformation</button>{hollowRevealed && <div className="conjugation-result" role="status"><small>الجذر · Root: {hollowVerb === 'قال / يقول' ? 'ق-و-ل' : 'ب-ي-ع'}</small><strong>{hollowResult}</strong>{hollowResult === '—' ? <p>صيغة الأمر لا تُبنى مع هذا الضمير؛ اختر «أنتَ». · The imperative is not formed with this pronoun; choose أَنْتَ.</p> : <><p>{hollowTense === 'المجزوم' || hollowTense === 'الأمر' || hollowTense === 'الماضي' && hollowPronoun !== 'هو' ? 'أُغلق المقطع، فحُذف المد أو قَصُر: تظهر الصيغة مثل «قلتُ، لم يقلْ، بِعْ».' : 'بقي المد ظاهرًا في المقطع المفتوح.'}</p><p dir="ltr">{hollowTense === 'المجزوم' || hollowTense === 'الأمر' ? 'The long weak vowel is deleted in the closed syllable.' : 'Compare the form with the present stem to identify و or ي.'}</p></>}</div>}</div>}
      {labTab === 'g03' && <div className="lab-workspace maa-lab"><div><h3>{modules[2].lab.instructionAr}</h3><p dir="ltr">{modules[2].lab.instructionEn}</p></div><AudioButton id={currentMaa.ruleId} label={currentMaaRule.exampleAr} playingId={playingId} loadingId={loadingId} errorId={errorId} progress={progress} duration={duration} onPlay={() => playAudio(currentMaa.ruleId)} onReset={() => resetAudio(currentMaa.ruleId)} /><p className="classifier-sentence">{currentMaaRule.exampleAr}</p><div className="classifier-options">{['نافية', 'رابط ظرفي', 'ظرفية زمنية مع دام'].map((category) => <button type="button" key={category} disabled={maaAnswers[maaIndex] !== undefined} onClick={() => setMaaAnswers((current) => ({ ...current, [maaIndex]: category }))}>{category}</button>)}</div>{maaAnswers[maaIndex] !== undefined && <div className={`lab-feedback ${maaAnswers[maaIndex] === currentMaa.category ? 'correct' : 'wrong'}`} role="status"><strong>{maaAnswers[maaIndex] === currentMaa.category ? '✓ تصنيف صحيح · Correct classification' : `✕ التصنيف الصحيح · Correct classification: ${currentMaa.category}`}</strong><p>{currentMaa.evidenceAr}</p><p dir="ltr">{currentMaa.evidenceEn}</p><button type="button" className="button" onClick={() => setMaaIndex((index) => (index + 1) % maaLabItems.length)}>الجملة التالية · Next sentence ←</button></div>}</div>}
      <div className="l3g-actions"><button className="review-button" type="button" onClick={() => setPhase('notice')}>العودة إلى الملاحظة · Back to noticing</button><button className="button" type="button" onClick={() => { setQuestionIndex(0); setPhase('practice'); }}>ابدأ التمرين المقيم · Start graded practice ←</button></div>
    </section>}

    {phase === 'practice' && <section className="l3g-panel question-panel"><div className="question-meta"><span>السؤال · Question {questionIndex + 1}/30</span><span>الوحدة · Unit: {modules.find((module) => module.id === currentQuestion.moduleId)?.titleAr || 'مراجعة شاملة'}</span><span>1 نقطة · point</span></div><h2>{currentQuestion.promptAr}</h2><p className="english-prompt" dir="ltr">{currentQuestion.promptEn}</p>{renderQuestionInput()}{currentAnswer && <div className={`practice-feedback ${currentAnswer.correct ? 'correct' : 'wrong'}`} role="status"><span className="rule-location">موضع القاعدة · Rule: {modules.find((module) => module.id === currentQuestion.moduleId)?.titleAr || 'القواعد الثلاث'}</span><strong>{currentAnswer.correct ? '✓ إجابة صحيحة · Correct' : '✕ تحتاج إلى مراجعة · Review needed'}</strong><p>{currentQuestion.feedbackAr}</p><p dir="ltr">{currentQuestion.feedbackEn}</p>{!currentAnswer.correct && currentQuestion.moduleId !== 'mixed' && <button type="button" className="review-link" onClick={() => openReviewModule(currentQuestion.moduleId)}>راجع الوحدة · Review unit</button>}<button className="button" type="button" onClick={nextQuestion}>{questionIndex === 29 ? 'احسب النتيجة · Calculate result ←' : 'السؤال التالي · Next question ←'}</button></div>}</section>}

    {phase === 'use' && <section className="l3g-panel production-panel"><div className="eyebrow">استعمل · Use · تدريب غير مقيم · Ungraded practice</div><h2>نجحت في الاختبار؛ استعمل القواعد في إنتاجك · You passed; now use the rules in your own production</h2><p>هذه المهمات الثلاث لا تغيّر درجتك، وتُحفظ مسوداتها تلقائيًا. · These three tasks do not change your score, and drafts are saved automatically.</p><div className="production-grid">{practice.productionTasks.map((task, index) => <label key={task.id}><span>{index + 1}</span><strong>{task.promptAr}</strong><small dir="ltr">{task.promptEn}</small><textarea rows={7} value={productionDrafts[task.id] || ''} onChange={(event) => setProductionDrafts((current) => ({ ...current, [task.id]: event.target.value }))} /></label>)}</div><button className="button" type="button" onClick={() => setPhase('results')}>اعرض النتيجة النهائية · Show final result ←</button></section>}

    {phase === 'results' && <section className="l3g-panel results-panel"><div className="result-medal">{lastScore >= lesson.lesson.masteryScore ? '🎉' : '🌱'}</div><div className="eyebrow">اختبر نفسك · Self-check</div><h2>{lastScore >= lesson.lesson.masteryScore ? 'أحسنت! أتقنت قواعد الدرس. · You mastered the lesson grammar.' : 'راجع الوحدات المحددة ثم حاول مرة أخرى. · Review the selected units and try again.'}</h2><div className="result-score"><strong>{lastScore}/30</strong><span>{Math.round(lastScore / 30 * 100)}% · الإتقان · Mastery: 24/30</span></div><p>أفضل نتيجة · Best score: {bestScore}/30 · المحاولات · Attempts: {attempts}</p>{reviewModules.length > 0 && <div className="review-module-list"><h3>وحدات للمراجعة · Units to review</h3>{reviewModules.map((moduleId) => <button type="button" key={moduleId} onClick={() => openReviewModule(moduleId)}>{modules.find((module) => module.id === moduleId)?.titleAr || 'مراجعة القواعد'}</button>)}</div>}<LessonCompletion level="B1" lesson={1} section="grammar" passed={lastScore >= lesson.lesson.masteryScore} score={`${lastScore}/30`} onRetry={retryPractice} grammarRulesRemain onBackToRules={() => setPhase('understand')} /></section>}
  </main>;
}
