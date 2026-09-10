'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { markSectionComplete } from '../../lib/learning-progress';
import { userStorage as localStorage } from '../../lib/user-scoped-storage.mjs';
import LessonCompletion from '../learning/LessonCompletion';

type Phase = 'notice' | 'rule1' | 'rule2' | 'mixed' | 'results';
type PublicItem = {
  id: string; type: string; promptAr: string; promptEn: string;
  audio?: string; audioA: string; audioB: string; blankCount: number;
  choices: string[]; groupLabels: string[]; left: string[]; right: string[];
  textAr: string; tokens: string[]; values: string[];
};
type PublicStage = { id: Phase; titleAr: string; titleEn: string; items: PublicItem[] };
type Grade = { correct: boolean; score: number; maxScore: number; feedbackAr: string; feedbackEn: string; reveal: boolean; modelAnswer?: unknown; detectedPatterns?: string[]; missingRequirements?: string[]; rubricScore?: Record<string, number> };
type GrammarRule = {
  id: string; titleAr: string; purposeAr: string; purposeEn: string; formulaAr: string; formulaEn: string;
  steps: Array<{ ar: string; en: string }>;
  table?: Array<{ before: string; after: string; changeAr: string; changeEn: string }>;
  collocations?: Array<{ patternAr: string; meaningEn: string }>;
  contrastAr?: string[]; contrastEn: string[]; warningAr: string; warningEn: string;
};
type GrammarExample = { id: string; ruleId: string; textAr: string; focus: string; translationEn: string; audio: string };
type Payload = {
  lesson: { titleAr: string; titleEn: string; estimatedMinutes: number };
  rules: GrammarRule[];
  examples: GrammarExample[];
  stages: PublicStage[];
};
type SavedProgress = {
  attemptId?: string; phase?: Phase; unlocked?: number; indexes?: Record<string, number>;
  responses?: Record<string, unknown>; attempts?: Record<string, number>; grades?: Record<string, Grade>;
  learnedRules?: string[]; reviewIds?: string[]; bestPercent?: number;
};

const STORAGE_KEY = 'darlugha-a2-lesson-1-grammar';
const SECTION_KEY = 'darlugha-a2-lesson-1-sections';
const phases: Phase[] = ['notice', 'rule1', 'rule2', 'mixed', 'results'];
const labels: Record<Phase, { ar: string; en: string }> = {
  notice: { ar: 'لاحظ', en: 'Notice' }, rule1: { ar: 'أَنْ + المضارع', en: 'an + present verb' },
  rule2: { ar: 'حرف الجر + المصدر', en: 'Preposition + verbal noun' }, mixed: { ar: 'استعمل القاعدتين', en: 'Use both patterns' },
  results: { ar: 'النتيجة', en: 'Results' },
};

function hasResponse(item: PublicItem, value: unknown) {
  if (item.type === 'match' || item.type === 'familySort' || item.type === 'parallelRewrite' || item.type === 'exitTicket') {
    const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const required = item.type === 'match' ? item.left.length : item.type === 'familySort' ? item.values.length : item.type === 'parallelRewrite' ? 2 : 3;
    return Object.values(record).filter((entry) => Array.isArray(entry) ? entry.length : String(entry ?? '').trim()).length >= required;
  }
  if (item.type === 'cloze') return Array.isArray(value) && value.length === item.blankCount && value.every((entry) => String(entry).trim());
  if (item.type === 'sentenceBuilder') return Array.isArray(value) && value.length === item.tokens.length;
  return Boolean(String(value ?? '').trim());
}

function PlayIcon({ paused = false }: { paused?: boolean }) {
  return paused
    ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3v14H7zm7 0h3v14h-3z" /></svg>
    : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z" /></svg>;
}

function ReplayIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 8H3V4.5M4 8a8 8 0 1 1-.2 7.7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>; }

export default function LevelTwoLessonOneGrammar() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [attemptId, setAttemptId] = useState('');
  const [phase, setPhase] = useState<Phase>('notice');
  const [unlocked, setUnlocked] = useState(0);
  const [indexes, setIndexes] = useState<Record<string, number>>({});
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [grades, setGrades] = useState<Record<string, Grade>>({});
  const [learnedRules, setLearnedRules] = useState<string[]>([]);
  const [reviewIds, setReviewIds] = useState<string[]>([]);
  const [bestPercent, setBestPercent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [playingId, setPlayingId] = useState('');
  const [loadingAudioId, setLoadingAudioId] = useState('');
  const [audioErrorId, setAudioErrorId] = useState('');
  const [speed, setSpeed] = useState<0.85 | 1>(1);

  useEffect(() => {
    let saved: SavedProgress = {};
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { /* Ignore invalid progress. */ }
    const id = typeof saved.attemptId === 'string' ? saved.attemptId : crypto.randomUUID();
    const frame = window.requestAnimationFrame(() => {
      setAttemptId(id);
      if (saved.phase && phases.includes(saved.phase)) setPhase(saved.phase);
      if (typeof saved.unlocked === 'number' && Number.isInteger(saved.unlocked)) setUnlocked(saved.unlocked);
      if (saved.indexes) setIndexes(saved.indexes);
      if (saved.responses) setResponses(saved.responses);
      if (saved.attempts) setAttempts(saved.attempts);
      if (saved.grades) setGrades(saved.grades);
      if (saved.learnedRules) setLearnedRules(saved.learnedRules);
      if (saved.reviewIds) setReviewIds(saved.reviewIds);
      if (typeof saved.bestPercent === 'number') setBestPercent(saved.bestPercent);
    });
    let active = true;
    fetch(`/api/level2-grammar?attempt=${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((data) => { if (active) setPayload(data); })
      .catch(() => { if (active) setError('تعذّر تحميل درس القواعد. حدّث الصفحة وحاول مرة أخرى.'); })
      .finally(() => { if (active) { setLoading(false); setHydrated(true); } });
    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ attemptId, phase, unlocked, indexes, responses, attempts, grades, learnedRules, reviewIds, bestPercent }));
  }, [hydrated, attemptId, phase, unlocked, indexes, responses, attempts, grades, learnedRules, reviewIds, bestPercent]);

  const allItems = useMemo(() => payload?.stages.flatMap((stage) => stage.items) || [], [payload]);
  const scoreSummary = useMemo(() => {
    const scored = allItems.map((item) => grades[item.id]).filter(Boolean);
    const score = scored.reduce((sum, grade) => sum + grade.score, 0);
    const maximum = allItems.length;
    const stagePercent = (id: string) => {
      const items = payload?.stages.find((stage) => stage.id === id)?.items || [];
      return items.length ? Math.round(items.filter((item) => grades[item.id]?.correct).length / items.length * 100) : 0;
    };
    return { score, maximum, overall: maximum ? Math.round(score / maximum * 100) : 0, rule1: stagePercent('rule1'), rule2: stagePercent('rule2') };
  }, [allItems, grades, payload]);
  const mastered = scoreSummary.overall >= 75 && scoreSummary.rule1 >= 70 && scoreSummary.rule2 >= 70;

  useEffect(() => {
    if (!hydrated) return;
    const frame = window.requestAnimationFrame(() => {
      setBestPercent((current) => Math.max(current, scoreSummary.overall));
    });
    if (!mastered) return () => window.cancelAnimationFrame(frame);
    try {
      const saved = JSON.parse(localStorage.getItem(SECTION_KEY) || '[]');
      const progress = Array.from({ length: 7 }, (_, index) => Boolean(saved[index]));
      progress[3] = true;
      localStorage.setItem(SECTION_KEY, JSON.stringify(progress));
      markSectionComplete('A2', 1, 'grammar');
    } catch { /* Save again after the next update. */ }
    return () => window.cancelAnimationFrame(frame);
  }, [hydrated, mastered, scoreSummary.overall]);

  function setResponse(item: PublicItem, value: unknown) { setResponses((current) => ({ ...current, [item.id]: value })); }

  function play(url: string, id: string, restart = false) {
    if (audioRef.current && playingId === id && !restart) {
      if (audioRef.current.paused) void audioRef.current.play(); else audioRef.current.pause();
      setPlayingId(audioRef.current.paused ? '' : id);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(url);
    audio.preload = 'metadata';
    audio.playbackRate = speed;
    audioRef.current = audio;
    setLoadingAudioId(id); setAudioErrorId('');
    audio.onplaying = () => { setPlayingId(id); setLoadingAudioId(''); };
    audio.onpause = () => setPlayingId('');
    audio.onended = () => setPlayingId('');
    audio.onerror = () => { setAudioErrorId(id); setLoadingAudioId(''); setPlayingId(''); };
    void audio.play().catch(() => { setAudioErrorId(id); setLoadingAudioId(''); setPlayingId(''); });
  }

  async function submit(item: PublicItem) {
    if (submitting || grades[item.id]?.correct || grades[item.id]?.reveal) return;
    let response = responses[item.id];
    if (item.type === 'familySort') {
      const assignments = response && typeof response === 'object' ? response as Record<string, string> : {};
      response = Object.fromEntries(item.groupLabels.map((label: string) => [label, item.values.filter((value: string) => assignments[value] === label)]));
    }
    const attemptNumber = Math.min(2, (attempts[item.id] || 0) + 1);
    setSubmitting(true); setError('');
    try {
      const request = await fetch('/api/level2-grammar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: item.id, response, attemptNumber }) });
      const result = await request.json();
      if (!request.ok) throw new Error();
      setGrades((current) => ({ ...current, [item.id]: result }));
      setAttempts((current) => ({ ...current, [item.id]: attemptNumber }));
      if (result.reveal) setReviewIds((current) => current.includes(item.id) ? current : [...current, item.id]);
    } catch { setError('تعذّر تصحيح الإجابة. إجابتك محفوظة؛ حاول مرة أخرى.'); }
    finally { setSubmitting(false); }
  }

  function retry(item: PublicItem) {
    setGrades((current) => { const next = { ...current }; delete next[item.id]; return next; });
    setResponses((current) => { const next = { ...current }; delete next[item.id]; return next; });
  }

  function completeStage(stage: PublicStage) {
    const next = phases[phases.indexOf(stage.id) + 1];
    const nextIndex = phases.indexOf(next);
    setUnlocked((current) => Math.max(current, nextIndex));
    setPhase(next);
  }

  function nextItem(stage: PublicStage) {
    const index = indexes[stage.id] || 0;
    setIndexes((current) => ({ ...current, [stage.id]: index + 1 }));
  }

  function renderAudio(url: string, id: string, label: string) {
    const playing = playingId === id;
    return <div className="a2g-audio"><button type="button" onClick={() => play(url, id)} disabled={loadingAudioId === id} aria-label={`${playing ? 'إيقاف' : 'تشغيل'}: ${label}`}><PlayIcon paused={playing} />{loadingAudioId === id ? 'جارٍ التحميل…' : playing ? 'إيقاف' : 'استمع'}</button><button type="button" className="replay" onClick={() => play(url, id, true)} aria-label={`إعادة الصوت من البداية: ${label}`}><ReplayIcon /></button>{audioErrorId === id && <small role="alert">تعذّر تشغيل الصوت. حاول مرة أخرى.</small>}</div>;
  }

  function renderInput(item: PublicItem) {
    const value = responses[item.id];
    const locked = Boolean(grades[item.id]?.correct || grades[item.id]?.reveal);
    if (['singleChoice', 'fillBlank', 'oddOneOut', 'audioChoice'].includes(item.type)) return <div className="a2g-choices">{item.choices.map((choice: string) => <button type="button" className={value === choice ? 'selected' : ''} disabled={locked} key={choice} onClick={() => setResponse(item, choice)}>{choice}</button>)}</div>;
    if (item.type === 'audioCompare') return <><div className="a2g-audio-pair"><div>{renderAudio(item.audioA, `${item.id}-a`, 'التسجيل الأول')}<button type="button" className={value === 'audioA' ? 'selected' : ''} onClick={() => setResponse(item, 'audioA')} disabled={locked}>اختر التسجيل الأول</button></div><div>{renderAudio(item.audioB, `${item.id}-b`, 'التسجيل الثاني')}<button type="button" className={value === 'audioB' ? 'selected' : ''} onClick={() => setResponse(item, 'audioB')} disabled={locked}>اختر التسجيل الثاني</button></div></div></>;
    if (item.type === 'match') {
      const record = value && typeof value === 'object' ? value as Record<string, string> : {};
      return <div className="a2g-match">{item.left.map((left: string) => <label key={left}><strong>{left}</strong><select value={record[left] || ''} disabled={locked} onChange={(event) => setResponse(item, { ...record, [left]: event.target.value })}><option value="">اختر الطرف المناسب</option>{item.right.map((right: string) => <option key={right}>{right}</option>)}</select></label>)}</div>;
    }
    if (item.type === 'familySort') {
      const record = value && typeof value === 'object' ? value as Record<string, string> : {};
      return <div className="a2g-sort">{item.values.map((entry: string) => <label key={entry}><strong>{entry}</strong><select value={record[entry] || ''} disabled={locked} onChange={(event) => setResponse(item, { ...record, [entry]: event.target.value })}><option value="">صنّف الصيغة</option>{item.groupLabels.map((label: string) => <option key={label}>{label}</option>)}</select></label>)}</div>;
    }
    if (item.type === 'sentenceBuilder') {
      const selected = Array.isArray(value) ? value as string[] : [];
      return <div className="a2g-builder"><div className="built-sentence" aria-live="polite">{selected.length ? selected.map((token, index) => <span key={`${token}-${index}`}>{token}<span><button type="button" onClick={() => { const next = [...selected]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; setResponse(item, next); }} disabled={locked || index === 0}>يمين</button><button type="button" onClick={() => { const next = [...selected]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; setResponse(item, next); }} disabled={locked || index === selected.length - 1}>يسار</button><button type="button" onClick={() => setResponse(item, selected.filter((_, position) => position !== index))} disabled={locked}>حذف</button></span></span>) : 'اضغط الكلمات لبناء الجملة.'}</div><div className="a2g-token-bank">{item.tokens.map((token: string, index: number) => <button type="button" key={`${token}-${index}`} disabled={locked || selected.includes(token)} onClick={() => setResponse(item, [...selected, token])}>{token}</button>)}</div></div>;
    }
    if (item.type === 'cloze') {
      const answers = Array.isArray(value) ? value as string[] : Array.from({ length: item.blankCount }, () => '');
      return <div className="a2g-cloze"><p>{item.textAr}</p>{Array.from({ length: item.blankCount }, (_, index) => <label key={index}>الفراغ {index + 1}<input value={answers[index] || ''} disabled={locked} onChange={(event) => { const next = [...answers]; next[index] = event.target.value; setResponse(item, next); }} /></label>)}</div>;
    }
    if (item.type === 'parallelRewrite') {
      const record = value && typeof value === 'object' ? value as Record<string, string> : {};
      return <div className="a2g-parallel"><label>الجملة الأولى: «قَرَّرْتُ أَنْ…»<textarea rows={3} value={record.first || ''} disabled={locked} onChange={(event) => setResponse(item, { ...record, first: event.target.value })} /></label><label>الجملة الثانية: «أَحْتَاجُ إِلَى…»<textarea rows={3} value={record.second || ''} disabled={locked} onChange={(event) => setResponse(item, { ...record, second: event.target.value })} /></label></div>;
    }
    if (item.type === 'exitTicket') {
      const record = value && typeof value === 'object' ? value as Record<string, string> : {};
      return <div className="a2g-exit-inputs"><label>1. أَنْ + مضارع مفرد<textarea rows={2} value={record.singular || ''} disabled={locked} onChange={(event) => setResponse(item, { ...record, singular: event.target.value })} /></label><label>2. فعل من الأفعال الخمسة بعد أَنْ<textarea rows={2} value={record.fiveVerb || ''} disabled={locked} onChange={(event) => setResponse(item, { ...record, fiveVerb: event.target.value })} /></label><label>3. حرف جر + مصدر<textarea rows={2} value={record.preposition || ''} disabled={locked} onChange={(event) => setResponse(item, { ...record, preposition: event.target.value })} /></label></div>;
    }
    return <label className="a2g-text-answer">اكتب إجابتك كاملةً<textarea rows={item.type === 'guidedProduction' ? 7 : 3} value={String(value ?? '')} disabled={locked} onChange={(event) => setResponse(item, event.target.value)} />{item.type === 'guidedProduction' && <small>اكتب أربع جمل واستعمل التراكيب الأربعة المذكورة في السؤال.</small>}</label>;
  }

  function ruleLesson(ruleId: string) {
    if (!payload) return null;
    const rule = payload.rules.find((entry) => entry.id === ruleId)!;
    const examples = payload.examples.filter((entry) => entry.ruleId === ruleId);
    const text = (value: string) => value;
    return <section className="a2g-panel a2g-rule"><div className="a2g-rule-top"><div><div className="eyebrow">الشرح · Explanation</div><h2>{text(rule.titleAr)}</h2><p>{rule.purposeAr}</p><p dir="ltr">{rule.purposeEn}</p></div></div><div className="a2g-formula"><strong>{text(rule.formulaAr)}</strong><span dir="ltr">{rule.formulaEn}</span></div><ol className="a2g-steps">{rule.steps.map((step, index) => <li key={index}><b>{index + 1}</b><div><strong>{step.ar}</strong><small dir="ltr">{step.en}</small></div></li>)}</ol>{rule.table && <div className="a2g-table"><table><thead><tr><th>قبل</th><th>بعد أَنْ</th><th>التغيير</th></tr></thead><tbody>{rule.table.map((row) => <tr key={row.before}><td>{text(row.before)}</td><td>{text(row.after)}</td><td>{row.changeAr}<small dir="ltr">{row.changeEn}</small></td></tr>)}</tbody></table></div>}{rule.collocations && <div className="a2g-collocations">{rule.collocations.map((entry) => <article key={entry.patternAr}><strong>{text(entry.patternAr)}</strong><small dir="ltr">{entry.meaningEn}</small></article>)}</div>}{rule.contrastAr && <div className="a2g-contrast"><h3>قارن البنيتين · Compare</h3>{rule.contrastAr.map((entry, index) => <article key={entry}><strong>{text(entry)}</strong><span dir="ltr">{rule.contrastEn[index]}</span></article>)}</div>}<aside className="a2g-warning"><strong>تنبيه نحوي</strong><p>{rule.warningAr}</p><p dir="ltr">{rule.warningEn}</p></aside><h3>أمثلة مسموعة · Audio examples</h3><div className="a2g-examples">{examples.map((example) => <article key={example.id}><p>{text(example.textAr)}</p><mark>{text(example.focus)}</mark><small dir="ltr">{example.translationEn}</small>{renderAudio(example.audio, example.id, example.textAr)}</article>)}</div><button type="button" className="a2g-primary" onClick={() => setLearnedRules((current) => current.includes(ruleId) ? current : [...current, ruleId])}>فهمت القاعدة — ابدأ التمرين ←</button></section>;
  }

  function stageRunner(stage: PublicStage) {
    const index = indexes[stage.id] || 0;
    const item = stage.items[index];
    if (!item) return <section className="a2g-panel a2g-stage-complete"><div className="a2g-check">✓</div><h2>أكملت مرحلة «{stage.titleAr}»</h2><p>حُفظت إجاباتك تلقائيًا. يمكنك متابعة الدرس أو العودة لاحقًا.</p><button type="button" className="a2g-primary" onClick={() => completeStage(stage)}>{stage.id === 'mixed' ? 'اعرض النتيجة النهائية ←' : 'تابع إلى المرحلة التالية ←'}</button></section>;
    const grade = grades[item.id];
    return <section className="a2g-panel a2g-question"><div className="a2g-question-meta"><span>{stage.titleAr}</span><span>{index + 1} / {stage.items.length}</span><span>المحاولة {(attempts[item.id] || 0) + (grade ? 0 : 1)} من 2</span></div>{item.audio && renderAudio(item.audio, `${item.id}-audio`, item.promptAr)}<h2>{item.promptAr}</h2><details className="a2g-english-instruction"><summary>Show English instruction</summary><p dir="ltr">{item.promptEn}</p></details>{renderInput(item)}{grade ? <div className={`a2g-feedback ${grade.correct ? 'correct' : 'wrong'}`} role="status"><strong>{grade.correct ? 'إجابة صحيحة · Correct' : grade.reveal ? 'راجع النموذج · Review the model' : 'حاول مرة ثانية · Try again'}</strong><p>{grade.feedbackAr}</p><p dir="ltr">{grade.feedbackEn}</p>{grade.missingRequirements?.map((entry) => <small key={entry}>• {entry}</small>)}{grade.detectedPatterns?.length ? <div className="a2g-detected">تم اكتشاف: {grade.detectedPatterns.join(' · ')}</div> : null}{grade.rubricScore && <div className="a2g-rubric">{Object.entries(grade.rubricScore).map(([key, value]) => <span key={key}>{key}: {value}</span>)}</div>}{grade.reveal && <pre>{typeof grade.modelAnswer === 'string' ? grade.modelAnswer : JSON.stringify(grade.modelAnswer, null, 2)}</pre>}<div className="a2g-actions">{!grade.correct && !grade.reveal && <button type="button" onClick={() => retry(item)}>عدّل الإجابة · Edit answer</button>}<button type="button" className="a2g-primary" onClick={() => nextItem(stage)} disabled={!grade.correct && !grade.reveal}>{index === stage.items.length - 1 ? 'إنهاء المرحلة · Finish stage ←' : 'السؤال التالي · Next question ←'}</button></div></div> : <button type="button" className="a2g-primary" disabled={!hasResponse(item, responses[item.id]) || submitting} onClick={() => void submit(item)}>{submitting ? 'جارٍ التصحيح…' : 'تحقق من الإجابة · Check answer'}</button>}{error && <p className="a2g-error" role="alert">{error}</p>}</section>;
  }

  if (loading || !payload) return <main className="a2g-page" dir="rtl"><div className="a2g-loading" aria-live="polite">جارٍ إعداد درس القواعد…</div>{error && <p role="alert">{error}</p>}</main>;
  const stage = payload.stages.find((entry) => entry.id === phase);
  const currentRuleId = phase === 'rule1' || phase === 'rule2' ? phase : '';

  return <main className="a2g-page" dir="rtl"><header className="a2g-hero"><div><Link href="/levels/A2">← المستوى المتوسط · Intermediate</Link><div className="eyebrow">المستوى المتوسط · الدرس الأول · Grammar</div><h1>{payload.lesson.titleAr}</h1><p dir="ltr">{payload.lesson.titleEn} · {payload.lesson.estimatedMinutes} minutes</p></div><div className="a2g-summary"><strong>{Math.max(bestPercent, scoreSummary.overall)}%</strong><span>أفضل نتيجة · Best score</span><small>القاعدة 1: {scoreSummary.rule1}% · القاعدة 2: {scoreSummary.rule2}%</small><label>سرعة الصوت · Audio speed<select value={speed} onChange={(event) => { const next = Number(event.target.value) as 0.85 | 1; setSpeed(next); if (audioRef.current) audioRef.current.playbackRate = next; }}><option value="0.85">0.85×</option><option value="1">1×</option></select></label></div></header><nav className="a2g-phases" aria-label="مراحل درس القواعد">{phases.map((entry, index) => <button type="button" key={entry} className={`${phase === entry ? 'active' : ''} ${index < unlocked ? 'done' : ''}`} disabled={index > unlocked} onClick={() => index <= unlocked && setPhase(entry)}><b>{index < unlocked ? '✓' : index + 1}</b><span>{labels[entry].ar}</span><small dir="ltr">{labels[entry].en}</small></button>)}</nav>{phase === 'results' ? <section className="a2g-panel a2g-results"><div className="a2g-result-ring"><strong>{scoreSummary.overall}%</strong><span>{scoreSummary.score}/{scoreSummary.maximum}</span></div><div className="eyebrow">النتيجة النهائية · Final result</div><h2>{mastered ? 'أحسنت! أتقنت قواعد الدرس الأول.' : 'أكملت الدرس؛ راجع العناصر المحددة ثم أعد المحاولة.'}</h2><div className="a2g-mastery"><article className={scoreSummary.rule1 >= 70 ? 'pass' : ''}><strong>{scoreSummary.rule1}%</strong><span>أَنْ + المضارع</span><small>المطلوب 70% · Required</small></article><article className={scoreSummary.rule2 >= 70 ? 'pass' : ''}><strong>{scoreSummary.rule2}%</strong><span>حرف الجر + المصدر</span><small>المطلوب 70% · Required</small></article></div>{reviewIds.length > 0 && <div className="a2g-review"><h3>أنشطة تحتاج إلى مراجعة · Review activities</h3><p>{reviewIds.join(' · ')}</p></div>}<div className="a2g-actions"><button type="button" onClick={() => { setPhase('rule1'); setUnlocked(Math.max(unlocked, 1)); }}>راجع القاعدة الأولى · Review rule 1</button><button type="button" onClick={() => { setPhase('rule2'); setUnlocked(Math.max(unlocked, 2)); }}>راجع القاعدة الثانية · Review rule 2</button></div><LessonCompletion level="A2" lesson={1} section="grammar" passed={mastered} score={`${scoreSummary.overall}% · ${scoreSummary.score}/${scoreSummary.maximum}`} onRetry={() => { setPhase('rule1'); setUnlocked(Math.max(unlocked, 1)); }} grammarRulesRemain onBackToRules={() => setPhase('rule1')} /></section> : currentRuleId && !learnedRules.includes(currentRuleId) ? ruleLesson(currentRuleId) : stage ? stageRunner(stage) : null}</main>;
}
