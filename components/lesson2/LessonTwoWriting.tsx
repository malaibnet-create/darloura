'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildWritingCard, evaluateWritingDraft, type WritingDraft } from '../../data/lesson2/writing-evaluation';
import { lesson02Writing } from '../../data/lesson2/writing';
import { lesson02WritingPractice } from '../../data/lesson2/writing-practice';
import manifest from '../../data/lesson2/writing-manifest.json';
import { userStorage as localStorage } from '../../lib/user-scoped-storage.mjs';

type Stage = 'model' | 'discovery' | 'ordering' | 'fields' | 'tips' | 'editing' | 'write' | 'review' | 'report';
type SavedState = { stage?: Stage; draft?: WritingDraft; order?: string[]; orderIndex?: number; editIndex?: number; selfCheck?: boolean[]; evaluation?: ReturnType<typeof evaluateWritingDraft> | null };

const STORAGE_KEY = 'darlugha-lesson-2-writing-progress';
const initialDraft: WritingDraft = { name: '', country: '', languages: [], studySubject: '', studyPlace: '', day: 'الْيَوْمَ', startTime: '', endTime: '' };
const clips = Object.fromEntries(manifest.clips.map((clip) => [clip.id, `${manifest.basePath}${clip.file}`]));

export default function LessonTwoWriting() {
  const [stage, setStage] = useState<Stage>('model');
  const [draft, setDraft] = useState<WritingDraft>(initialDraft);
  const [orderIndex, setOrderIndex] = useState(0);
  const [order, setOrder] = useState<string[]>([]);
  const [orderFeedback, setOrderFeedback] = useState('');
  const [editIndex, setEditIndex] = useState(0);
  const [selfCheck, setSelfCheck] = useState<boolean[]>(() => lesson02Writing.selfCheck.map(() => false));
  const [evaluation, setEvaluation] = useState<ReturnType<typeof evaluateWritingDraft> | null>(null);
  const [audio, setAudio] = useState<{ id: string; state: 'loading' | 'playing' | 'error' } | null>(null);
  const [audioError, setAudioError] = useState('');
  const activeAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as SavedState;
        if (saved.stage) setStage(saved.stage);
        if (saved.draft) setDraft({ ...initialDraft, ...saved.draft });
        if (saved.order) setOrder(saved.order);
        if (typeof saved.orderIndex === 'number') setOrderIndex(saved.orderIndex);
        if (typeof saved.editIndex === 'number') setEditIndex(saved.editIndex);
        if (saved.selfCheck) setSelfCheck(saved.selfCheck);
        if (saved.evaluation) setEvaluation(saved.evaluation);
      } catch { /* ignore an invalid local draft */ }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ stage, draft, order, orderIndex, editIndex, selfCheck, evaluation } satisfies SavedState));
  }, [stage, draft, order, orderIndex, editIndex, selfCheck, evaluation]);

  const stopAudio = () => { activeAudio.current?.pause(); activeAudio.current = null; setAudio(null); };
  const playAudio = (id: string) => {
    const url = clips[id as keyof typeof clips];
    if (!url) return;
    stopAudio();
    const player = new Audio(url);
    activeAudio.current = player;
    player.preload = 'none';
    setAudioError(''); setAudio({ id, state: 'loading' });
    player.onended = () => { if (activeAudio.current === player) { activeAudio.current = null; setAudio(null); } };
    player.onerror = () => { if (activeAudio.current === player) { activeAudio.current = null; setAudio({ id, state: 'error' }); setAudioError('تعذّر تشغيل هذا الصوت. حاول مرة أخرى.'); } };
    void player.play().then(() => { if (activeAudio.current === player) setAudio({ id, state: 'playing' }); }).catch(() => { if (activeAudio.current === player) { activeAudio.current = null; setAudio({ id, state: 'error' }); setAudioError('تعذّر تشغيل هذا الصوت. حاول مرة أخرى.'); } });
  };
  const audioButton = (id: string, label: string) => <button type="button" className="review-button" aria-label={label} onClick={() => audio?.id === id && audio.state === 'playing' ? stopAudio() : playAudio(id)}>{audio?.id === id && audio.state === 'loading' ? 'جار التحميل…' : audio?.id === id && audio.state === 'playing' ? 'إيقاف الصوت' : '🔊 ' + label}</button>;
  const go = (next: Stage) => { setStage(next); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const updateDraft = (key: keyof WritingDraft, value: string | string[]) => setDraft((current) => ({ ...current, [key]: value }));
  const card = useMemo(() => buildWritingCard(draft), [draft]);
  const currentOrder = lesson02WritingPractice.ordering[orderIndex];
  const orderingDone = orderIndex >= lesson02WritingPractice.ordering.length;
  const completeOrdering = () => {
    const normalized = (value: string) => value.normalize('NFC').replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').replace(/ـ/g, '').replace(/[أإآٱ]/g, 'ا').replace(/\s+/g, ' ').trim();
    if (normalized(order.join(' ')) === normalized(currentOrder.answer.join(' '))) { setOrderFeedback('صحيح ✓ Correct'); window.setTimeout(() => { setOrder([]); setOrderFeedback(''); setOrderIndex((value) => value + 1); }, 350); } else setOrderFeedback(`حاول مرة أخرى. ${currentOrder.feedbackEn}`);
  };
  const submit = () => { const result = evaluateWritingDraft(draft); setEvaluation(result); go('report'); };
  const reset = () => { setStage('model'); setDraft(initialDraft); setOrder([]); setOrderIndex(0); setEditIndex(0); setSelfCheck(lesson02Writing.selfCheck.map(() => false)); setEvaluation(null); };

  return <main className="writing-page" dir="rtl">
    <header className="writing-head"><Link className="back-link" href="/lessons/2">← عناصر الدرس</Link><div className="eyebrow">المستوى A1 · الدرس الثاني · الكتابة</div><h1>{lesson02Writing.title.ar}</h1><p dir="ltr">{lesson02Writing.title.en} · Lesson 2 Writing</p><div className="writing-progress"><span style={{ width: `${((['model','discovery','ordering','fields','tips','editing','write','review','report'].indexOf(stage) + 1) / 9) * 100}%` }} /></div></header>
    {stage === 'model' && <section className="writing-panel"><h2>١. اقرأ النموذج – Read the model</h2><div className="writing-tip">استمع أولًا، ثم اقرأ الجمل. التشكيل موجود في النموذج، لكنه غير مطلوب في كتابتك.</div>{audioButton('w2-model-full', 'استمع إلى البطاقة كاملة')}{lesson02Writing.model.sentences.map((sentence) => <article className="writing-model" key={sentence.id}><p>{sentence.text}</p><p dir="ltr" className="muted-text">{sentence.translation}</p>{audioButton(sentence.audioId, 'استمع إلى الجملة')}</article>)}<div className="writing-actions"><button type="button" className="button" onClick={() => go('discovery')}>التالي: اكتشف أجزاء البطاقة ←</button></div></section>}
    {stage === 'discovery' && <section className="writing-panel"><h2>٢. اكتشف أجزاء البطاقة</h2>{lesson02Writing.discovery.map((item, index) => <article className="writing-model" key={item.question}><h3>{item.question}</h3><p>{item.answer}</p>{audioButton(`w2-model-0${index + 1}`, 'استمع إلى الإجابة')}</article>)}<button type="button" className="button" onClick={() => go('ordering')}>التالي: رتّب الجمل ←</button></section>}
    {stage === 'ordering' && <section className="writing-panel"><h2>٣. رتّب الجملة – Arrange</h2>{orderingDone ? <><p className="writing-correct">أحسنت! رتّبت الجمل الأربع.</p><button type="button" className="button" onClick={() => go('fields')}>التالي: أكمل الحقول ←</button></> : <><div className="eyebrow">السؤال {orderIndex + 1} من {lesson02WritingPractice.ordering.length}</div><p className="writing-sentence">{order.join(' ') || 'اضغط الكلمات بالترتيب الصحيح'}</p><div className="writing-word-bank">{currentOrder.tokens.map((token) => <button type="button" key={token} onClick={() => setOrder((items) => items.includes(token) ? items : [...items, token])}>{token}</button>)}</div><div className="writing-actions"><button type="button" className="review-button" onClick={() => setOrder((items) => items.slice(0, -1))}>إزالة آخر كلمة</button><button type="button" className="review-button" onClick={() => setOrder([])}>ابدأ من جديد</button><button type="button" className="button" onClick={completeOrdering}>تحقق</button></div>{orderFeedback && <p className={orderFeedback.startsWith('صحيح') ? 'writing-correct' : 'writing-wrong'}>{orderFeedback}</p>}</>}</section>}
    {stage === 'fields' && <section className="writing-panel"><h2>٤. أكمل حقول بطاقتك</h2><p>اكتب معلوماتك أنت، ولا تنسخ نموذج آدم. يمكنك الكتابة بلا تشكيل.</p><Field label="اِسْمِي" value={draft.name} onChange={(value) => updateDraft('name', value)} placeholder="مثال: سارة" /><Field label="أَنَا مِنْ" value={draft.country} onChange={(value) => updateDraft('country', value)} suggestions={lesson02Writing.guidedFields[1].suggestions} /><div className="field-block"><label>أَتَكَلَّمُ</label><input value={draft.languages.join(' وَ')} onChange={(event) => updateDraft('languages', event.target.value.split(/\s+وَ?\s*/).filter(Boolean))} placeholder="الإنجليزية أو الإنجليزية والفرنسية" /><div className="writing-word-bank">{lesson02Writing.guidedFields[2].suggestions.map((value) => <button type="button" key={value} onClick={() => updateDraft('languages', draft.languages.includes(value) ? draft.languages.filter((item) => item !== value) : [...draft.languages, value])}>{value}</button>)}</div></div><Field label="أَدْرُسُ" value={draft.studySubject} onChange={(value) => updateDraft('studySubject', value)} suggestions={lesson02Writing.guidedFields[3].suggestions} /><Field label="فِي" value={draft.studyPlace} onChange={(value) => updateDraft('studyPlace', value)} suggestions={lesson02Writing.guidedFields[4].suggestions} /><Field label="دَرْسِي" value={draft.day || ''} onChange={(value) => updateDraft('day', value)} suggestions={lesson02Writing.guidedFields[5].suggestions} /><div className="field-row"><Field label="مِنَ" value={draft.startTime} onChange={(value) => updateDraft('startTime', value)} suggestions={lesson02Writing.guidedFields[6].suggestions} /><Field label="إِلَى" value={draft.endTime} onChange={(value) => updateDraft('endTime', value)} suggestions={lesson02Writing.guidedFields[7].suggestions} /></div><button type="button" className="review-button" onClick={() => updateDraft('studyPlace', '')}>حذف حقل واحد: مكان الدراسة</button><div className="writing-actions"><button type="button" className="button" onClick={() => go('tips')}>التالي: تعلّم الصياغة ←</button></div></section>}
    {stage === 'tips' && <section className="writing-panel"><h2>٥. المسافة والنقطة والواو والوقت</h2>{lesson02Writing.punctuationTips.map((tip) => <article className="writing-model" key={tip.id}><h3 dir="ltr">{tip.en}</h3><p className="writing-correct">{tip.good}</p>{'bad' in tip && <p className="writing-wrong">{tip.bad}</p>}{'audioId' in tip && audioButton(tip.audioId, 'استمع إلى المثال')}</article>)}<button type="button" className="button" onClick={() => go('editing')}>التالي: صحّح الأمثلة ←</button></section>}
    {stage === 'editing' && <section className="writing-panel"><h2>٦. صحّح الأمثلة</h2>{editIndex >= lesson02WritingPractice.editing.length ? <><p className="writing-correct">أحسنت! صححت الأمثلة الثلاثة.</p><button type="button" className="button" onClick={() => go('write')}>التالي: اكتب بطاقتك ←</button></> : <><div className="eyebrow">السؤال {editIndex + 1} من {lesson02WritingPractice.editing.length}</div><p>{lesson02WritingPractice.editing[editIndex].feedbackEn}</p>{lesson02WritingPractice.editing[editIndex].options.map((option, optionIndex) => <button type="button" className="writing-choice" key={option} onClick={() => { if (optionIndex === lesson02WritingPractice.editing[editIndex].correctIndex) setEditIndex((value) => value + 1); }}>{option}</button>)}</>}</section>}
    {stage === 'write' && <section className="writing-panel"><h2>٧. اكتب بطاقتك – Write your card</h2><p>عدّل الجمل الخمس إذا أردت. لا يشترط التشكيل، ويُسمح بمعلومات وأسماء وبلدان مختلفة.</p>{card.map((line, index) => <input className="writing-line-input" dir="rtl" key={index} value={line} onChange={(event) => { const value = event.target.value.replace(/[.。]$/, ''); if (index === 0) updateDraft('name', value.replace(/^اِسْمِي\s*/, '')); if (index === 1) updateDraft('country', value.replace(/^أَنَا مِنْ\s*/, '')); if (index === 2) updateDraft('languages', value.replace(/^أَتَكَلَّمُ\s*/, '').split(/\s+وَ?\s*/).filter(Boolean)); if (index === 3) { const match = value.match(/^أَدْرُسُ\s+(.+)\s+فِي\s+(.+)$/); if (match) { updateDraft('studySubject', match[1]); updateDraft('studyPlace', match[2]); } } if (index === 4) { const match = value.match(/^دَرْسِي(?:\s+(.+?))?\s+مِنَ\s+(.+)\s+إِلَى\s+(.+)$/); if (match) { updateDraft('day', match[1] || ''); updateDraft('startTime', match[2]); updateDraft('endTime', match[3]); } } }} />)}<button type="button" className="button" onClick={() => go('review')}>مراجعة – Review</button></section>}
    {stage === 'review' && <section className="writing-panel"><h2>٨. راجع بطاقتك</h2>{card.map((line) => <p className="writing-sentence" key={line}>{line}</p>)}<div className="writing-tip"><strong>قائمة المراجعة</strong>{lesson02Writing.selfCheck.map((item, index) => <label key={item}><input type="checkbox" checked={selfCheck[index]} onChange={() => setSelfCheck((items) => items.map((checked, itemIndex) => itemIndex === index ? !checked : checked))} /> <span dir="ltr">{item}</span></label>)}</div><button type="button" className="button" disabled={!selfCheck.every(Boolean)} onClick={submit}>إرسال الكتابة – Submit</button></section>}
    {stage === 'report' && evaluation && <section className="writing-panel writing-final"><h2>٩. تقرير الكتابة</h2><p className="eyebrow">النتيجة: {evaluation.points}/5 · النجاح من 4/5</p><p className={evaluation.passed ? 'writing-correct' : 'writing-wrong'}>{evaluation.passed ? 'نجحت! بطاقتك مفهومة.' : 'أكمل بعض العناصر ثم حاول مرة أخرى.'}</p>{lesson02WritingPractice.rubric.map((criterion) => <p key={criterion.id}>{evaluation.criteria[criterion.id as keyof typeof evaluation.criteria] ? '✓' : '○'} <span dir="ltr">{criterion.labelEn}</span></p>)}<div className="writing-actions"><button type="button" className="button" onClick={() => go('write')}>عدّل كتابتي – Edit</button><button type="button" className="review-button" onClick={reset}>اكتب مرة أخرى – Write again</button><Link className="review-button" href="/lessons/2">العودة إلى عناصر الدرس</Link></div></section>}
    {audioError && <p className="writing-wrong" role="alert">{audioError} <button type="button" onClick={() => audio && playAudio(audio.id)}>إعادة المحاولة</button></p>}
  </main>;
}

function Field({ label, value, onChange, placeholder, suggestions = [] }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; suggestions?: readonly string[] }) { return <div className="field-block"><label>{label}</label><input dir="rtl" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />{suggestions.length > 0 && <div className="writing-word-bank">{suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => onChange(suggestion)}>{suggestion}</button>)}</div>}</div>; }
