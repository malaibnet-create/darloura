'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { lessonTwoVocabulary, type VocabularyItem } from '../../data/lesson2/vocabulary';
import { userStorage as localStorage } from '../../lib/user-scoped-storage.mjs';
import {
  lessonTwoFormQuestions,
  lessonTwoListeningQuestions,
  lessonTwoMatchingGroups,
  lessonTwoMeaningQuestions,
  lessonTwoSentenceQuestions,
} from '../../data/lesson2/practice';
import { markLesson2SectionComplete, markLesson2SectionStarted } from '../../lib/lesson2-progress';
import { removeReviewItem, upsertReviewItem } from '../../lib/learning-progress';
import { stableShuffle } from '../../lib/stable-shuffle';
import LessonCompletion from '../learning/LessonCompletion';

type Status = 'new' | 'learning' | 'mastered';
type AudioState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
type PracticeQuestion = {
  id: string;
  answer?: string;
  choices?: readonly string[];
  correct?: string;
  prompt?: string;
  sentence?: string;
  wordId?: number;
  wordIds?: readonly number[];
};

const labels: Record<Status, string> = { new: 'New', learning: 'Learning', mastered: 'Mastered' };
const stages = [
  'Choose the correct meaning',
  'Find the words in the same group',
  'Listen and choose the word',
  'Complete the sentence',
  'Choose the correct form',
];
const stageData = [
  lessonTwoMeaningQuestions,
  lessonTwoMatchingGroups,
  lessonTwoListeningQuestions,
  lessonTwoSentenceQuestions,
  lessonTwoFormQuestions,
] as const;
const totalPracticeQuestions = stageData.reduce((total, items) => total + items.length, 0);
const PRACTICE_PROGRESS_KEY = 'darlugha-lesson-2-vocabulary-practice';

export default function LessonTwoVocabulary() {
  const [loaded, setLoaded] = useState(false);
  const [viewed, setViewed] = useState<number[]>([]);
  const [status, setStatus] = useState<Record<number, Status>>({});
  const [review, setReview] = useState<number[]>([]);
  const [practice, setPractice] = useState(false);
  const [practiceDone, setPracticeDone] = useState(false);
  const [stage, setStage] = useState(0);
  const [question, setQuestion] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [selectedMatches, setSelectedMatches] = useState<number[]>([]);
  const [practiceScore, setPracticeScore] = useState(0);
  const [playingId, setPlayingId] = useState('');
  const [audioState, setAudioState] = useState<AudioState>('idle');
  const [audioError, setAudioError] = useState('');
  const player = useRef<HTMLAudioElement | null>(null);
  const cardNodes = useRef(new Map<number, HTMLElement>());

  useEffect(() => {
    markLesson2SectionStarted('vocabulary');
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem('darlugha-lesson-2-vocabulary') || '{}');
        setViewed(saved.viewed || []);
        setStatus(saved.status || {});
        setReview(saved.review || []);
        const savedPractice = JSON.parse(localStorage.getItem(PRACTICE_PROGRESS_KEY) || '{}');
        if (savedPractice.completed === true) {
          setPracticeDone(true);
          setPracticeScore(Number(savedPractice.score) || 0);
        } else if (savedPractice.active === true) {
          const savedStage = Number(savedPractice.stage);
          const savedQuestion = Number(savedPractice.question);
          setStage(Number.isInteger(savedStage) && savedStage >= 0 && savedStage < stageData.length ? savedStage : 0);
          setQuestion(Number.isInteger(savedQuestion) && savedQuestion >= 0 ? savedQuestion : 0);
          setPracticeScore(Number(savedPractice.score) || 0);
          setPractice(true);
        }
      } catch {
        // Invalid local progress should not block the lesson.
      }
      setLoaded(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(
      'darlugha-lesson-2-vocabulary',
      JSON.stringify({ viewed, status, review }),
    );
  }, [loaded, review, status, viewed]);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(PRACTICE_PROGRESS_KEY, JSON.stringify({
      active: practice && !practiceDone,
      completed: practiceDone,
      stage,
      question,
      score: practiceScore,
    }));
  }, [loaded, practice, practiceDone, practiceScore, question, stage]);

  useEffect(() => {
    if (practice || practiceDone || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleIds = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => Number((entry.target as HTMLElement).dataset.vocabularyId));
        if (visibleIds.length) setViewed((current) => Array.from(new Set([...current, ...visibleIds])));
      },
      { threshold: 0.45 },
    );
    cardNodes.current.forEach((node) => observer.observe(node));
    const markAllAtBottom = () => {
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 220) {
        setViewed(lessonTwoVocabulary.map((item) => item.id));
      }
    };
    window.addEventListener('scroll', markAllAtBottom, { passive: true });
    markAllAtBottom();
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', markAllAtBottom);
    };
  }, [practice, practiceDone]);

  useEffect(() => () => player.current?.pause(), []);

  const currentStageItems = stageData[stage];
  const current = currentStageItems[question] as PracticeQuestion;
  const allViewed = viewed.length === lessonTwoVocabulary.length;
  const matchingOptions = useMemo(() => {
    if (stage !== 1 || !current.wordIds) return [];
    const correctIds = [...current.wordIds] as number[];
    const distractors = stableShuffle(
      lessonTwoVocabulary.filter((item) => !correctIds.includes(item.id)),
      current.id,
    ).slice(0, 4);
    const correct = lessonTwoVocabulary.filter((item) => correctIds.includes(item.id));
    return stableShuffle([...correct, ...distractors], `${current.id}-options`);
  }, [current, stage]);

  function play(url: string, id: string) {
    setAudioError('');
    if (!player.current) {
      player.current = new Audio();
      player.current.preload = 'none';
      player.current.onended = () => { setPlayingId(''); setAudioState('idle'); };
      player.current.onerror = () => { setAudioState('error'); setAudioError('The audio could not be loaded. Please try again.'); };
    }
    const audio = player.current;
    if (playingId === id) {
      if (audio.paused) void audio.play().then(() => setAudioState('playing')).catch(() => setAudioState('error'));
      else { audio.pause(); setAudioState('paused'); }
      return;
    }
    audio.pause();
    audio.src = url;
    audio.currentTime = 0;
    setPlayingId(id);
    setAudioState('loading');
    void audio.play().then(() => setAudioState('playing')).catch(() => {
      setAudioState('error');
      setAudioError('The audio could not be played. Please try again.');
    });
  }

  function updateStatus(item: VocabularyItem, value: Status) {
    setStatus((currentStatus) => ({ ...currentStatus, [item.id]: value }));
  }

  function toggleReview(item: VocabularyItem) {
    const reviewId = `a1-l2-vocabulary-${item.id}`;
    const isSaved = review.includes(item.id);
    if (isSaved) removeReviewItem(reviewId);
    else upsertReviewItem({ id: reviewId, level: 'A1', lesson: 2, section: 'vocabulary', arabic: item.word, english: item.meaning, example: item.example, audioUrl: item.wordAudioUrl });
    setReview((currentReview) => isSaved ? currentReview.filter((id) => id !== item.id) : [...currentReview, item.id]);
  }

  function choose(value: string) {
    if (feedback) return;
    const correct = stage === 0
      ? current.correct
      : stage === 2
        ? lessonTwoVocabulary.find((item) => item.id === current.wordId)?.word
        : current.answer;
    const correctValue = correct || '';
    const isCorrect = value === correctValue;
    setAnswer(value);
    if (isCorrect) setPracticeScore((score) => score + 1);
    setFeedback(isCorrect ? 'Correct ✓ إجابة صحيحة.' : `Not quite — حاول مرة أخرى. Correct answer: ${correctValue}`);
  }

  function checkMatching() {
    const wordIds = current.wordIds ?? [];
    if (feedback || selectedMatches.length !== wordIds.length) return;
    const correctIds = [...wordIds].sort((a, b) => a - b);
    const selectedIds = [...selectedMatches].sort((a, b) => a - b);
    const isCorrect = correctIds.every((id: number, itemIndex: number) => id === selectedIds[itemIndex]);
    if (isCorrect) setPracticeScore((score) => score + 1);
    setFeedback(isCorrect
      ? 'Correct ✓ You found every word in the group. أحسنت.'
      : 'Try again — one or more selected words belongs to a different group. حاول مرة أخرى.');
  }

  function nextPractice() {
    setAnswer(''); setFeedback(''); setSelectedMatches([]);
    if (question < currentStageItems.length - 1) { setQuestion((value) => value + 1); return; }
    if (stage < stageData.length - 1) { setStage((value) => value + 1); setQuestion(0); return; }
    setPractice(false); setPracticeDone(true); setStage(0); setQuestion(0);
    markLesson2SectionComplete('vocabulary');
  }

  if (practiceDone) return <main className="shell vocabulary-page"><LessonCompletion level="A1" lesson={2} section="vocabulary" passed score={`${practiceScore}/${totalPracticeQuestions} correct`} onRetry={() => { setPracticeDone(false); setPractice(true); setStage(0); setQuestion(0); setPracticeScore(0); }} /></main>;

  if (practice) {
    const word = stage === 0 ? lessonTwoVocabulary.find((item) => item.id === current.wordId) : null;
    const listeningWord = stage === 2 ? lessonTwoVocabulary.find((item) => item.id === current.wordId) : null;
    const choices: string[] = stage === 1 ? [] : stableShuffle<string>(current.choices ?? [], `${current.id}-choices`);
    const completedBefore = stageData.slice(0, stage).reduce((sum, items) => sum + items.length, 0);
    return <main className="shell vocabulary-page">
      <header className="topbar"><strong>Lesson 2 vocabulary practice</strong><button className="link" type="button" onClick={() => setPractice(false)}>Back to cards</button></header>
      <section className="practice-shell">
        <div className="practice-header"><div><div className="practice-stage">Stage {stage + 1} of 5 · Question {question + 1} of {currentStageItems.length}</div><h2>{stages[stage]}</h2><p dir="ltr">Answer the question, read the feedback, then continue.</p></div><div className="practice-score"><strong>{practiceScore}</strong><span>points</span></div></div>
        <div className="practice-progress"><span style={{ width: `${((completedBefore + question) / totalPracticeQuestions) * 100}%` }} /></div>
        <div className="practice-body exercise-card">
          <h3>{stage === 0 && word ? word.word : stage === 1 ? current.id === 'match-time' ? 'Select the five time words.' : 'Select the five work and profession words.' : stage === 2 ? 'Listen, then choose the word.' : stage === 3 ? current.sentence : `${current.prompt} — choose the correct form.`}</h3>
          {stage === 1 ? <>
            <p dir="ltr" className="exercise-hint">Choose only the words that belong to this group, then press Check answers.</p>
            <div className="choice-grid arabic-choices">{matchingOptions.map((item) => <button type="button" className={selectedMatches.includes(item.id) ? 'choice selected' : 'choice'} key={item.id} disabled={Boolean(feedback)} onClick={() => { setSelectedMatches((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : ids.length < (current.wordIds?.length ?? 0) ? [...ids, item.id] : ids); play(item.wordAudioUrl, `match-${item.id}`); }}>{item.word}<small dir="ltr">{item.meaning}</small></button>)}</div>
            <button className="button" type="button" disabled={selectedMatches.length !== (current.wordIds?.length ?? 0) || Boolean(feedback)} onClick={checkMatching}>Check answers</button>
          </> : <>
            {stage === 2 && listeningWord && <button className="listen-main" type="button" onClick={() => play(listeningWord.wordAudioUrl, `listening-${listeningWord.id}`)} aria-label="Listen to the word">🔊<span>{playingId === `listening-${listeningWord.id}` && audioState === 'loading' ? 'Loading…' : 'Listen'}</span></button>}
            <div className="choice-grid arabic-choices">{choices.map((choice: string) => <button type="button" className={answer === choice ? 'choice selected' : 'choice'} key={choice} disabled={Boolean(feedback)} onClick={() => choose(choice)}>{choice}</button>)}</div>
          </>}
          {audioError && <p className="grammar-wrong" role="alert">{audioError}</p>}
          {feedback && <p className={feedback.startsWith('Correct') ? 'grammar-correct' : 'grammar-wrong'}>{feedback}</p>}
        </div>
        <div className="practice-navigation"><button className="practice-back" type="button" onClick={() => setPractice(false)}>Back to cards</button><button className="practice-next" type="button" disabled={!feedback} onClick={nextPractice}>{stage === 4 && question === currentStageItems.length - 1 ? 'Finish practice' : 'Next →'}</button></div>
      </section>
    </main>;
  }

  return <main className="shell vocabulary-page">
    <header className="topbar"><Link className="brand" href="/dashboard"><span className="brand-mark">ع</span><span>Dar<span>Lugha</span></span></Link><Link className="link" href="/levels/A1?lesson=2">Back to lesson sections</Link></header>
    <section className="vocabulary-hero"><div><div className="eyebrow">A1 · Lesson 2</div><h1>Life and work vocabulary</h1><p>Scroll through all 27 cards. Listen to each word and example, save useful words for review, then complete the five practice stages.</p></div><div className="vocabulary-count"><strong>{viewed.length} / 27</strong><span>cards viewed</span></div></section>
    <div className="status-legend"><span>All 27 cards are shown below</span><span>🔖 {review.length} for review</span><span>{allViewed ? '✓ All cards viewed' : 'Practice is available whenever you are ready'}</span></div>
    <section className="vocabulary-grid lesson-two-vocabulary-grid">{lessonTwoVocabulary.map((item) => <article className={`vocabulary-card ${status[item.id] || 'new'}`} data-vocabulary-id={item.id} key={item.id} ref={(node) => { if (node) cardNodes.current.set(item.id, node); else cardNodes.current.delete(item.id); }}>
      <div className="card-top"><span className={`status-pill ${status[item.id] || 'new'}`}><i className="status-dot" />{labels[status[item.id] || 'new']}</span><span className="vocabulary-visual" aria-hidden="true">{item.visual}</span></div>
      <div className="word-line"><h2>{item.word}</h2><button className="sound-button" type="button" onClick={() => play(item.wordAudioUrl, `word-${item.id}`)} aria-label={`Play ${item.word}`}>🔊</button></div><p className="meaning" dir="ltr">{item.meaning}</p>
      <div className="example"><div className="example-line"><p>{item.example}</p><button className="sound-button" type="button" onClick={() => play(item.exampleAudioUrl, `example-${item.id}`)} aria-label={`Play example for ${item.word}`}>🔊</button></div><span dir="ltr">{item.translation}</span></div>
      {item.note && <p className="vocabulary-note">💡 {item.note}</p>}
      <div className="card-actions"><button className={review.includes(item.id) ? 'review-button saved' : 'review-button'} type="button" onClick={() => toggleReview(item)}>{review.includes(item.id) ? '✓ Added to review' : '🔖 Add to review'}</button><select aria-label={`Learning status for ${item.word}`} value={status[item.id] || 'new'} onChange={(event) => updateStatus(item, event.target.value as Status)}><option value="new">New</option><option value="learning">Learning</option><option value="mastered">Mastered</option></select></div>
    </article>)}</section>
    {audioError && <p className="grammar-wrong" role="alert">{audioError}</p>}
    <section className="practice-intro"><div className="eyebrow">PRACTICE</div><h2>Ready for the exercises?</h2><p dir="ltr">The five stages use the exact questions supplied with Lesson 2. You may start now and return to the cards at any time.</p><button className="practice-start" type="button" onClick={() => { setPractice(true); setPracticeDone(false); setStage(0); setQuestion(0); setPracticeScore(0); setAnswer(''); setFeedback(''); setSelectedMatches([]); }}>Start practice →</button>{!allViewed && <p dir="ltr">You can still review the remaining {lessonTwoVocabulary.length - viewed.length} card(s) later.</p>}</section>
  </main>;
}
