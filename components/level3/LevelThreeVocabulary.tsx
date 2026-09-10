'use client';

/* eslint-disable @next/next/no-img-element -- Preserve the source bundle's responsive WebP sizing. */

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { levelThreeVocabularyLesson } from '../../data/level3/vocabulary';
import { levelThreeVocabularyPractice } from '../../data/level3/practice';
import audioManifest from '../../data/level3/audio-manifest.json';
import { markSectionComplete, removeReviewItem, upsertReviewItem } from '../../lib/learning-progress';
import { userStorage as localStorage } from '../../lib/user-scoped-storage.mjs';
import LessonCompletion from '../learning/LessonCompletion';

type Phase = 'prediction' | 'context' | 'active' | 'receptive' | 'networks' | 'practice' | 'results';
type WordStatus = 'new' | 'learning' | 'mastered';
type VocabularyItem = (typeof levelThreeVocabularyLesson.items)[number];
type VocabularyQuestion = (typeof levelThreeVocabularyPractice.stages)[number]['questions'][number] & {
  stageAr: string;
  stageEn: string;
};
type WordCardProps = {
  item: VocabularyItem;
  status: WordStatus;
  english: boolean;
  review: boolean;
  playing: string;
  compact?: boolean;
  audioExists: (url: string) => boolean;
  onEnglish: () => void;
  onStatus: (status: WordStatus) => void;
  onReview: () => void;
  onPlay: (url: string, id: string) => void;
};
const STORAGE_KEY = 'darlugha-level-03-vocabulary-lesson-01';
const SECTION_KEY = 'darlugha-b1-lesson-1-sections';
const categoryLabels: Record<string, { ar: string; en: string }> = {
  reasoning: { ar: 'التَّفْكِيرُ وَالرَّأْيُ', en: 'Reasoning and opinion' },
  institutions: { ar: 'الْمُؤَسَّسَاتُ وَالْقَرَارُ', en: 'Institutions and decisions' },
  negotiation: { ar: 'الِاخْتِلَافُ وَالتَّفَاوُضُ', en: 'Disagreement and negotiation' },
  outcomes: { ar: 'النَّتَائِجُ وَالتَّغْيِيرُ', en: 'Outcomes and change' },
};
const contextTokenMap: Record<string, string> = {
  اعتمد: 'v02', اشاروا: 'v06', مفاوضات: 'v09', اعترف: 'v01', شرعية: 'v18', يثبت: 'v21',
  حرصها: 'v05', معقول: 'v16', موضوعي: 'v17', اعاد: 'v08', تبنى: 'v22', تأثير: 'v11',
  ايجابي: 'v14', التوقعات: 'v12',
};

function normalizeArabic(value: string) {
  return value.normalize('NFKD').replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g, '').replace(/[^\u0621-\u064a]/g, '');
}

export default function LevelThreeVocabulary() {
  const lesson = levelThreeVocabularyLesson;
  const practice = levelThreeVocabularyPractice;
  const items = lesson.items;
  const activeItems = useMemo(() => items.filter((item) => item.band === 'active'), [items]);
  const receptiveItems = useMemo(() => items.filter((item) => item.band === 'receptive'), [items]);
  const activeGroups = useMemo(() => Array.from({ length: 4 }, (_, index) => activeItems.slice(index * 6, index * 6 + 6)), [activeItems]);
  const questions = useMemo<VocabularyQuestion[]>(() => practice.stages.flatMap((stage) => stage.questions.map((question) => ({ ...question, stageAr: stage.titleAr, stageEn: stage.titleEn }))), [practice.stages]);
  const availableAudio = useMemo(() => new Set(Object.values(audioManifest.clips).map((clip) => clip.file.split('/').pop())), []);
  const [loaded, setLoaded] = useState(false);
  const [phase, setPhase] = useState<Phase>('prediction');
  const [predictionIndex, setPredictionIndex] = useState(0);
  const [groupIndex, setGroupIndex] = useState(0);
  const [statuses, setStatuses] = useState<Record<string, WordStatus>>({});
  const [reviewIds, setReviewIds] = useState<string[]>([]);
  const [visitedIds, setVisitedIds] = useState<string[]>([]);
  const [englishIds, setEnglishIds] = useState<string[]>([]);
  const [contextItemId, setContextItemId] = useState('v01');
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ correct: boolean; selected: string } | null>(null);
  const [bestScore, setBestScore] = useState(0);
  const [lastScore, setLastScore] = useState(0);
  const [playing, setPlaying] = useState('');
  const [audioError, setAudioError] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (saved.phase) setPhase(saved.phase);
        if (Number.isInteger(saved.predictionIndex)) setPredictionIndex(saved.predictionIndex);
        if (Number.isInteger(saved.groupIndex)) setGroupIndex(saved.groupIndex);
        if (saved.statuses) setStatuses(saved.statuses);
        if (Array.isArray(saved.reviewIds)) setReviewIds(saved.reviewIds);
        if (Array.isArray(saved.visitedIds)) setVisitedIds(saved.visitedIds);
        if (Number.isInteger(saved.practiceIndex)) setPracticeIndex(saved.practiceIndex);
        if (saved.results) setResults(saved.results);
        if (Array.isArray(saved.wrongIds)) setWrongIds(saved.wrongIds);
        if (typeof saved.bestScore === 'number') setBestScore(saved.bestScore);
        if (typeof saved.lastScore === 'number') setLastScore(saved.lastScore);
      } catch { /* use clean progress */ }
      setLoaded(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ phase, predictionIndex, groupIndex, statuses, reviewIds, visitedIds, practiceIndex, results, wrongIds, bestScore, lastScore }));
  }, [loaded, phase, predictionIndex, groupIndex, statuses, reviewIds, visitedIds, practiceIndex, results, wrongIds, bestScore, lastScore]);

  useEffect(() => {
    if (phase !== 'active') return;
    const frame = window.requestAnimationFrame(() => {
      setVisitedIds((current) => Array.from(new Set([...current, ...activeGroups[groupIndex].map((item) => item.id)])));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [phase, groupIndex, activeGroups]);
  useEffect(() => () => { audioRef.current?.pause(); }, []);

  function audioExists(url: string) { return availableAudio.has(url.split('/').pop()); }
  function playAudio(url: string, id: string) {
    if (!audioExists(url)) { setAudioError('التسجيل غير متوفر حاليًا. · This recording is currently unavailable.'); return; }
    setAudioError('');
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    if (playing === id) { setPlaying(''); return; }
    const audio = new Audio(url); audio.preload = 'none'; audioRef.current = audio;
    audio.onended = () => setPlaying('');
    audio.onerror = () => { setPlaying(''); setAudioError('تعذّر تشغيل التسجيل. حاول مرة أخرى. · The recording could not be played. Please try again.'); };
    setPlaying(id); audio.play().catch(() => { setPlaying(''); setAudioError('تعذّر تشغيل التسجيل. حاول مرة أخرى. · The recording could not be played. Please try again.'); });
  }
  function toggleReview(id: string) {
    const item = items.find((entry) => entry.id === id);
    const reviewId = `b1-l1-vocabulary-${id}`;
    if (reviewIds.includes(id)) removeReviewItem(reviewId);
    else if (item) upsertReviewItem({ id: reviewId, level: 'B1', lesson: 1, section: 'vocabulary', arabic: item.word, english: item.glossEn, example: item.example, audioUrl: item.wordAudioUrl });
    setReviewIds((current) => current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]);
  }
  function beginPractice() { setPracticeIndex(0); setResults({}); setWrongIds([]); setFeedback(null); setPhase('practice'); }
  function chooseAnswer(choice: string) {
    const question = questions[practiceIndex]; const correct = choice === question.answer;
    if (!(question.id in results)) {
      setResults((current) => ({ ...current, [question.id]: correct }));
      if (!correct) {
        const related = question.vocabularyIds || [];
        setWrongIds((current) => Array.from(new Set([...current, ...related])));
        setReviewIds((current) => Array.from(new Set([...current, ...related])));
      }
    }
    setFeedback({ correct, selected: choice });
  }
  function nextQuestion() {
    if (!feedback?.correct) return;
    if (practiceIndex < questions.length - 1) { setPracticeIndex((index) => index + 1); setFeedback(null); return; }
    const finalScore = Object.values(results).filter(Boolean).length;
    setLastScore(finalScore); setBestScore((best) => Math.max(best, finalScore)); setPhase('results');
    if (finalScore >= practice.assessment.passPoints) {
      let sections = [false, false, false, false, false, false];
      try { const parsed = JSON.parse(localStorage.getItem(SECTION_KEY) || '[]'); if (Array.isArray(parsed)) sections = sections.map((_, index) => Boolean(parsed[index])); } catch {}
      sections[0] = true; localStorage.setItem(SECTION_KEY, JSON.stringify(sections));
      markSectionComplete('B1', 1, 'vocabulary');
    }
  }
  function reviewWord(id: string) {
    const item = items.find((entry) => entry.id === id); if (!item) return;
    if (item.band === 'active') { const index = activeItems.findIndex((entry) => entry.id === id); setGroupIndex(Math.floor(index / 6)); setPhase('active'); }
    else setPhase('receptive');
    setContextItemId(id);
  }
  const currentQuestion = questions[practiceIndex];
  const contextItem = items.find((item) => item.id === contextItemId);

  return <main className="shell level-three-vocabulary" dir="rtl">
    <header className="l3v-header"><div><Link className="back-link" href="/levels/B1">← المستوى المتقدم · Advanced</Link><div className="eyebrow">المستوى المتقدم · Advanced · الدرس الأول · Lesson 1</div><h1>{lesson.lesson.titleAr}</h1><p dir="ltr">{lesson.lesson.titleEn} · {lesson.lesson.estimatedMinutes} minutes</p></div><div className="l3v-summary"><strong>{phase === 'practice' ? `${practiceIndex + 1}/20` : `${visitedIds.length}/24`}</strong><span>{phase === 'practice' ? 'سؤال · Question' : 'مفردة إنتاجية شوهدت · Active words viewed'}</span></div></header>
    <nav className="l3v-steps" aria-label="مراحل درس المفردات · Vocabulary stages">{[['prediction','التوقع · Predict'],['context','السياق · Context'],['active','الإنتاجية · Active'],['receptive','الاستيعابية · Receptive'],['networks','الشبكات · Networks'],['practice','التدريب · Practice'],['results','النتيجة · Result']].map(([key, label], index) => <span className={phase === key ? 'active' : ''} key={key}><b>{index + 1}</b>{label}</span>)}</nav>

    {phase === 'prediction' && <section className="l3v-panel prediction-panel"><img src={lesson.prediction.image} alt={lesson.prediction.altAr} /><div className="eyebrow">انظر وتوقّع · Look and predict</div><div className="prediction-count">السؤال · Question {predictionIndex + 1}/4</div><h2>{lesson.prediction.questions[predictionIndex]}</h2><details dir="ltr"><summary>تلميح للملاحظة · Observation hint</summary><p>لاحظ الأشخاص والوثائق وأجواء الاجتماع، ثم كوّن توقعًا. لا تُحتسب لهذا السؤال نقاط.</p><p>Notice the people, documents, and meeting atmosphere, then make a prediction. This question is not graded.</p></details><button className="button" type="button" onClick={() => predictionIndex < 3 ? setPredictionIndex((index) => index + 1) : setPhase('context')}>{predictionIndex < 3 ? 'فكرت في الإجابة، التالي · I have an answer, next ←' : 'انتقل إلى السياق · Go to context ←'}</button></section>}

    {phase === 'context' && <section className="l3v-panel context-panel"><div className="eyebrow">السياق الأول · First context</div><h2>اقرأ النص واضغط على الكلمات المميّزة · Read and select the highlighted words</h2><p className="context-text">{lesson.context.textAr.split(/(\s+)/).map((token: string, index: number) => { const id = contextTokenMap[normalizeArabic(token)]; return id ? <button type="button" key={`${token}-${index}`} onClick={() => setContextItemId(id)}>{token}</button> : token; })}</p>{contextItem && <aside className="context-definition"><strong>{contextItem.word}</strong><span>{contextItem.definitionAr}</span><button type="button" onClick={() => playAudio(contextItem.wordAudioUrl, `context-${contextItem.id}`)}>{playing === `context-${contextItem.id}` ? '⏸ إيقاف · Stop' : '🔊 استمع · Listen'}</button></aside>}<details dir="ltr"><summary>ملخص مساعد بالإنجليزية · English summary</summary><p>{lesson.context.textEn}</p></details><div className="l3v-actions"><button className="review-button" type="button" onClick={() => setPhase('prediction')}>السابق · Previous</button><button className="button" type="button" onClick={() => setPhase('active')}>المفردات الإنتاجية · Active vocabulary ←</button></div></section>}

    {phase === 'active' && <section className="l3v-panel"><div className="eyebrow">24 مفردة إنتاجية · 24 active words</div><h2>المجموعة · Group {groupIndex + 1}/4</h2><div className="group-tabs" role="tablist">{activeGroups.map((group, index) => <button role="tab" aria-selected={groupIndex === index} className={groupIndex === index ? 'active' : ''} key={index} onClick={() => setGroupIndex(index)}>المجموعة · Group {index + 1}<small>{group.length} كلمات · words</small></button>)}</div><div className="advanced-word-grid">{activeGroups[groupIndex].map((item) => <WordCard key={item.id} item={item} status={statuses[item.id] || 'new'} english={englishIds.includes(item.id)} review={reviewIds.includes(item.id)} playing={playing} audioExists={audioExists} onEnglish={() => setEnglishIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} onStatus={(status: WordStatus) => setStatuses((current) => ({ ...current, [item.id]: status }))} onReview={() => toggleReview(item.id)} onPlay={playAudio} />)}</div><div className="l3v-actions"><button className="review-button" type="button" disabled={groupIndex === 0} onClick={() => setGroupIndex((index) => index - 1)}>المجموعة السابقة · Previous group</button>{groupIndex < 3 ? <button className="button" type="button" onClick={() => setGroupIndex((index) => index + 1)}>المجموعة التالية · Next group ←</button> : <button className="button" type="button" onClick={() => setPhase('receptive')}>المفردات الاستيعابية · Receptive vocabulary ←</button>}</div></section>}

    {phase === 'receptive' && <section className="l3v-panel receptive-panel"><div className="eyebrow">16 مفردة استيعابية · 16 receptive words</div><h2>افهمها عند القراءة والاستماع · Recognize them while reading and listening</h2><p>هذه الكلمات لا تدخل في شرط إتقان المفردات الإنتاجية. · These words do not count toward active-vocabulary mastery.</p><div className="advanced-word-grid compact">{receptiveItems.map((item) => <WordCard key={item.id} item={item} status={statuses[item.id] || 'new'} english={englishIds.includes(item.id)} review={reviewIds.includes(item.id)} playing={playing} compact audioExists={audioExists} onEnglish={() => setEnglishIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} onStatus={(status: WordStatus) => setStatuses((current) => ({ ...current, [item.id]: status }))} onReview={() => toggleReview(item.id)} onPlay={playAudio} />)}</div><div className="l3v-actions"><button className="review-button" type="button" onClick={() => setPhase('active')}>العودة إلى الإنتاجية · Back to active words</button><button className="button" type="button" onClick={() => setPhase('networks')}>شبكات الكلمات · Word networks ←</button></div></section>}

    {phase === 'networks' && <section className="l3v-panel"><div className="eyebrow">شبكات دلالية وصرفية · Semantic and morphological networks</div><h2>اربط الكلمة بعائلتها وتركيبها · Connect each word to its family and collocation</h2><div className="semantic-grid">{Object.entries(categoryLabels).map(([category, label]) => <article key={category}><h3>{label.ar}</h3><p dir="ltr">{label.en}</p>{items.filter((item) => item.category === category).map((item) => <div key={item.id}><strong>{item.word}</strong><span>{item.family}</span><small>{item.collocation}</small></div>)}</article>)}</div><div className="l3v-actions"><button className="review-button" type="button" onClick={() => setPhase('receptive')}>السابق · Previous</button><button className="button" type="button" disabled={visitedIds.length < 24} onClick={beginPractice}>{visitedIds.length < 24 ? 'شاهد المجموعات الأربع أولًا · View all four groups first' : 'ابدأ التدريب النهائي · Start final practice ←'}</button></div></section>}

    {phase === 'practice' && currentQuestion && <section className="l3v-panel practice-panel"><div className="practice-heading"><div><div className="eyebrow">{currentQuestion.stageAr} · {currentQuestion.stageEn}</div></div><strong>{practiceIndex + 1} / 20</strong></div><div className="l3v-progress"><span style={{ width: `${((practiceIndex + 1) / 20) * 100}%` }} /></div><h2>{currentQuestion.promptAr}</h2><div className="advanced-choices">{currentQuestion.choices.map((choice: string) => <button type="button" className={feedback?.selected === choice ? (feedback.correct ? 'correct' : 'wrong') : ''} key={choice} onClick={() => chooseAnswer(choice)}>{choice}</button>)}</div>{feedback && <div className={feedback.correct ? 'advanced-feedback correct' : 'advanced-feedback wrong'} role="status"><strong>{feedback.correct ? '✓ صحيح · Correct' : '✕ حاول مرة أخرى · Try again'}</strong><p>الإجابة الصحيحة · Correct answer: {currentQuestion.answer}</p>{!feedback.correct && <button className="review-button" type="button" onClick={() => setFeedback(null)}>حاول مرة أخرى · Try again</button>}<div className="review-links">{currentQuestion.vocabularyIds.map((id: string) => <button type="button" key={id} onClick={() => reviewWord(id)}>راجع · Review: {items.find((item) => item.id === id)?.word}</button>)}</div></div>}<div className="l3v-actions"><button className="review-button" type="button" disabled={practiceIndex === 0} onClick={() => { setPracticeIndex((index) => index - 1); setFeedback(null); }}>السابق · Previous</button><button className="button" type="button" disabled={!feedback?.correct} onClick={nextQuestion}>{practiceIndex === 19 ? 'إنهاء التدريب · Finish practice' : 'السؤال التالي · Next question ←'}</button></div></section>}

    {phase === 'results' && <section className="l3v-panel results-panel"><div className="result-medal">{lastScore >= 16 ? '🎉' : '🌱'}</div><div className="eyebrow">نتيجة المفردات · Vocabulary result</div><h2>{lastScore >= 16 ? 'أحسنت! أتقنت مفردات الدرس. · Well done! You mastered the lesson vocabulary.' : 'أكملت التدريب. راجع الكلمات وحاول مرة أخرى. · Review the words and try again.'}</h2><div className="result-score"><strong>{lastScore}/20</strong><span>{lastScore * 5}% · الإتقان من 16/20 · Mastery: 16/20</span></div><p>أفضل نتيجة · Best score: {bestScore}/20</p>{wrongIds.length > 0 && <div className="needs-review"><h3>كلمات تحتاج إلى مراجعة · Words to review</h3>{wrongIds.map((id) => <button type="button" key={id} onClick={() => reviewWord(id)}>{items.find((item) => item.id === id)?.word}</button>)}</div>}<LessonCompletion level="B1" lesson={1} section="vocabulary" passed={lastScore >= 16} score={`${lastScore}/20`} onRetry={beginPractice} /></section>}
    {audioError && <p className="audio-error" role="alert">{audioError}</p>}
  </main>;
}

function WordCard({ item, status, english, review, playing, compact = false, audioExists, onEnglish, onStatus, onReview, onPlay }: WordCardProps) {
  const category = categoryLabels[item.category]; const wordAudioId = `word-${item.id}`; const exampleAudioId = `example-${item.id}`;
  return <article className={`advanced-word-card ${compact ? 'receptive' : 'active'}`}><div className="word-card-meta"><span>{compact ? 'استيعابية · Receptive' : 'إنتاجية · Active'}</span><small>{category?.ar}</small></div><div className="advanced-word-title"><h3>{item.word}</h3><button type="button" disabled={!audioExists(item.wordAudioUrl)} aria-label={`استمع إلى كلمة ${item.word} · Listen to the word`} onClick={() => onPlay(item.wordAudioUrl, wordAudioId)}>{playing === wordAudioId ? '⏸' : '🔊'}</button></div><p className="part-of-speech" dir="ltr">{item.partOfSpeech}</p><p className="definition-ar">{item.definitionAr}</p><button className="show-english" type="button" onClick={onEnglish}>{english ? 'إخفاء الإنجليزية · Hide English' : 'إظهار الإنجليزية · Show English'}</button>{english && <p className="english-gloss" dir="ltr">{item.glossEn}</p>}{!compact && <><dl><div><dt>التركيب · Collocation</dt><dd>{item.collocation}</dd></div><div><dt>العائلة · Word family</dt><dd>{item.family}</dd></div></dl><div className="advanced-example"><div><p>{item.example}</p><button type="button" disabled={!audioExists(item.exampleAudioUrl)} aria-label={`استمع إلى مثال ${item.word} · Listen to the example`} onClick={() => onPlay(item.exampleAudioUrl, exampleAudioId)}>{playing === exampleAudioId ? '⏸' : '🔊'}</button></div>{english && <span dir="ltr">{item.exampleEn}</span>}</div></>}<div className="advanced-word-actions"><button type="button" className={review ? 'saved' : ''} onClick={onReview}>{review ? '✓ في المراجعة · In review' : '＋ أضف إلى المراجعة · Add to review'}</button><label>الحالة · Status<select value={status} onChange={(event) => onStatus(event.target.value as WordStatus)}><option value="new">جديدة · New</option><option value="learning">قيد التعلّم · Learning</option><option value="mastered">متقنة · Mastered</option></select></label></div></article>;
}
