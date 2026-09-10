'use client';

/* eslint-disable @next/next/no-img-element -- Preserve the lesson bundle's responsive image sizing. */

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { lessonTwoReading } from '../../data/lesson2/reading';
import { lessonTwoReadingPractice } from '../../data/lesson2/reading-practice';
import { markLesson2SectionStarted } from '../../lib/lesson2-progress';
import { stableShuffle } from '../../lib/stable-shuffle';
import LessonCompletion from '../learning/LessonCompletion';
import { userStorage as localStorage } from '../../lib/user-scoped-storage.mjs';

type Phase = 'prediction' | 'first' | 'second' | 'details' | 'trueFalse' | 'sort' | 'personal' | 'results';
const phases: Phase[] = ['prediction', 'first', 'second', 'details', 'trueFalse', 'sort', 'personal', 'results'];

export default function LessonTwoReading() {
  const player = useRef<HTMLAudioElement | null>(null);
  const [phase, setPhase] = useState<Phase>('prediction');
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [translation, setTranslation] = useState(false);
  const [audioId, setAudioId] = useState('');
  const [audioState, setAudioState] = useState<'idle' | 'loading' | 'playing' | 'paused' | 'error'>('idle');
  const [sortItems, setSortItems] = useState<string[]>([]);
  const [personal, setPersonal] = useState('');

  useEffect(() => {
    markLesson2SectionStarted('reading');
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem('darlugha-lesson-2-reading-progress') || '{}');
        if (saved.phase) setPhase(saved.phase);
        if (typeof saved.score === 'number') setScore(saved.score);
        if (saved.personal) setPersonal(saved.personal);
      } catch { /* progress is optional */ }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  useEffect(() => () => player.current?.pause(), []);

  function playFile(url: string, id: string) {
    if (!player.current) {
      player.current = new Audio();
      player.current.preload = 'none';
      player.current.onended = () => { setAudioState('idle'); setAudioId(''); };
      player.current.onerror = () => setAudioState('error');
    }
    const audio = player.current;
    if (audioId === id) {
      if (audio.paused) { void audio.play().then(() => setAudioState('playing')).catch(() => setAudioState('error')); }
      else { audio.pause(); setAudioState('paused'); }
      return;
    }
    audio.pause(); audio.src = url; audio.currentTime = 0; setAudioId(id); setAudioState('loading');
    void audio.play().then(() => setAudioState('playing')).catch(() => setAudioState('error'));
  }

  function saveProgress(nextPhase = phase, nextScore = score) {
    localStorage.setItem('darlugha-lesson-2-reading-progress', JSON.stringify({ phase: nextPhase, score: nextScore, personal, translation }));
  }
  function resetQuestion() { setAnswer(''); setFeedback(''); }
  function answerQuestion(value: string, correct: string, explanation: string, count = true) {
    if (feedback) return;
    setAnswer(value);
    const ok = value === correct;
    const nextScore = ok && count ? score + 1 : score;
    if (ok && count) setScore(nextScore);
    setFeedback(ok ? `Correct ✓ ${explanation}` : `Not quite. The correct answer is: ${correct}. ${explanation}`);
    saveProgress(phase, nextScore);
  }
  function go(nextPhase: Phase) { resetQuestion(); setIndex(0); setSortItems([]); setPhase(nextPhase); saveProgress(nextPhase); }
  function next() {
    if (phase === 'prediction' && index < lessonTwoReadingPractice.prediction.length - 1) { setIndex(value => value + 1); resetQuestion(); return; }
    if (phase === 'prediction') return go('first');
    if (phase === 'first') return go('second');
    if (phase === 'second') return go('details');
    if (phase === 'details' && index < lessonTwoReadingPractice.details.length - 1) { setIndex(value => value + 1); resetQuestion(); return; }
    if (phase === 'details') return go('trueFalse');
    if (phase === 'trueFalse' && index < lessonTwoReadingPractice.trueFalse.length - 1) { setIndex(value => value + 1); resetQuestion(); return; }
    if (phase === 'trueFalse') return go('sort');
    if (phase === 'sort') return go('personal');
    if (phase === 'personal') {
      localStorage.setItem('darlugha-lesson-2-reading-progress', JSON.stringify({ completed: true, score, personal, translation, attempts: 1, lastAttempt: new Date().toISOString() }));
      return setPhase('results');
    }
  }
  function reset() { player.current?.pause(); setPhase('prediction'); setIndex(0); setScore(0); resetQuestion(); setSortItems([]); setAudioId(''); setAudioState('idle'); }

  const progress = Math.round((phases.indexOf(phase) / (phases.length - 1)) * 100);
  const prediction = lessonTwoReadingPractice.prediction[index];
  const detail = lessonTwoReadingPractice.details[index];
  const truth = lessonTwoReadingPractice.trueFalse[index];
  const sort = lessonTwoReadingPractice.sort[0];
  const total = lessonTwoReadingPractice.gist.length + lessonTwoReadingPractice.details.length + lessonTwoReadingPractice.trueFalse.length + 1;
  const percent = Math.round((score / total) * 100);

  return <section className="reading-lesson" aria-label="قراءة الدرس الثاني">
    <div className="reading-header"><div><Link className="back-link" href="/levels/A1?lesson=2">← Lesson sections</Link><div className="eyebrow">A1 · Lesson 2</div><h1>{phase === 'prediction' ? 'Get ready to read' : lessonTwoReading.titleArabic}</h1><p dir="ltr">{lessonTwoReading.titleEnglish}</p></div><div className="reading-progress"><strong>{progress}%</strong><span>Reading progress</span></div></div>
    {phase !== 'results' && <div className="reading-progress-bar"><span style={{ width: `${Math.max(8, progress)}%` }} /></div>}
    {phase === 'prediction' && <div className="reading-panel"><img className="reading-prediction-image" src={lessonTwoReading.predictionImageUrl} alt="A scene outside a translation center" /><div className="eyebrow">BEFORE READING · PREDICT</div><h2>{prediction.prompt}</h2><div className="reading-options">{stableShuffle(prediction.choices, prediction.id).map(choice => <button type="button" className={answer === choice ? 'selected' : ''} key={choice} onClick={() => answerQuestion(choice, prediction.answer, 'This prediction question does not affect your score.', false)}>{choice}</button>)}</div>{feedback && <p className="reading-feedback">{feedback}</p>}<p className="reading-note" dir="ltr">Your prediction does not affect your score.</p><button className="button" type="button" disabled={!feedback} onClick={next}>{index === 2 ? 'Reveal the text title →' : 'Next question →'}</button></div>}
    {phase === 'first' && <div className="reading-panel text-panel"><div className="reading-tools"><button className="reading-audio-button" type="button" onClick={() => playFile(lessonTwoReading.fullAudioUrl, 'full')} aria-label="Play the full text">🔊 {audioId === 'full' && audioState === 'playing' ? 'Pause' : 'Listen to the full text'}</button><button className="review-button" type="button" onClick={() => setTranslation(value => !value)}>{translation ? 'Hide translation' : 'Show translation'}</button></div>{audioState === 'error' && <p className="reading-note" dir="ltr">The recording could not be loaded. Please try again.</p>}<h2>{lessonTwoReading.titleArabic}</h2><p className="reading-full-text">{lessonTwoReading.fullText}</p>{translation && <p className="reading-translation" dir="ltr">{lessonTwoReading.fullTranslation}</p>}<div className="question-panel"><h3>{lessonTwoReadingPractice.gist[0].prompt}</h3><div className="reading-options">{stableShuffle(lessonTwoReadingPractice.gist[0].choices, lessonTwoReadingPractice.gist[0].id).map(choice => <button type="button" className={answer === choice ? 'selected' : ''} key={choice} onClick={() => answerQuestion(choice, lessonTwoReadingPractice.gist[0].answer, 'This is the main idea of the text.')}>{choice}</button>)}</div>{feedback && <p className="reading-feedback">{feedback}</p>}<button className="button" type="button" disabled={!feedback} onClick={next}>Continue reading →</button></div></div>}
    {phase === 'second' && <div className="reading-panel text-panel"><div className="reading-tools"><button className="review-button" type="button" onClick={() => setTranslation(value => !value)}>{translation ? 'Hide translation' : 'Show translation'}</button></div>{lessonTwoReading.paragraphs.map(paragraph => <article className="reading-person" key={paragraph.id}><div className="section-title"><h2>Paragraph {paragraph.id.slice(-2)}</h2><button className="sound-button" type="button" onClick={() => playFile(paragraph.audioUrl, paragraph.id)} aria-label={`Play ${paragraph.id}`}>🔊 Listen</button></div><p>{paragraph.arabic}</p>{translation && <p className="reading-translation" dir="ltr">{paragraph.english}</p>}<div className="sentence-list">{lessonTwoReading.sentences.filter(sentence => paragraph.sentenceIds.includes(sentence.id)).map(sentence => <div className="sentence-row" key={sentence.id}><span>{sentence.arabic}</span><button className="sentence-audio" type="button" onClick={() => playFile(sentence.audioUrl, sentence.id)} aria-label={`Play sentence ${sentence.id}`}>🔊</button></div>)}</div></article>)}<button className="button" type="button" onClick={next}>I finished the second reading →</button></div>}
    {phase === 'details' && <QuestionPanel seed={detail.id} title="UNDERSTAND THE DETAILS" prompt={detail.prompt} choices={detail.choices} answer={answer} feedback={feedback} onAnswer={value => answerQuestion(value, detail.answer, `Evidence: ${detail.evidence}.`)} onNext={next} />}
    {phase === 'trueFalse' && <QuestionPanel seed={truth.id} title="TRUE OR FALSE?" prompt={truth.statement} choices={['صحيح', 'خطأ']} answer={answer} feedback={feedback} onAnswer={value => answerQuestion(value, truth.answer ? 'صحيح' : 'خطأ', `Evidence: ${truth.evidence}.`)} onNext={next} />}
    {phase === 'sort' && <div className="reading-panel question-panel"><div className="eyebrow">ORDER THE INFORMATION</div><h2>{sort.prompt}</h2><p dir="ltr">Select the sentences in the order they appear in the text.</p><div className="reading-options">{stableShuffle(sort.items, `${sort.id}-display`).map(item => <button type="button" className={sortItems.includes(item) ? 'selected' : ''} disabled={sortItems.includes(item)} key={item} onClick={() => { const nextItems = [...sortItems, item]; setSortItems(nextItems); if (nextItems.length === sort.items.length) { const ok = nextItems.every((value, itemIndex) => value === sort.items[itemIndex]); if (ok) setScore(value => value + 1); setFeedback(ok ? 'Correct ✓ The order is right.' : `Try again. The correct order starts with: ${sort.items[0]}`); } }}>{item}</button>)}</div>{sortItems.length > 0 && !feedback && <p className="reading-note">Selected: {sortItems.join(' ← ')}</p>}{feedback && <p className="reading-feedback">{feedback}</p>}<button className="review-button" type="button" disabled={Boolean(feedback) || sortItems.length === 0} onClick={() => setSortItems([])}>Reset order</button><button className="button" type="button" disabled={!feedback} onClick={next}>Continue →</button></div>}
    {phase === 'personal' && <div className="reading-panel"><div className="eyebrow">PERSONAL RESPONSE</div><h2>{lessonTwoReadingPractice.personal.prompt}</h2><textarea value={personal} onChange={event => setPersonal(event.target.value)} placeholder="Write a short Arabic answer here…" /><p className="reading-note" dir="ltr">This activity is optional and does not affect your score.</p><button className="button" type="button" onClick={next}>Finish reading →</button></div>}
    {phase === 'results' && <LessonCompletion level="A1" lesson={2} section="reading" passed={percent >= 70} score={`${percent}% · ${score}/${total} correct`} onRetry={reset} />}
  </section>;
}

function QuestionPanel({ seed, title, prompt, choices, answer, feedback, onAnswer, onNext }: { seed: string; title: string; prompt: string; choices: readonly string[]; answer: string; feedback: string; onAnswer: (value: string) => void; onNext: () => void }) {
  return <div className="reading-panel question-panel"><div className="eyebrow">{title}</div><h2>{prompt}</h2><div className="reading-options">{stableShuffle(choices, seed).map(choice => <button type="button" className={answer === choice ? 'selected' : ''} key={choice} onClick={() => onAnswer(choice)}>{choice}</button>)}</div>{feedback && <p className="reading-feedback">{feedback}</p>}<button className="button" type="button" disabled={!feedback} onClick={onNext}>Next →</button></div>;
}
