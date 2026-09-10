'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { level03Lesson01Phrases } from '../../data/level3/phrases';
import { level03Lesson01PhrasePractice } from '../../data/level3/phrase-practice';
import audioManifest from '../../data/level3/phrase-audio-manifest.json';
import { markSectionComplete, removeReviewItem, upsertReviewItem } from '../../lib/learning-progress';
import { userStorage as localStorage } from '../../lib/user-scoped-storage.mjs';
import LessonCompletion from '../learning/LessonCompletion';

type Phase = 'discover' | 'understand' | 'compare' | 'practice' | 'use' | 'results';
type PhraseStatus = 'new' | 'learning' | 'mastered' | 'review';
type PhraseCategory = (typeof level03Lesson01Phrases.categories)[number];
type PhraseItem = (typeof level03Lesson01Phrases.phrases)[number];
type PhraseCardProps = {
  phrase: PhraseItem;
  category: PhraseCategory;
  opened: boolean;
  english: boolean;
  status: PhraseStatus;
  playingId: string;
  loadingId: string;
  onOpen: () => void;
  onEnglish: () => void;
  onStatus: (status: PhraseStatus) => void;
  onPlay: (path: string, id: string, label: string) => void;
};
type ComparisonPanelProps = {
  title: string;
  first: PhraseItem;
  second: PhraseItem;
};
const STORAGE_KEY = 'darlugha-level-03-phrases-lesson-01';
const SECTION_KEY = 'darlugha-b1-lesson-1-sections';
const AUDIO_BASE = '/audio/level-03/phrases/lesson-01/';
const phaseSteps: Array<[Phase, string]> = [
  ['discover', 'اكتشف · Discover'], ['understand', 'افهم · Understand'], ['compare', 'قارن · Compare'],
  ['practice', 'تدرّب · Practice'], ['use', 'استعمل · Use'], ['results', 'اختبر نفسك · Self-check'],
];
const stageLabels: Record<string, string> = {
  classification: 'التصنيف · Classification', contextMeaning: 'المعنى من السياق · Meaning from context',
  appropriateExpression: 'العبارة المناسبة · Appropriate expression', completion: 'إكمال الجملة · Completion',
  ordering: 'ترتيب الكلمات · Word order', errorCorrection: 'اكتشاف الخطأ · Error detection', listening: 'الاستماع · Listening',
};
const highlightTerms = [
  'اِرْتَكَبَ', 'خَطَأً', 'وَتَمَادَى', 'إِلَى أَنْ', 'كَثِيرًا مَا', 'مَا لَمْ',
  'وَبِالأَخَصِّ', 'لَا سَبِيلَ إِلَى', 'طَالَمَا أَنَّ', 'وَمِنْ ثَمَّ', 'مِمَّا',
];

function resolveAudio(path: string) {
  return `${AUDIO_BASE}${path.replace(/^audio\//, '')}`;
}

function normalizeArabic(value: string) {
  return value.normalize('NFKD')
    .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g, '')
    .replace(/[ـ…\.،,!?؟\s]/g, '')
    .replace(/[إأآٱ]/g, 'ا');
}

function HighlightedContext({ text }: { text: string }) {
  const pattern = new RegExp(`(${highlightTerms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  return <>{text.split(pattern).map((part, index) => highlightTerms.includes(part)
    ? <mark key={`${part}-${index}`}>{part}</mark>
    : part)}</>;
}

export default function LevelThreePhrases() {
  const content = level03Lesson01Phrases;
  const practiceData = level03Lesson01PhrasePractice;
  const categories = content.categories;
  const phrases = content.phrases;
  const questions = practiceData.questions;
  const audioFiles = useMemo(() => new Set(audioManifest.items.map((item) => item.file)), []);
  const [loaded, setLoaded] = useState(false);
  const [phase, setPhase] = useState<Phase>('discover');
  const [groupIndex, setGroupIndex] = useState(0);
  const [openedIds, setOpenedIds] = useState<string[]>([]);
  const [englishIds, setEnglishIds] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<Record<string, PhraseStatus>>({});
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [wrongPhraseIds, setWrongPhraseIds] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [selectedTokenIndexes, setSelectedTokenIndexes] = useState<number[]>([]);
  const [answered, setAnswered] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [writingDraft, setWritingDraft] = useState('');
  const [speakingNotes, setSpeakingNotes] = useState('');
  const [speakingPhraseIds, setSpeakingPhraseIds] = useState<string[]>([]);
  const [guidedFeedback, setGuidedFeedback] = useState<Record<string, string>>({});
  const [playingId, setPlayingId] = useState('');
  const [loadingId, setLoadingId] = useState('');
  const [audioError, setAudioError] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (saved.phase) setPhase(saved.phase);
        if (Number.isInteger(saved.groupIndex)) setGroupIndex(saved.groupIndex);
        if (Array.isArray(saved.openedIds)) setOpenedIds(saved.openedIds);
        if (saved.statuses) setStatuses(saved.statuses);
        if (Number.isInteger(saved.practiceIndex)) setPracticeIndex(saved.practiceIndex);
        if (saved.results) setResults(saved.results);
        if (Array.isArray(saved.wrongPhraseIds)) setWrongPhraseIds(saved.wrongPhraseIds);
        if (typeof saved.lastScore === 'number') setLastScore(saved.lastScore);
        if (typeof saved.bestScore === 'number') setBestScore(saved.bestScore);
        if (typeof saved.writingDraft === 'string') setWritingDraft(saved.writingDraft);
        if (typeof saved.speakingNotes === 'string') setSpeakingNotes(saved.speakingNotes);
        if (Array.isArray(saved.speakingPhraseIds)) setSpeakingPhraseIds(saved.speakingPhraseIds);
      } catch { /* start with clean progress */ }
      setLoaded(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      phase, groupIndex, openedIds, statuses, practiceIndex, results, wrongPhraseIds,
      lastScore, bestScore, writingDraft, speakingNotes, speakingPhraseIds,
    }));
  }, [loaded, phase, groupIndex, openedIds, statuses, practiceIndex, results, wrongPhraseIds, lastScore, bestScore, writingDraft, speakingNotes, speakingPhraseIds]);

  useEffect(() => () => audioRef.current?.pause(), []);

  function playAudio(path: string, id: string, label: string) {
    if (!audioFiles.has(path)) {
      setAudioError(`التسجيل غير موجود · Recording unavailable: ${label}`);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (playingId === id) {
      setPlayingId('');
      setLoadingId('');
      return;
    }
    const audio = new Audio(resolveAudio(path));
    audio.preload = 'none';
    audioRef.current = audio;
    setAudioError('');
    setLoadingId(id);
    audio.onplaying = () => { setLoadingId(''); setPlayingId(id); };
    audio.onwaiting = () => setLoadingId(id);
    audio.onended = () => { setPlayingId(''); setLoadingId(''); };
    audio.onerror = () => { setPlayingId(''); setLoadingId(''); setAudioError(`تعذّر التشغيل · Playback failed: ${label}`); };
    audio.play().catch(() => { setPlayingId(''); setLoadingId(''); setAudioError(`تعذّر التشغيل · Playback failed: ${label}`); });
  }

  function resetAnswerState() {
    setSelectedOption(null);
    setSelectedTokenIndexes([]);
    setAnswered(false);
  }

  function updatePhraseStatus(phrase: PhraseItem, status: PhraseStatus) {
    const reviewId = `b1-l1-phrase-${phrase.id}`;
    if (status === 'review') upsertReviewItem({ id: reviewId, level: 'B1', lesson: 1, section: 'phrases', arabic: phrase.phraseAr, english: phrase.meaningEn, example: phrase.examples?.[0]?.ar, audioUrl: resolveAudio(phrase.phraseAudio) });
    else removeReviewItem(reviewId);
    setStatuses((current) => ({ ...current, [phrase.id]: status }));
  }

  function recordResult(correct: boolean) {
    const question = questions[practiceIndex];
    setResults((current) => ({ ...current, [question.id]: correct }));
    if (!correct) {
      setWrongPhraseIds((current) => Array.from(new Set([...current, ...question.phraseIds])));
      setStatuses((current) => {
        const next = { ...current };
        question.phraseIds.forEach((id: string) => {
          next[id] = 'review';
          const phrase = phrases.find((entry) => entry.id === id);
          if (phrase) upsertReviewItem({ id: `b1-l1-phrase-${id}`, level: 'B1', lesson: 1, section: 'phrases', arabic: phrase.phraseAr, english: phrase.meaningEn, example: phrase.examples?.[0]?.ar, audioUrl: resolveAudio(phrase.phraseAudio) });
        });
        return next;
      });
    }
    setAnswered(true);
  }

  function answerChoice(index: number) {
    if (answered) return;
    setSelectedOption(index);
    recordResult(index === questions[practiceIndex].answer);
  }

  function submitReorder() {
    if (answered) return;
    const question = questions[practiceIndex];
    if (question.type !== 'reorder') return;
    const selected = selectedTokenIndexes.map((index) => question.tokens[index]);
    recordResult(JSON.stringify(selected) === JSON.stringify(question.answer));
  }

  function finishPractice() {
    const score = Object.values(results).filter(Boolean).length;
    setLastScore(score);
    setBestScore((best) => Math.max(best, score));
    if (score >= content.lesson.masteryScore) {
      let sections = Array(7).fill(false);
      try {
        const parsed = JSON.parse(localStorage.getItem(SECTION_KEY) || '[]');
        if (Array.isArray(parsed)) sections = sections.map((_, index) => Boolean(parsed[index]));
      } catch { /* preserve safe defaults */ }
      sections[6] = true;
      localStorage.setItem(SECTION_KEY, JSON.stringify(sections));
      markSectionComplete('B1', 1, 'phrases');
    }
    setPhase('use');
  }

  function nextQuestion() {
    if (!answered) return;
    if (practiceIndex === questions.length - 1) {
      finishPractice();
      return;
    }
    setPracticeIndex((index) => index + 1);
    resetAnswerState();
  }

  function beginPractice() {
    setPracticeIndex(0);
    setResults({});
    setWrongPhraseIds([]);
    resetAnswerState();
    setPhase('practice');
  }

  function openPhrase(id: string) {
    const phrase = phrases.find((entry) => entry.id === id);
    const categoryIndex = categories.findIndex((entry) => entry.id === phrase?.category);
    if (categoryIndex >= 0) setGroupIndex(categoryIndex);
    setOpenedIds((current) => Array.from(new Set([...current, id])));
    setPhase('understand');
  }

  function evaluateWriting() {
    const normalized = normalizeArabic(writingDraft);
    const required = ['p07', 'p06', 'p10'];
    const missing = required.filter((id) => {
      const phrase = phrases.find((entry) => entry.id === id)?.phraseAr || '';
      const core = normalizeArabic(phrase).replace(/ان$/, '');
      return !normalized.includes(core);
    });
    setGuidedFeedback((current) => ({ ...current, gp01: missing.length === 0
      ? 'أحسنت! استعملت العبارات المطلوبة. راجع الآن ملاءمة كل عبارة للسياق. · Well done! You used the required phrases. Now review whether each one fits its context.'
      : `حاول مرة أخرى · Try again. ما زالت تحتاج إلى · You still need: ${missing.map((id) => phrases.find((entry) => entry.id === id)?.phraseAr).join('، ')}` }));
  }

  function evaluateSpeaking() {
    setGuidedFeedback((current) => ({ ...current, gp02: speakingPhraseIds.length >= 2
      ? 'أحسنت! اخترت عبارتين على الأقل. تحدّث الآن مدة دقيقة واستعملهما في سياق مناسب. · Well done! You selected at least two phrases. Speak for one minute and use them appropriately.'
      : 'اختر عبارتين على الأقل من القائمة، ثم حاول المهمة مرة أخرى. · Select at least two phrases, then try the task again.' }));
  }

  const currentCategory = categories[groupIndex];
  const currentPhrases = phrases.filter((phrase) => phrase.category === currentCategory.id);
  const currentQuestion = questions[practiceIndex];
  const currentQuestionAudio = currentQuestion && 'audio' in currentQuestion ? currentQuestion.audio : '';
  const currentQuestionTranscript = currentQuestion && 'transcriptAr' in currentQuestion ? currentQuestion.transcriptAr : '';
  const currentCorrect = currentQuestion ? results[currentQuestion.id] : false;
  const selectedTokens = currentQuestion?.type === 'reorder'
    ? selectedTokenIndexes.map((index) => currentQuestion.tokens[index]) : [];
  const wrongStages = Array.from(new Set(questions.filter((question) => results[question.id] === false).map((question) => stageLabels[question.stage])));

  return <main className="shell level-three-phrases" dir="rtl">
    <header className="l3p-header">
      <div>
        <Link className="back-link" href="/levels/B1">← المستوى المتقدم · Advanced</Link>
        <div className="eyebrow">الدرس الأول · Lesson 1 · العبارات والتراكيب · Phrases and structures</div>
        <h1>{content.lesson.titleAr}</h1>
        <p dir="ltr">{content.lesson.titleEn} · {content.lesson.estimatedMinutes} minutes</p>
      </div>
      <div className="l3p-summary"><strong>{phase === 'practice' ? `${practiceIndex + 1}/20` : `${openedIds.length}/10`}</strong><span>{phase === 'practice' ? 'سؤال · Question' : 'عبارات مفتوحة · Phrases opened'}</span></div>
    </header>

    <nav className="l3p-steps" aria-label="مراحل قسم العبارات · Phrase lesson stages">
      {phaseSteps.map(([key, label], index) => <span className={phase === key ? 'active' : ''} key={key}><b>{index + 1}</b>{label}</span>)}
    </nav>

    {phase === 'discover' && <section className="l3p-panel discover-panel">
      <Image src="/images/level-03/vocabulary/lesson-01-prediction.webp" alt="اجتماع مدني مغربي لمراجعة قرار محلي · A Moroccan civic meeting reviewing a local decision" width={1600} height={900} sizes="(max-width: 900px) 100vw, 900px" />
      <div className="eyebrow">اكتشف · Discover</div>
      <h2>{content.openingContext.titleAr}</h2>
      <button className="l3p-audio main-audio" type="button" aria-label="استمع إلى النص الافتتاحي · Listen to the opening text" onClick={() => playAudio(content.openingContext.audio, 'opening', 'النص الافتتاحي · Opening text')}>
        {loadingId === 'opening' ? 'جارٍ التحميل… · Loading…' : playingId === 'opening' ? '⏸ إيقاف النص · Stop' : '🔊 استمع إلى النص · Listen'}
      </button>
      <p className="opening-context"><HighlightedContext text={content.openingContext.textAr} /></p>
      <div className="prediction-grid">{content.openingContext.predictionPrompts.map((prompt, index) => <details key={index}><summary>{prompt.ar}</summary><p dir="ltr">{prompt.enHint}</p><small>سؤال توقع غير مُقيّم · Ungraded prediction question</small></details>)}</div>
      <div className="l3p-actions"><button className="button" type="button" onClick={() => setPhase('understand')}>افهم العبارات · Understand the phrases ←</button></div>
    </section>}

    {phase === 'understand' && <section className="l3p-panel">
      <div className="eyebrow">افهم · Understand</div><h2>خمس مجموعات وظيفية · Five functional groups</h2>
      <div className="phrase-group-tabs" role="tablist" aria-label="مجموعات العبارات · Phrase groups">{categories.map((category, index) => <button type="button" role="tab" aria-selected={groupIndex === index} className={`${category.color} ${groupIndex === index ? 'active' : ''}`} key={category.id} onClick={() => setGroupIndex(index)}><span>{index + 1}</span><strong>{category.labelAr}</strong><small dir="ltr">{category.labelEn}</small></button>)}</div>
      <div className="phrase-card-pair">{currentPhrases.map((phrase) => <PhraseCard key={phrase.id} phrase={phrase} category={currentCategory} opened={openedIds.includes(phrase.id)} english={englishIds.includes(phrase.id)} status={statuses[phrase.id] || 'new'} playingId={playingId} loadingId={loadingId} onOpen={() => setOpenedIds((current) => Array.from(new Set([...current, phrase.id])))} onEnglish={() => setEnglishIds((current) => current.includes(phrase.id) ? current.filter((id) => id !== phrase.id) : [...current, phrase.id])} onStatus={(status: PhraseStatus) => updatePhraseStatus(phrase, status)} onPlay={playAudio} />)}</div>
      <div className="l3p-actions"><button className="review-button" type="button" disabled={groupIndex === 0} onClick={() => setGroupIndex((index) => index - 1)}>المجموعة السابقة · Previous group</button>{groupIndex < categories.length - 1 ? <button className="button" type="button" onClick={() => setGroupIndex((index) => index + 1)}>المجموعة التالية · Next group ←</button> : <button className="button" type="button" onClick={() => setPhase('compare')}>قارن بين العبارات · Compare phrases ←</button>}</div>
    </section>}

    {phase === 'compare' && <section className="l3p-panel"><div className="eyebrow">قارن · Compare</div><h2>فروق دقيقة في المعنى والبنية · Fine differences in meaning and structure</h2><div className="comparison-grid"><ComparisonPanel title="بِالأَخَصِّ ↔ بِالذَّاتِ" first={phrases.find((item) => item.id === 'p03')!} second={phrases.find((item) => item.id === 'p04')!} /><ComparisonPanel title="طَالَمَا أَنَّ ↔ مَا لَمْ" first={phrases.find((item) => item.id === 'p05')!} second={phrases.find((item) => item.id === 'p07')!} /><ComparisonPanel title="وَمِنْ ثَمَّ ↔ مِمَّا" first={phrases.find((item) => item.id === 'p06')!} second={phrases.find((item) => item.id === 'p10')!} /></div><div className="l3p-actions"><button className="review-button" type="button" onClick={() => setPhase('understand')}>السابق · Previous</button><button className="button" type="button" onClick={beginPractice}>ابدأ التدريب · Start practice ←</button></div></section>}

    {phase === 'practice' && currentQuestion && <section className="l3p-panel practice-panel">
      <div className="practice-heading"><div><div className="eyebrow">تدرّب · Practice · {stageLabels[currentQuestion.stage]}</div><p>سؤال واحد في كل شاشة · One question per screen</p></div><strong>{practiceIndex + 1} / 20</strong></div>
      <div className="l3p-progress"><span style={{ width: `${((practiceIndex + 1) / 20) * 100}%` }} /></div>
      <h2>{currentQuestion.promptAr}</h2>
      {currentQuestionAudio && <button className="l3p-audio" type="button" aria-label={`استمع إلى السؤال · Listen to question ${practiceIndex + 1}`} onClick={() => playAudio(currentQuestionAudio, currentQuestion.id, `السؤال · Question ${practiceIndex + 1}`)}>{loadingId === currentQuestion.id ? 'جارٍ التحميل… · Loading…' : playingId === currentQuestion.id ? '⏸ إيقاف · Stop' : '🔊 استمع · Listen'}</button>}
      {currentQuestion.type === 'singleChoice' && <div className="phrase-choices">{currentQuestion.options.map((option: string, index: number) => <button type="button" disabled={answered} className={answered ? index === currentQuestion.answer ? 'correct' : selectedOption === index ? 'wrong' : '' : selectedOption === index ? 'selected' : ''} key={`${option}-${index}`} onClick={() => answerChoice(index)}>{option}</button>)}</div>}
      {currentQuestion.type === 'reorder' && <div className="reorder-area"><div className="ordered-sentence" aria-live="polite">{selectedTokens.length ? selectedTokens.join(' ') : 'اضغط على الكلمات بالترتيب الصحيح · Select the words in the correct order'}</div><div className="token-bank">{currentQuestion.tokens.map((token: string, index: number) => <button type="button" key={`${token}-${index}`} disabled={answered || selectedTokenIndexes.includes(index)} onClick={() => setSelectedTokenIndexes((current) => [...current, index])}>{token}</button>)}</div><div className="reorder-controls"><button type="button" disabled={answered || selectedTokenIndexes.length === 0} onClick={() => setSelectedTokenIndexes((current) => current.slice(0, -1))}>↶ إلغاء آخر اختيار · Undo last</button><button type="button" disabled={answered || selectedTokenIndexes.length !== currentQuestion.tokens.length} onClick={submitReorder}>ثبّت الترتيب · Submit order</button></div></div>}
      {answered && <div className={`phrase-feedback ${currentCorrect ? 'correct' : 'wrong'}`} role="status"><strong>{currentCorrect ? '✓ إجابة صحيحة · Correct' : '✕ تحتاج إلى مراجعة · Review needed'}</strong>{currentQuestion.type === 'singleChoice' && <p>الإجابة الصحيحة · Correct answer: {currentQuestion.options[currentQuestion.answer]}</p>}{currentQuestion.type === 'reorder' && <p>الترتيب الصحيح · Correct order: {currentQuestion.answer.join(' ')}</p>}<p dir="ltr">{currentQuestion.feedbackEn}</p>{currentQuestionAudio && <details><summary>إظهار نص الاستماع · Show transcript</summary><p>{currentQuestionTranscript}</p></details>}<div className="phrase-review-links">{currentQuestion.phraseIds.map((id: string) => <button type="button" key={id} onClick={() => openPhrase(id)}>راجع · Review: {phrases.find((phrase) => phrase.id === id)?.phraseAr}</button>)}</div></div>}
      <div className="l3p-actions"><button className="review-button" type="button" disabled={practiceIndex === 0} onClick={() => { setPracticeIndex((index) => index - 1); resetAnswerState(); }}>السابق · Previous</button><button className="button" type="button" disabled={!answered} onClick={nextQuestion}>{practiceIndex === 19 ? 'انتقل إلى الاستعمال · Continue to use ←' : 'السؤال التالي · Next question ←'}</button></div>
    </section>}

    {phase === 'use' && <section className="l3p-panel"><div className="eyebrow">استعمل · Use</div><h2>إنتاج موجّه — لا يدخل في درجة 20 · Guided production — ungraded</h2><div className="guided-grid"><article><span>✍️ كتابة · Writing</span><h3>{practiceData.guidedProduction[0].promptAr}</h3><small dir="ltr">Write three connected sentences using the required phrases.</small><textarea value={writingDraft} onChange={(event) => setWritingDraft(event.target.value)} placeholder="اكتب ثلاث جمل هنا… · Write three sentences here…" rows={7} /><button className="button" type="button" onClick={evaluateWriting}>افحص العبارات · Check phrases</button>{guidedFeedback.gp01 && <p role="status">{guidedFeedback.gp01}</p>}</article><article><span>🎙️ تحدّث · Speaking</span><h3>{practiceData.guidedProduction[1].promptAr}</h3><p>اختر العبارات التي ستستعملها، ثم دوّن كلمات مساعدة إن رغبت. · Select the phrases you will use, then add optional speaking notes.</p><div className="speaking-checklist">{phrases.map((phrase) => <label key={phrase.id}><input type="checkbox" checked={speakingPhraseIds.includes(phrase.id)} onChange={() => setSpeakingPhraseIds((current) => current.includes(phrase.id) ? current.filter((id) => id !== phrase.id) : [...current, phrase.id])} />{phrase.phraseAr}</label>)}</div><textarea value={speakingNotes} onChange={(event) => setSpeakingNotes(event.target.value)} placeholder="ملاحظات تساعدك أثناء التحدث… · Speaking notes…" rows={4} /><button className="button" type="button" onClick={evaluateSpeaking}>تحقق من الاستعداد · Check readiness</button>{guidedFeedback.gp02 && <p role="status">{guidedFeedback.gp02}</p>}</article></div><div className="l3p-actions"><button className="review-button" type="button" onClick={() => setPhase('practice')}>العودة إلى التدريب · Back to practice</button><button className="button" type="button" onClick={() => setPhase('results')}>اختبر نفسك · Self-check result ←</button></div></section>}

    {phase === 'results' && <section className="l3p-panel results-panel"><div className="result-medal">{lastScore >= 16 ? '🎉' : '🌱'}</div><div className="eyebrow">اختبر نفسك · Self-check</div><h2>{lastScore >= 16 ? 'أحسنت! أتقنت العبارات والتراكيب. · You mastered the phrases and structures.' : 'راجع العبارات ثم حاول مجددًا. · Review the phrases and try again.'}</h2><div className="result-score"><strong>{lastScore}/20</strong><span>{lastScore * 5}% · الإتقان · Mastery: 16/20</span></div><p>أفضل نتيجة · Best score: {bestScore}/20</p>{wrongStages.length > 0 && <div className="needs-review"><h3>مهارات تحتاج إلى مراجعة · Skills to review</h3><p>{wrongStages.join('، ')}</p></div>}{wrongPhraseIds.length > 0 && <div className="needs-review"><h3>عبارات مرتبطة بالأخطاء · Phrases linked to mistakes</h3><div className="phrase-review-links">{wrongPhraseIds.map((id) => <button type="button" key={id} onClick={() => openPhrase(id)}>{phrases.find((phrase) => phrase.id === id)?.phraseAr}</button>)}</div></div>}<LessonCompletion level="B1" lesson={1} section="phrases" passed={lastScore >= 16} score={`${lastScore}/20`} onRetry={beginPractice} /></section>}

    {audioError && <p className="phrase-audio-error" role="alert">{audioError}</p>}
  </main>;
}

function PhraseCard({ phrase, category, opened, english, status, playingId, loadingId, onOpen, onEnglish, onStatus, onPlay }: PhraseCardProps) {
  return <article className={`phrase-card ${category.color}`}><div className="phrase-card-meta"><span>{category.labelAr} · {category.labelEn}</span></div><div className="phrase-title"><h3>{phrase.phraseAr}</h3><button type="button" aria-label={`استمع إلى العبارة · Listen to the phrase: ${phrase.phraseAr}`} onClick={() => onPlay(phrase.phraseAudio, `phrase-${phrase.id}`, `العبارة · Phrase: ${phrase.phraseAr}`)}>{loadingId === `phrase-${phrase.id}` ? '…' : playingId === `phrase-${phrase.id}` ? '⏸' : '🔊'}</button></div><p>{phrase.functionAr}</p>{!opened ? <button className="open-phrase" type="button" onClick={onOpen}>افتح البطاقة واكتشف التفاصيل · Open card and view details</button> : <><p className="meaning-ar">{phrase.meaningAr}</p><button className="show-english" type="button" onClick={onEnglish}>{english ? 'إخفاء الإنجليزية · Hide English' : 'المعنى بالإنجليزية · English meaning'}</button>{english && <p className="english-text" dir="ltr">{phrase.meaningEn}</p>}<dl><div><dt>النمط التركيبي · Pattern</dt><dd>{phrase.pattern}</dd></div><div><dt>مستوى الاستعمال · Register</dt><dd>{phrase.register}</dd></div><div><dt>الفرق الدلالي · Contrast</dt><dd>{phrase.contrast}</dd></div></dl><div className="phrase-examples">{phrase.examples.map((example) => <article key={example.id}><div><p>{example.ar}</p><button type="button" aria-label={`استمع إلى مثال العبارة · Listen to the example: ${phrase.phraseAr}`} onClick={() => onPlay(example.audio, example.id, `مثال · Example ${phrase.phraseAr}`)}>{loadingId === example.id ? '…' : playingId === example.id ? '⏸' : '🔊'}</button></div>{english && <span dir="ltr">{example.en}</span>}</article>)}</div><div className="common-error"><strong>خطأ شائع · Common error</strong><del>{phrase.commonError.wrong}</del><ins>{phrase.commonError.correct}</ins>{english && <p dir="ltr">{phrase.commonError.explanationEn}</p>}</div><label className="phrase-status">حالة العبارة · Phrase status<select value={status} onChange={(event) => onStatus(event.target.value as PhraseStatus)}><option value="new">جديدة · New</option><option value="learning">قيد التعلّم · Learning</option><option value="mastered">متقنة · Mastered</option><option value="review">للمراجعة · Review</option></select></label></>}</article>;
}

function ComparisonPanel({ title, first, second }: ComparisonPanelProps) {
  const [selected, setSelected] = useState(first.id);
  const current = selected === first.id ? first : second;
  return <article className="comparison-panel"><h3>{title}</h3><div role="tablist"><button type="button" role="tab" aria-selected={selected === first.id} onClick={() => setSelected(first.id)}>{first.phraseAr}</button><button type="button" role="tab" aria-selected={selected === second.id} onClick={() => setSelected(second.id)}>{second.phraseAr}</button></div><h4>{current.functionAr}</h4><p>{current.meaningAr}</p><dl><dt>البنية · Pattern</dt><dd>{current.pattern}</dd><dt>الفرق · Contrast</dt><dd>{current.contrast}</dd></dl><details dir="ltr"><summary>إظهار المعنى الإنجليزي · Show English meaning</summary><p>{current.meaningEn}</p></details></article>;
}
