'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { listeningLesson } from '../../data/level3/listening';
import audioManifest from '../../data/level3/listening-audio-manifest.json';
import { markSectionComplete } from '../../lib/learning-progress';
import { userStorage as localStorage } from '../../lib/user-scoped-storage.mjs';
import LessonCompletion from '../learning/LessonCompletion';

type Phase = 'prepare' | 'gist' | 'detail' | 'phrases' | 'inference' | 'review';
type ListeningQuestion = (typeof listeningLesson.questions)[number];
type ListeningChoice = number | boolean | readonly number[];
type StoredAnswer = { choice: ListeningChoice; correct: boolean };

const STORAGE_KEY = 'darlugha-level-03-listening-lesson-01';
const LEVEL_PROGRESS_KEY = 'darlugha-b1-lesson-1-sections';
const AUDIO_ROOT = '/audio/level-03/listening/lesson-01/';
const phaseOrder: Phase[] = ['prepare', 'gist', 'detail', 'phrases', 'inference', 'review'];
const phaseLabels: Record<Phase, string> = {
  prepare: 'تهيّأ · Prepare', gist: 'الفكرة العامة · Gist', detail: 'التفاصيل · Details', phrases: 'لاحظ العبارات · Notice phrases', inference: 'استنتج · Infer', review: 'راجع · Review',
};

const lesson = listeningLesson;
const gradedQuestions = lesson.questions;
const phraseItems = lesson.phraseNoticing;

function manifestPath(id: string) {
  const item = audioManifest.items.find((entry) => entry.id === id);
  if (!item) return '';
  return `${AUDIO_ROOT}${String(item.path).split('/').pop()}`;
}

function audioIdFromDataPath(path: string) {
  return audioManifest.items.find((entry) => entry.path === path)?.id || '';
}

function sameAnswer(choice: ListeningChoice, answer: ListeningChoice) {
  return Array.isArray(choice) && Array.isArray(answer)
    ? choice.length === answer.length && choice.every((value, index) => value === answer[index])
    : choice === answer;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const displayPhrases = ['ارتكب خطأً', 'ذهب إلى حد أن', 'بالأخص', 'على الأخص', 'بالذات', 'طالما أن', 'ومن ثم', 'ما لم', 'كثيرًا ما', 'لا سبيل إلى', 'مما'];
const phrasePattern = new RegExp(`(${displayPhrases.sort((a, b) => b.length - a.length).map(escapeRegExp).join('|')})`, 'g');

function HighlightedTranscript({ text }: { text: string }) {
  return <>{text.split(phrasePattern).map((part, index) => displayPhrases.includes(part)
    ? <mark key={`${part}-${index}`}>{part}</mark>
    : <span key={`${part}-${index}`}>{part}</span>)}</>;
}

export default function LevelThreeListening() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [phase, setPhase] = useState<Phase>('prepare');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, StoredAnswer>>({});
  const [phraseAnswers, setPhraseAnswers] = useState<Record<string, number>>({});
  const [ordering, setOrdering] = useState<number[]>([]);
  const [preChoice, setPreChoice] = useState<number | null>(null);
  const [preNotes, setPreNotes] = useState<Record<string, string>>({});
  const [playingId, setPlayingId] = useState('');
  const [loadingId, setLoadingId] = useState('');
  const [errorId, setErrorId] = useState('');
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playCounts, setPlayCounts] = useState<Record<string, number>>({});
  const [speed, setSpeed] = useState(1);
  const [lastScore, setLastScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [postDrafts, setPostDrafts] = useState<Record<string, string>>({});
  const [selectedTransferPhrases, setSelectedTransferPhrases] = useState<string[]>([]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (phaseOrder.includes(saved.phase)) setPhase(saved.phase);
        if (Number.isInteger(saved.questionIndex)) setQuestionIndex(saved.questionIndex);
        if (Number.isInteger(saved.phraseIndex)) setPhraseIndex(saved.phraseIndex);
        if (saved.answers) setAnswers(saved.answers);
        if (saved.phraseAnswers) setPhraseAnswers(saved.phraseAnswers);
        if (saved.preNotes) setPreNotes(saved.preNotes);
        if (saved.playCounts) setPlayCounts(saved.playCounts);
        if (saved.postDrafts) setPostDrafts(saved.postDrafts);
        if (saved.selectedTransferPhrases) setSelectedTransferPhrases(saved.selectedTransferPhrases);
        if (typeof saved.lastScore === 'number') setLastScore(saved.lastScore);
        if (typeof saved.bestScore === 'number') setBestScore(saved.bestScore);
      } catch { /* Ignore invalid local data. */ }
      setHydrated(true);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      phase, questionIndex, phraseIndex, answers, phraseAnswers, preNotes, playCounts,
      lastScore, bestScore, postDrafts, selectedTransferPhrases,
    }));
  }, [hydrated, phase, questionIndex, phraseIndex, answers, phraseAnswers, preNotes, playCounts, lastScore, bestScore, postDrafts, selectedTransferPhrases]);

  const phaseQuestionIndexes = useMemo(() => ({
    gist: gradedQuestions.map((question, index) => question.phase === 'gist' ? index : -1).filter((index) => index >= 0),
    detail: gradedQuestions.map((question, index) => question.phase === 'detail' ? index : -1).filter((index) => index >= 0),
    language: gradedQuestions.map((question, index) => question.phase === 'language' ? index : -1).filter((index) => index >= 0),
    inference: gradedQuestions.map((question, index) => question.phase === 'inference' ? index : -1).filter((index) => index >= 0),
  }), []);

  function stopAudio() {
    audioRef.current?.pause();
    setPlayingId('');
    setLoadingId('');
  }

  function playAudio(id: string) {
    const path = manifestPath(id);
    if (!path) { setErrorId(id); return; }
    if (playingId === id && audioRef.current && !audioRef.current.paused) { stopAudio(); return; }
    audioRef.current?.pause();
    setErrorId('');
    setLoadingId(id);
    setProgress(0);
    setDuration(0);
    const audio = new Audio(path);
    audio.preload = 'none';
    audio.playbackRate = speed;
    audioRef.current = audio;
    audio.onloadedmetadata = () => { setDuration(audio.duration); setLoadingId(''); };
    audio.ontimeupdate = () => { setProgress(audio.currentTime); setDuration(audio.duration || 0); };
    audio.onplaying = () => { setLoadingId(''); setPlayingId(id); };
    audio.onended = () => { setPlayingId(''); setProgress(0); };
    audio.onerror = () => { setLoadingId(''); setPlayingId(''); setErrorId(id); };
    audio.play().then(() => setPlayCounts((current) => ({ ...current, [id]: (current[id] || 0) + 1 }))).catch(() => {
      setLoadingId(''); setPlayingId(''); setErrorId(id);
    });
  }

  function resetAudio(id: string) {
    if (playingId === id && audioRef.current) {
      audioRef.current.currentTime = 0;
      setProgress(0);
      return;
    }
    playAudio(id);
  }

  function renderAudioControl(id: string, label: string) {
    const active = playingId === id;
    const loading = loadingId === id;
    const hasError = errorId === id;
    return <div className="l3l-audio" data-audio-id={id}>
      <div className="l3l-audio-actions">
        <button type="button" onClick={() => playAudio(id)} aria-label={`${active ? 'إيقاف · Stop' : 'استمع إلى · Listen to'} ${label}`} disabled={loading}>
          <span aria-hidden="true">{loading ? '◌' : active ? '⏸' : '▶'}</span>
          {loading ? 'جارٍ التحميل… · Loading…' : active ? 'إيقاف · Stop' : `استمع · Listen: ${label}`}
        </button>
        <button className="audio-reset" type="button" onClick={() => resetAudio(id)} aria-label={`إعادة ${label} من البداية · Restart from the beginning`}>↺</button>
      </div>
      <div className="audio-progress" aria-label={`تقدم ${label} · Audio progress`}>
        <span style={{ width: `${active && duration ? Math.min(100, (progress / duration) * 100) : 0}%` }} />
      </div>
      <small>{active ? `${formatTime(progress)} / ${formatTime(duration)}` : 'لا يبدأ الصوت تلقائيًا · Audio never starts automatically'}</small>
      {hasError && <p className="audio-error" role="alert">تعذّر تحميل هذا المقطع. حاول مرة أخرى. · This clip could not be loaded. Please try again.</p>}
    </div>;
  }

  function beginGist() {
    stopAudio();
    setQuestionIndex(phaseQuestionIndexes.gist[0]);
    setPhase('gist');
  }

  function chooseAnswer(choice: ListeningChoice) {
    const question = gradedQuestions[questionIndex];
    if (answers[question.id]) return;
    const correct = sameAnswer(choice, question.answer);
    setAnswers((current) => ({ ...current, [question.id]: { choice, correct } }));
  }

  function nextQuestion() {
    stopAudio();
    const question = gradedQuestions[questionIndex];
    const currentPhaseIndexes = question.phase === 'gist' ? phaseQuestionIndexes.gist
      : question.phase === 'detail' ? phaseQuestionIndexes.detail
        : question.phase === 'language' ? phaseQuestionIndexes.language
          : phaseQuestionIndexes.inference;
    const position = currentPhaseIndexes.indexOf(questionIndex);
    if (position < currentPhaseIndexes.length - 1) {
      setQuestionIndex(currentPhaseIndexes[position + 1]);
      setOrdering([]);
      return;
    }
    if (question.phase === 'gist') { setQuestionIndex(phaseQuestionIndexes.detail[0]); setPhase('detail'); }
    else if (question.phase === 'detail') { setPhraseIndex(0); setPhase('phrases'); }
    else if (question.phase === 'language') { setQuestionIndex(phaseQuestionIndexes.inference[0]); setPhase('inference'); }
    else finishAssessment();
  }

  function finishAssessment() {
    const finalScore = gradedQuestions.reduce((sum, question) => sum + (answers[question.id]?.correct ? question.points : 0), 0);
    setLastScore(finalScore);
    setBestScore((current) => Math.max(current, finalScore));
    if (finalScore >= lesson.lesson.masteryScore) {
      try {
        const current = JSON.parse(localStorage.getItem(LEVEL_PROGRESS_KEY) || '[]');
        const progressState = Array.from({ length: 7 }, (_, index) => Boolean(current[index]));
        progressState[2] = true;
        localStorage.setItem(LEVEL_PROGRESS_KEY, JSON.stringify(progressState));
        markSectionComplete('B1', 1, 'listening');
      } catch { /* Progress can be retried on the next attempt. */ }
    }
    setPhase('review');
  }

  function choosePhraseAnswer(choice: number) {
    const item = phraseItems[phraseIndex];
    if (phraseAnswers[item.id] !== undefined) return;
    setPhraseAnswers((current) => ({ ...current, [item.id]: choice }));
  }

  function nextPhrase() {
    stopAudio();
    if (phraseIndex < phraseItems.length - 1) { setPhraseIndex((index) => index + 1); return; }
    setQuestionIndex(phaseQuestionIndexes.language[0]);
  }

  function answerOptions(question: ListeningQuestion) {
    if (question.type === 'ordering') return <div className="ordering-question">
      <div className="ordering-selected" aria-live="polite">
        {ordering.length ? ordering.map((optionIndex, index) => <span key={`${optionIndex}-${index}`}>{index + 1}. {question.options[optionIndex]}</span>) : <p>اختر الجمل بالترتيب الصحيح.</p>}
      </div>
      <div className="l3l-choices">
        {question.options.map((option: string, index: number) => <button key={option} type="button" disabled={ordering.includes(index) || Boolean(answers[question.id])} onClick={() => setOrdering((current) => [...current, index])}>{option}</button>)}
      </div>
      {!answers[question.id] && <div className="ordering-actions"><button type="button" onClick={() => setOrdering((current) => current.slice(0, -1))} disabled={!ordering.length}>تراجع عن آخر اختيار</button><button type="button" onClick={() => chooseAnswer(ordering)} disabled={ordering.length !== question.options.length}>ثبّت الترتيب</button></div>}
    </div>;
    const options = question.type === 'trueFalse' ? ['صحيح', 'خطأ'] : question.options;
    return <div className="l3l-choices">{options.map((option: string, index: number) => {
      const value = question.type === 'trueFalse' ? index === 0 : index;
      return <button type="button" key={`${option}-${index}`} disabled={Boolean(answers[question.id])} onClick={() => chooseAnswer(value)}>{option}</button>;
    })}</div>;
  }

  function renderQuestion(question: ListeningQuestion, position: number, total: number) {
    const answer = answers[question.id];
    const sectionId = 'sectionIds' in question ? question.sectionIds[0] : undefined;
    const section = lesson.sections.find((item) => item.id === sectionId);
    const sectionAudioId = section ? audioIdFromDataPath(section.audio) : '';
    return <section className="l3l-panel question-panel">
      <div className="question-topline"><span>السؤال · Question {position}/{total}</span><span>{question.points} نقطة · point</span></div>
      {phase === 'detail' && section && <div className="section-listen-card"><div><small>استمع إلى المقطع المرتبط</small><strong>{section.titleAr}</strong></div>{renderAudioControl(sectionAudioId, section.titleAr)}</div>}
      <h2>{question.promptAr}</h2>
      {answerOptions(question)}
      {answer && <div className={`l3l-feedback ${answer.correct ? 'correct' : 'wrong'}`} role="status">
        <strong>{answer.correct ? '✓ إجابة صحيحة · Correct' : '✕ تحتاج إلى مراجعة · Review needed'}</strong>
        <p dir="ltr">{question.feedbackEn}</p>
        <button className="button" type="button" onClick={nextQuestion}>{question.id === 'q20' ? 'اعرض النتيجة والنص · Show result and transcript ←' : 'السؤال التالي · Next question ←'}</button>
      </div>}
    </section>;
  }

  const currentQuestion = gradedQuestions[questionIndex];
  const currentPhrase = phraseItems[phraseIndex];
  const currentPhraseAnswer = currentPhrase ? phraseAnswers[currentPhrase.id] : undefined;
  const score = gradedQuestions.reduce((sum, question) => sum + (answers[question.id]?.correct ? question.points : 0), 0);
  const wrongSectionIds = Array.from(new Set(gradedQuestions
    .filter((question) => answers[question.id] && !answers[question.id].correct)
    .flatMap((question) => 'sectionIds' in question ? [...question.sectionIds] : [])));

  return <main className="level3-listening-page" dir="rtl">
    <header className="l3l-hero">
      <div>
      <Link href="/levels/B1">← المستوى المتقدم · Advanced</Link>
        <div className="eyebrow">المستوى المتقدم · Advanced · الدرس الأول · Lesson 1 · Listening</div>
        <h1>{lesson.lesson.titleAr}</h1>
        <p dir="ltr">{lesson.lesson.titleEn} · {lesson.lesson.estimatedMinutes} minutes</p>
      </div>
      <div className="l3l-hero-meta"><strong>{Object.keys(answers).length}/20</strong><span>سؤالًا مكتملًا · Questions completed</span><label>سرعة الصوت · Audio speed<select value={speed} onChange={(event) => setSpeed(Number(event.target.value))} aria-label="سرعة تشغيل الصوت · Audio playback speed"><option value={0.9}>0.9×</option><option value={1}>1×</option><option value={1.1}>1.1×</option></select></label></div>
    </header>

    <nav className="l3l-phases" aria-label="مراحل درس الاستماع · Listening stages">
      {phaseOrder.map((item, index) => <span key={item} className={`${item === phase ? 'active' : ''} ${phaseOrder.indexOf(phase) > index ? 'done' : ''}`}><b>{index + 1}</b>{phaseLabels[item]}</span>)}
    </nav>

    {phase === 'prepare' && <section className="l3l-panel prepare-panel">
      <div className="prepare-image"><Image src="/images/level-03/listening/lesson-01-decision.png" alt="طالب أجنبي وأستاذته يناقشان خريطة مشروع جامعي عن مدينة تاريخية · A student and professor discuss a university project map" width={1600} height={900} sizes="(max-width: 900px) 100vw, 50vw" /></div>
      <div className="prepare-content"><div className="eyebrow">تهيّأ · Prepare</div><h2>توقّع موضوع الحوار · Predict the dialogue topic</h2><p>{lesson.scenario.settingAr}</p>
        <div className="keyword-row">{lesson.preListening.keywords.map((keyword) => <span key={keyword.ar}><strong>{keyword.ar}</strong><small dir="ltr">{keyword.en}</small></span>)}</div>
        {lesson.preListening.activities.map((activity) => activity.type === 'singleChoice' ? <div className="pre-activity" key={activity.id}><h3>{activity.promptAr}</h3><div className="l3l-choices compact">{activity.options.map((option, index) => <button type="button" className={preChoice === index ? 'selected' : ''} onClick={() => setPreChoice(index)} key={option}>{option}</button>)}</div></div> : <label className="pre-activity" key={activity.id}><strong>{activity.promptAr}</strong><small dir="ltr">{activity.promptEn}</small><textarea rows={3} value={preNotes[activity.id] || ''} onChange={(event) => setPreNotes((current) => ({ ...current, [activity.id]: event.target.value }))} placeholder="دوّن توقعك هنا (لا يدخل في الدرجة)… · Write your ungraded prediction here…" /></label>)}
        <button className="button" type="button" onClick={beginGist}>استمع للفكرة العامة · Listen for the gist ←</button>
      </div>
    </section>}

    {phase === 'gist' && <>
      <section className="l3l-panel first-listen"><div><div className="eyebrow">الاستماع الأول · First listen · بلا نص · No transcript</div><h2>استمع إلى الحوار كاملًا · Listen to the full dialogue</h2><p>ركّز على الموضوع والمتحدثين والمشكلة والنتيجة العامة. · Focus on the topic, speakers, problem, and general outcome.</p><small>عدد مرات الاستماع · Plays: {playCounts['listening-full'] || 0} — الرقم إرشادي ولا يمنع الإعادة. · The count is informative and does not block replay.</small></div>{renderAudioControl('listening-full', 'الحوار كاملًا · Full dialogue')}</section>
      {renderQuestion(currentQuestion, phaseQuestionIndexes.gist.indexOf(questionIndex) + 1, phaseQuestionIndexes.gist.length)}
    </>}

    {phase === 'detail' && renderQuestion(currentQuestion, phaseQuestionIndexes.detail.indexOf(questionIndex) + 1, phaseQuestionIndexes.detail.length)}

    {phase === 'phrases' && <>
      {questionIndex < phaseQuestionIndexes.language[0] ? <section className="l3l-panel phrase-noticing">
        <div className="question-topline"><span>مقطع العبارة · Phrase clip {phraseIndex + 1}/{phraseItems.length}</span><span>نشاط ملاحظة غير مقيم · Ungraded noticing activity</span></div>
        <div className="eyebrow">الاستماع الثالث · Third listen · لاحظ العبارات · Notice phrases</div><h2>{currentPhrase.promptAr}</h2>
        {renderAudioControl(audioIdFromDataPath(currentPhrase.audio), `العبارة · Phrase ${phraseIndex + 1}`)}
        <p className="hidden-transcript-note">لن تظهر العبارة قبل تثبيت إجابتك. · The phrase appears only after you submit your answer.</p>
        <div className="l3l-choices">{currentPhrase.options.map((option: string, index: number) => <button type="button" key={option} disabled={currentPhraseAnswer !== undefined} onClick={() => choosePhraseAnswer(index)}>{option}</button>)}</div>
        {currentPhraseAnswer !== undefined && <div className={`l3l-feedback ${currentPhraseAnswer === currentPhrase.answer ? 'correct' : 'wrong'}`} role="status"><strong>{currentPhraseAnswer === currentPhrase.answer ? '✓ إجابة صحيحة · Correct' : '✕ الإجابة الصحيحة موضحة أدناه · Correct answer shown below'}</strong><p className="revealed-phrase">{currentPhrase.phraseAr}</p><p>{currentPhrase.options[currentPhrase.answer]}</p><button className="button" type="button" onClick={nextPhrase}>{phraseIndex === phraseItems.length - 1 ? 'ابدأ أسئلة وظيفة العبارات · Start phrase-function questions ←' : 'العبارة التالية · Next phrase ←'}</button></div>}
      </section> : renderQuestion(currentQuestion, phaseQuestionIndexes.language.indexOf(questionIndex) + 1, phaseQuestionIndexes.language.length)}
    </>}

    {phase === 'inference' && renderQuestion(currentQuestion, phaseQuestionIndexes.inference.indexOf(questionIndex) + 1, phaseQuestionIndexes.inference.length)}

    {phase === 'review' && <section className="l3l-review">
      <section className="l3l-panel result-panel"><div className="result-medal">{lastScore >= lesson.lesson.masteryScore ? '🎉' : '🌱'}</div><div className="eyebrow">النتيجة · Result</div><h2>{lastScore >= lesson.lesson.masteryScore ? 'أحسنت! أتقنت فهم الحوار. · Well done! You mastered the dialogue.' : 'راجع المقاطع المرتبطة بأخطائك ثم حاول مجددًا. · Review the linked clips and try again.'}</h2><div className="result-score"><strong>{lastScore || score}/20</strong><span>الإتقان · Mastery: {lesson.lesson.masteryScore}/20 · أفضل نتيجة · Best: {bestScore}/20</span></div>{wrongSectionIds.length > 0 && <div className="review-audio-links"><h3>أعد الاستماع إلى المقاطع المرتبطة بالأخطاء · Replay clips linked to mistakes</h3>{wrongSectionIds.map((sectionId) => { const section = lesson.sections.find((item) => item.id === sectionId)!; const id = audioIdFromDataPath(section.audio); return <button type="button" key={sectionId} onClick={() => playAudio(id)}>▶ {section.titleAr}</button>; })}</div>}<LessonCompletion level="B1" lesson={1} section="listening" passed={lastScore >= lesson.lesson.masteryScore} score={`${lastScore || score}/20`} onRetry={() => { setAnswers({}); setPhraseAnswers({}); setQuestionIndex(phaseQuestionIndexes.gist[0]); setPhraseIndex(0); setLastScore(0); setPhase('gist'); }} /></section>

      <section className="l3l-panel transcript-panel"><div className="eyebrow">النص الكامل · Full transcript · فُتح بعد إنهاء الأسئلة · Unlocked after the questions</div><h2>حوار الأستاذة مريم ودانيال · Maryam and Daniel’s dialogue</h2><p>تميَّز أسماء المتحدثين والعبارات المستهدفة بالنص والرموز، لا باللون وحده. · Speaker names and target phrases use text and symbols, not color alone.</p>{lesson.sections.map((section, sectionIndex) => <article key={section.id}><div className="transcript-heading"><h3>{sectionIndex + 1}. {section.titleAr}{'titleEn' in section && section.titleEn ? ` · ${section.titleEn}` : ''}</h3>{renderAudioControl(audioIdFromDataPath(section.audio), section.titleAr)}</div>{section.turns.map((turn) => { const speaker = lesson.scenario.speakers.find((item) => item.id === turn.speakerId)!; return <div className={`transcript-turn ${turn.speakerId}`} key={turn.id}><div className="speaker-badge"><span aria-hidden="true">{turn.speakerId === 'maryam' ? '👩‍🏫' : '🎓'}</span><strong>{speaker.nameAr}</strong><small>{speaker.roleAr} · {speaker.roleEn}</small></div><p><HighlightedTranscript text={turn.displayAr} /></p></div>; })}</article>)}</section>

      <section className="l3l-panel post-listening"><div className="eyebrow">ما بعد الاستماع · Post-listening · لا يدخل في الدرجة · Ungraded</div><h2>وظّف ما فهمته · Apply what you understood</h2><div className="post-grid">
        <label><strong>{lesson.postListening[0].promptAr}</strong><small dir="ltr">Summarize the dialogue in three sentences: the mistake, the reason for review, and the outcome.</small><textarea rows={5} value={postDrafts.post01 || ''} onChange={(event) => setPostDrafts((current) => ({ ...current, post01: event.target.value }))} /><small>{(postDrafts.post01 || '').trim().split(/\s+/).filter(Boolean).length} كلمة · words</small></label>
        <div><strong>{lesson.postListening[1].promptAr}</strong><small dir="ltr">Choose the best phrase for a new situation, then use it in a sentence.</small><div className="phrase-checklist">{lesson.lesson.targetPhrases.map((phrase: string) => <label key={phrase}><input type="checkbox" checked={selectedTransferPhrases.includes(phrase)} onChange={() => setSelectedTransferPhrases((current) => current.includes(phrase) ? current.filter((item) => item !== phrase) : [...current, phrase])} />{phrase}</label>)}</div><textarea rows={4} value={postDrafts.post02 || ''} onChange={(event) => setPostDrafts((current) => ({ ...current, post02: event.target.value }))} /><small>{selectedTransferPhrases.length}/2 عبارات مختارة · phrases selected</small></div>
        <label><strong>{lesson.postListening[2].promptAr}</strong><small dir="ltr">Speak for one minute about a decision you revised after new information appeared, using two lesson phrases.</small><span className="optional-note">نشاط تحدث اختياري — لا تسجيل صوتي ولا تقييم نطق. · Optional speaking — no recording or pronunciation score.</span><textarea rows={4} value={postDrafts.post03 || ''} onChange={(event) => setPostDrafts((current) => ({ ...current, post03: event.target.value }))} placeholder="اكتب كلمات مساعدة قبل أن تتحدث… · Write speaking notes…" /></label>
        <label><strong>{lesson.postListening[3].promptAr}</strong><small dir="ltr">Write 80–100 words explaining how a team corrects an unsuitable decision, using three lesson phrases.</small><textarea rows={7} value={postDrafts.post04 || ''} onChange={(event) => setPostDrafts((current) => ({ ...current, post04: event.target.value }))} /><small>{(postDrafts.post04 || '').trim().split(/\s+/).filter(Boolean).length}/80–100 كلمة · words</small></label>
      </div></section>
    </section>}
  </main>;
}
