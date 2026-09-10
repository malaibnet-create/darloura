'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { clip, speakingClips, speakingQuestions } from '../../data/lesson1/speaking';
import LessonCompletion from '../learning/LessonCompletion';
import { markSectionStarted } from '../../lib/learning-progress';
import { userStorage as localStorage } from '../../lib/user-scoped-storage.mjs';

type Stage = 'watch' | 'build' | 'pronunciation' | 'guided' | 'report';
const progressKey = 'darlugha-lesson-1-speaking-progress';

export default function SpeakingLesson() {
  const [stage, setStage] = useState<Stage>('watch');
  const [line, setLine] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [recordUrl, setRecordUrl] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    markSectionStarted('A1', 1, 'conversation');
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(progressKey) || '{}');
        if (['watch', 'build', 'pronunciation', 'guided'].includes(saved.stage)) setStage(saved.stage);
        if (Number.isInteger(saved.line)) setLine(saved.line);
        if (Number.isInteger(saved.questionIndex)) setQuestionIndex(saved.questionIndex);
        if (Number.isFinite(saved.score)) setScore(saved.score);
      } catch { /* fresh conversation */ }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    localStorage.setItem(progressKey, JSON.stringify({ stage, line, questionIndex, score, recorded, updatedAt: new Date().toISOString() }));
  }, [stage, line, questionIndex, score, recorded]);

  useEffect(() => () => {
    audioRef.current?.pause();
    if (recordUrl) URL.revokeObjectURL(recordUrl);
  }, [recordUrl]);

  function play(id: string) {
    const item = clip(id);
    if (!item) return;
    if (!audioRef.current) { audioRef.current = new Audio(); audioRef.current.preload = 'none'; }
    audioRef.current.pause();
    audioRef.current.src = item.path;
    void audioRef.current.play().catch(() => setFeedback('The audio could not be played. Please try again.'));
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) { setFeedback('Microphone recording is not supported. You can continue by writing.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      recorder.current = mediaRecorder;
      mediaRecorder.ondataavailable = event => chunks.current.push(event.data);
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        setRecordUrl(URL.createObjectURL(new Blob(chunks.current, { type: 'audio/webm' })));
        setRecorded(true);
      };
      mediaRecorder.start();
      setRecording(true);
    } catch { setFeedback('The microphone is unavailable. You can continue by writing.'); }
  }

  function stopRecording() { recorder.current?.stop(); setRecording(false); }

  function choose(value: string) {
    if (feedback) return;
    setAnswer(value);
    const correct = value === speakingQuestions[questionIndex].answer;
    setFeedback(correct ? 'Correct ✓' : `Not quite. The correct answer is: ${speakingQuestions[questionIndex].answer}`);
    if (correct) setScore(number => number + 1);
  }

  function reset() {
    setStage('watch'); setLine(0); setQuestionIndex(0); setScore(0); setAnswer(''); setFeedback(''); setRecorded(false); setRecordUrl('');
  }

  const lines = speakingClips.slice(0, 9);
  const current = lines[line];

  return <main className="speaking-page">
    <header className="speaking-head">
      <Link className="back-link" href="/levels/A1?lesson=1">← Lesson sections</Link>
      <div className="eyebrow">A1 · Lesson 1</div>
      <h1>لِنَتَعَارَفْ <span dir="ltr">Let&apos;s Meet</span></h1>
      <p dir="ltr">Practice a simple conversation at Dar Lugha Center in Meknes.</p>
      <div className="speaking-progress"><span style={{ width: `${(['watch', 'build', 'pronunciation', 'guided', 'report'].indexOf(stage) + 1) * 20}%` }} /></div>
    </header>

    {stage === 'watch' && <section className="speaking-panel"><h2 dir="ltr">Watch and listen</h2><div className="speaker-bubble"><strong>{line % 2 === 0 ? 'يوسف' : 'آدم'}</strong><p>{current.text}</p><p dir="ltr">{current.english}</p><button className="button" onClick={() => play(current.id)}>🔊 Play</button></div><div className="speaking-actions"><button className="review-button" disabled={line === 0} onClick={() => setLine(number => number - 1)}>← Previous</button><button className="button" onClick={() => line < 8 ? setLine(number => number + 1) : setStage('build')}>{line < 8 ? 'Next →' : 'Build the dialogue →'}</button></div></section>}

    {stage === 'build' && <section className="speaking-panel"><h2 dir="ltr">Build the dialogue</h2><div className="speaking-question"><div className="eyebrow" dir="ltr">Question {questionIndex + 1} of {speakingQuestions.length}</div><h3>{speakingQuestions[questionIndex].prompt}</h3>{speakingQuestions[questionIndex].choices.map(choice => <button className={answer === choice ? 'selected' : ''} key={choice} onClick={() => choose(choice)}>{choice}</button>)}{feedback && <p dir="ltr" className={answer === speakingQuestions[questionIndex].answer ? 'speaking-correct' : 'speaking-wrong'}>{feedback}</p>}</div><div className="speaking-actions"><button className="review-button" onClick={() => { setAnswer(''); setFeedback(''); }}>Try again</button><button className="button" disabled={!feedback} onClick={() => { setAnswer(''); setFeedback(''); if (questionIndex < speakingQuestions.length - 1) setQuestionIndex(number => number + 1); else setStage('pronunciation'); }}>Next →</button></div></section>}

    {stage === 'pronunciation' && <section className="speaking-panel"><h2 dir="ltr">Pronunciation practice</h2>{[['s1-10', 'اسْمِي عُثْمَانُ.'], ['s1-11', 'أَنَا مِنَ الْمَغْرِبِ.'], ['s1-12', 'أَنَا مَغْرِبِيٌّ.'], ['s1-08', 'كَيْفَ حَالُكَ؟'], ['s1-20', 'مَغْرِبِيٌّ.']].map(([id, text]) => <div className="pronunciation-card" key={id}><strong>{text}</strong><button className="review-button" onClick={() => play(id)}>🔊 Play</button>{recordUrl && <audio controls src={recordUrl} />}</div>)}<p dir="ltr">{recording ? 'Recording… Select Stop when you finish.' : recorded ? 'Your practice recording is ready to play.' : 'Recording is optional and stays on this device.'}</p><button className="button" onClick={recording ? stopRecording : startRecording}>{recording ? 'Stop recording' : '🎙 Start recording'}</button><button className="review-button" onClick={() => setStage('guided')}>Skip and continue →</button></section>}

    {stage === 'guided' && <section className="speaking-panel"><h2 dir="ltr">Guided conversation</h2><p className="ai-bubble">السَّلَامُ عَلَيْكُمْ! مَا اسْمُكَ؟</p><div className="hint-row"><button onClick={() => setAnswer('اسْمِي ...')}>اسْمِي ...</button><button onClick={() => setAnswer('أَنَا مِنْ ...')}>أَنَا مِنْ ...</button><button onClick={() => setAnswer('نَعَمْ، أَنَا ...')}>نَعَمْ، أَنَا ...</button></div><input className="speaking-input" value={answer} onChange={event => setAnswer(event.target.value)} placeholder="Type your answer in Arabic" /><button className="button" onClick={() => setStage('report')}>Finish conversation →</button></section>}

    {stage === 'report' && <section className="speaking-panel speaking-report"><div dir="ltr"><h2>Conversation report</h2><p>Greetings: Completed</p><p>Saying your name: Completed</p><p>Saying where you are from: Completed</p><p>Asking or answering a question: Completed</p><p>Dialogue questions: {score}/{speakingQuestions.length} correct</p><p>Pronunciation: {recorded ? 'Practice recording completed' : 'Not assessed'}</p></div><LessonCompletion level="A1" lesson={1} section="conversation" passed score={`${score}/${speakingQuestions.length} dialogue answers correct`} onRetry={reset} /></section>}
  </main>;
}
