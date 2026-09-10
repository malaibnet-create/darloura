'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { amalQuestions, dialogueQuestions, dialogueLines, listeningContent, type ListeningQuestion } from '../../data/lesson1/listening';
import LessonCompletion from '../learning/LessonCompletion';
import { markSectionStarted } from '../../lib/learning-progress';
import { userStorage as localStorage } from '../../lib/user-scoped-storage.mjs';

type Stage = 'intro' | 'amal' | 'amal-questions' | 'dialogue' | 'dialogue-questions' | 'results';
const progressKey = 'darlugha-lesson-1-listening-progress';

function shuffle<T>(items: readonly T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

export default function ListeningLesson() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [stage, setStage] = useState<Stage>('intro');
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [playing, setPlaying] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'paused' | 'error'>('idle');
  const [attempts, setAttempts] = useState(0);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    markSectionStarted('A1', 1, 'listening');
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(progressKey) || '{}');
        if (saved.completed) return;
        if (['intro', 'amal', 'amal-questions', 'dialogue', 'dialogue-questions'].includes(saved.stage)) setStage(saved.stage);
        if (Number.isInteger(saved.index)) setIndex(saved.index);
        if (Number.isFinite(saved.score)) setScore(saved.score);
        if (Number.isFinite(saved.attempts)) setAttempts(saved.attempts);
      } catch { /* start a fresh attempt */ }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    localStorage.setItem(progressKey, JSON.stringify({ stage, index, score, attempts, updatedAt: new Date().toISOString() }));
  }, [attempts, index, score, stage]);

  useEffect(() => () => audioRef.current?.pause(), []);

  function play(url: string, id: string) {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'none';
      audioRef.current.onended = () => { setPlaying(''); setStatus('idle'); };
      audioRef.current.onerror = () => setStatus('error');
    }
    const player = audioRef.current;
    if (playing === id) {
      if (player.paused) void player.play().then(() => setStatus('playing')).catch(() => setStatus('error'));
      else { player.pause(); setStatus('paused'); }
      return;
    }
    player.pause();
    player.src = url;
    player.currentTime = 0;
    setPlaying(id);
    setStatus('loading');
    void player.play().then(() => setStatus('playing')).catch(() => setStatus('error'));
  }

  function restartAudio() {
    if (!audioRef.current || !playing) return;
    audioRef.current.currentTime = 0;
    void audioRef.current.play().then(() => setStatus('playing')).catch(() => setStatus('error'));
  }

  function answerQuestion(value: string, question: ListeningQuestion) {
    if (feedback) return;
    setAnswer(value);
    setAttempts(number => number + 1);
    const correct = value === question.correctAnswer;
    setFeedback(correct ? `Correct ✓ ${question.explanation}` : `Not quite. The correct answer is: ${question.correctAnswer}. ${question.explanation}`);
    if (correct) setScore(number => number + 1);
  }

  function next() {
    setAnswer('');
    setFeedback('');
    if (stage === 'intro') return setStage('amal');
    if (stage === 'amal') return setStage('amal-questions');
    if (stage === 'amal-questions' && index < amalQuestions.length - 1) return setIndex(number => number + 1);
    if (stage === 'amal-questions') { setIndex(0); return setStage('dialogue'); }
    if (stage === 'dialogue') return setStage('dialogue-questions');
    if (stage === 'dialogue-questions' && index < dialogueQuestions.length - 1) return setIndex(number => number + 1);
    setStage('results');
  }

  function reset() {
    audioRef.current?.pause();
    setStage('intro'); setIndex(0); setScore(0); setAnswer(''); setFeedback(''); setPlaying(''); setStatus('idle'); setAttempts(0); setShowText(false);
  }

  const audio = stage === 'amal' || stage === 'amal-questions' ? listeningContent.audios[0] : listeningContent.audios[1];
  const question = stage === 'amal-questions' ? amalQuestions[index] : stage === 'dialogue-questions' ? dialogueQuestions[index] : null;
  const shuffledChoices = useMemo(() => question ? shuffle(question.choices) : [], [question]);
  const percent = Math.round(score / (amalQuestions.length + dialogueQuestions.length) * 100);

  return <section className="listening-lesson" aria-label="Listening section">
    <div className="listening-hero">
      <Image src={listeningContent.heroImage} alt="Two Moroccan students meeting in a university courtyard" width={1600} height={900} sizes="(max-width: 900px) 100vw, 50vw" />
      <div className="listening-hero-copy">
        <Link className="back-link" href="/levels/A1?lesson=1">← Lesson sections</Link>
        <div className="eyebrow">A1 · Lesson 1</div>
        <h1>{listeningContent.title}</h1>
        <p dir="ltr">{listeningContent.englishTitle}</p>
        <p dir="ltr">Listen for names, nationality, age, study, and where people live.</p>
        {stage === 'intro' && <button className="button" onClick={next}>Start listening →</button>}
      </div>
    </div>

    {stage === 'intro' && <div className="listening-panel" dir="ltr"><h2>Lesson goals</h2><div className="listening-goals"><span>✓ Understand names, nationality, and age</span><span>✓ Understand where people live and study</span><span>✓ Recognize Meknes and Rabat</span></div></div>}

    {(stage === 'amal' || stage === 'dialogue') && <div className="listening-panel audio-stage">
      <div className="eyebrow">{stage === 'amal' ? 'Listening 1' : 'Listening 2'}</div>
      <h2>{audio.title}</h2>
      <p dir="ltr">{stage === 'amal' ? 'A Message from Amal' : 'Meeting at the University'}</p>
      {audio.audioUrl && audio.available ? <div className="audio-controls">
        <button className="reading-audio-button" aria-label={`Play ${audio.title}`} onClick={() => play(audio.audioUrl!, audio.id)}>{playing === audio.id && status === 'playing' ? '⏸ Pause' : '🔊 Play audio'}</button>
        <button className="review-button" type="button" onClick={restartAudio} disabled={playing !== audio.id}>↺ Restart</button>
        <span>{status === 'error' ? 'The audio could not be loaded. Please try again.' : 'Audio never starts automatically.'}</span>
      </div> : <p className="listening-note">This recording is not available yet.</p>}
      <div className="listening-actions"><button className="review-button" onClick={() => setShowText(value => !value)}>{showText ? 'Hide transcript' : 'Show transcript'}</button></div>
      {showText && <p className="listening-transcript">{audio.transcript}</p>}
      <button className="button" onClick={next}>Continue to questions →</button>
    </div>}

    {stage === 'dialogue' && <div className="listening-panel"><h2 dir="ltr">Play each dialogue line</h2><div className="dialogue-lines">{dialogueLines.map(([speaker, url, text], lineIndex) => <div className={`dialogue-line ${speaker === 'سَلْمَى' ? 'salma' : 'yassine'}`} key={url}><strong>{lineIndex + 1}. {speaker}</strong><span>{text}</span><button className="review-button" aria-label={`Play dialogue line ${lineIndex + 1}`} onClick={() => play(url, `line-${lineIndex}`)}>🔊 Play</button></div>)}</div></div>}

    {question && <div className="listening-panel listening-question"><div className="eyebrow">Listen and answer</div><h2>{question.prompt}</h2><div className="listening-options">{shuffledChoices.map(item => <button key={item} className={answer === item ? 'selected' : ''} onClick={() => answerQuestion(item, question)}>{item}</button>)}</div>{feedback && <p className="reading-feedback" dir="ltr">{feedback}</p>}<button className="button" disabled={!feedback} onClick={next}>Next →</button></div>}

    {stage === 'results' && <LessonCompletion level="A1" lesson={1} section="listening" passed={percent >= 70} score={`${percent}% · ${score}/${amalQuestions.length + dialogueQuestions.length} correct`} onRetry={reset} />}
  </section>;
}
