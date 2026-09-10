'use client';

/* eslint-disable @next/next/no-img-element -- Preserve the lesson bundle's responsive image sizing. */

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { informationCards, interactiveWords, readingChoices, readingContent, readingTitle, trueFalseItems } from '../../data/lesson1/reading';
import LessonCompletion from '../learning/LessonCompletion';
import { markSectionStarted } from '../../lib/learning-progress';
import { userStorage as localStorage } from '../../lib/user-scoped-storage.mjs';

type Stage = 'before' | 'reading' | 'idea' | 'understanding' | 'truefalse' | 'cards' | 'personal' | 'results';
const stageOrder: Stage[] = ['before', 'reading', 'idea', 'understanding', 'truefalse', 'cards', 'personal', 'results'];

export default function ReadingLesson() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioId, setAudioId] = useState('');
  const [audioState, setAudioState] = useState<'idle' | 'loading' | 'playing' | 'paused' | 'error'>('idle');
  const [stage, setStage] = useState<Stage>('before');
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [, setWrong] = useState<string[]>([]);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [translation, setTranslation] = useState(false);
  const [word, setWord] = useState<typeof interactiveWords[number] | null>(null);
  const [personal, setPersonal] = useState('');

  useEffect(() => {
    markSectionStarted('A1', 1, 'reading');
    const frame = window.requestAnimationFrame(() => {
      try { const saved = JSON.parse(localStorage.getItem('darlugha-lesson-1-reading-progress') || '{}'); if (saved.personal) setPersonal(saved.personal); } catch { /* optional storage */ }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  useEffect(() => () => { audioRef.current?.pause(); }, []);

  function playFile(url: string, id: string) {
    if (!audioRef.current) { audioRef.current = new Audio(); audioRef.current.onended = () => { setAudioState('idle'); setAudioId(''); }; audioRef.current.onerror = () => setAudioState('error'); }
    const audio = audioRef.current;
    if (audioId === id) { if (audio.paused) { void audio.play().then(() => setAudioState('playing')).catch(() => setAudioState('error')); } else { audio.pause(); setAudioState('paused'); } return; }
    audio.pause(); audio.src = url; audio.currentTime = 0; setAudioId(id); setAudioState('loading'); void audio.play().then(() => setAudioState('playing')).catch(() => setAudioState('error'));
  }

  function buttonLabel(id: string, normal: string) { return audioId === id && audioState === 'loading' ? 'Loading…' : audioId === id && audioState === 'playing' ? 'Pause' : audioId === id && audioState === 'paused' ? 'Resume' : normal; }
  function submit(value: string, correct: string, explanation: string) { if (feedback) return; setAnswer(value); if (value === correct) { setScore(value => value + 1); setFeedback(`Correct ✓ ${explanation}`); } else { setWrong(values => [...values, value]); setFeedback(`Not quite. The correct answer is: ${correct}. ${explanation}`); } }
  function next() { setAnswer(''); setFeedback(''); if (stage === 'before') return setStage('reading'); if (stage === 'reading') return setStage('idea'); if (stage === 'idea') return setStage('understanding'); if (stage === 'understanding' && index < readingChoices.length - 2) return setIndex(value => value + 1); if (stage === 'understanding') { setIndex(0); return setStage('truefalse'); } if (stage === 'truefalse' && index < trueFalseItems.length - 1) return setIndex(value => value + 1); if (stage === 'truefalse') return setStage('cards'); if (stage === 'cards') return setStage('personal'); if (stage === 'personal') { localStorage.setItem('darlugha-lesson-1-reading-progress', JSON.stringify({ completed: percent >= 70, score, personal, attempts: 1, lastAttempt: new Date().toISOString() })); return setStage('results'); } }
  function reset() { audioRef.current?.pause(); setAudioId(''); setAudioState('idle'); setStage('before'); setIndex(0); setScore(0); setWrong([]); setAnswer(''); setFeedback(''); }

  const question = stage === 'idea' ? readingChoices[0] : stage === 'understanding' ? readingChoices[index + 1] : null;
  const truth = stage === 'truefalse' ? trueFalseItems[index] : null;
  const percent = Math.round((score / (readingChoices.length + trueFalseItems.length)) * 100);
  const progress = Math.round((stageOrder.indexOf(stage) / (stageOrder.length - 1)) * 100);

  return <section className="reading-lesson" aria-label="Reading section"><div className="reading-header"><div><Link className="back-link" href="/levels/A1?lesson=1">← Lesson sections</Link><div className="eyebrow">A1 · Lesson 1</div><h1>{readingTitle}</h1><p dir="ltr">Two Students at the University</p></div><div className="reading-progress"><strong>{progress}%</strong><span>Reading progress</span></div></div>{stage !== 'results' && <div className="reading-progress-bar"><span style={{ width: `${Math.max(8, progress)}%` }} /></div>}
    {stage === 'before' && <div className="reading-panel"><img className="reading-opening-image" src="/images/lesson-01/reading/two-students-university.png" alt="Two university students talking in a Moroccan campus courtyard" /><div className="eyebrow">BEFORE READING</div><h2>What is the text about?</h2><div className="reading-options">{['طَالِبَانِ فِي الجَامِعَةِ.', 'طَبِيبٌ فِي المُسْتَشْفَى.', 'أُسْرَةٌ فِي البَيْتِ.'].map(item => <button type="button" className={answer === item ? 'selected' : ''} key={item} onClick={() => setAnswer(item)}>{item}</button>)}</div><p className="reading-note" dir="ltr">This warm-up question does not affect your score.</p><button className="button" type="button" disabled={!answer} onClick={next}>Start reading →</button></div>}
    {stage === 'reading' && <div className="reading-panel text-panel"><div className="reading-tools"><button className="reading-audio-button" type="button" onClick={() => playFile(readingContent.audioUrl, 'full')} aria-label="Play the full reading" aria-pressed={audioId === 'full' && audioState === 'playing'}>🔊 {buttonLabel('full', 'Listen to the text')}</button><button className="review-button" type="button" onClick={() => setTranslation(value => !value)}>{translation ? 'Hide translation' : 'Show translation'}</button></div>{audioState === 'error' && <p className="reading-note" dir="ltr">The recording could not be loaded. Please try again.</p>}{readingContent.sections.map((section, sectionIndex) => <article className={audioId === section.id ? 'reading-person audio-active' : 'reading-person'} key={section.id}><div className="section-title"><h2>{section.title}</h2><button className="sound-button" type="button" onClick={() => playFile(section.audioUrl, section.id)} aria-label={`Play ${section.id === 'salma' ? 'Salma' : 'Ahmed'} section`}>🔊 {buttonLabel(section.id, 'Listen')}</button></div><p>{section.sentences.map(item => <span className={audioId === `sentence-${item.id}` ? 'reading-sentence audio-active' : 'reading-sentence'} key={item.id}>{renderInteractive(item.text, setWord)}<button className="sentence-audio" type="button" onClick={() => playFile(item.audioUrl, `sentence-${item.id}`)} aria-label={`Play sentence ${item.id}`}>🔊</button>{' '}</span>)}</p>{translation && <p className="reading-translation" dir="ltr">{sectionIndex === 0 ? 'I am Salma. I am an Egyptian student. I study Arabic literature at the university. I am twenty years old. I live in a quiet area. My father works at the United Nations, and my mother works at a school.' : 'I am Ahmed. I am an Egyptian student. I study the Arabic language. I am twenty-one years old. I live in the same area as Salma. We are at the same university. My father is a teacher, and my mother is a doctor.'}</p>}</article>)}<button className="button" type="button" onClick={next}>I finished reading →</button></div>}
    {question && <Question question={question} answer={answer} feedback={feedback} onAnswer={submit} onNext={next} />}
    {truth && <div className="reading-panel"><div className="eyebrow">TRUE OR FALSE?</div><h2>{truth.statement}</h2><div className="reading-options two"><button type="button" className={answer === 'صحيح' ? 'selected' : ''} onClick={() => submit('صحيح', truth.answer ? 'صحيح' : 'خطأ', truth.explanation)}>صحيح</button><button type="button" className={answer === 'خطأ' ? 'selected' : ''} onClick={() => submit('خطأ', truth.answer ? 'صحيح' : 'خطأ', truth.explanation)}>خطأ</button></div>{feedback && <p className="reading-feedback">{feedback}</p>}<button className="button" type="button" disabled={!feedback} onClick={next}>Next →</button></div>}
    {stage === 'cards' && <div className="reading-panel"><div className="eyebrow">INFORMATION CARDS</div><h2>Review the students’ information</h2><p dir="ltr" className="reading-note">Read the two completed cards and compare Salma’s information with Ahmed’s. You do not need to fill in any blank.</p><div className="info-cards">{informationCards.map(card => <article className="info-card" key={card.name}><h3>{card.name}</h3>{card.fields.map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}</article>)}</div><button className="button" type="button" onClick={next}>I reviewed the cards →</button></div>}
    {stage === 'personal' && <div className="reading-panel"><div className="eyebrow">PERSONAL PRACTICE</div><h2>Answer in Arabic: What is your nationality, and what do you study?</h2><p>أَنَا ________. أَدْرُسُ ________.</p><textarea value={personal} onChange={event => setPersonal(event.target.value)} placeholder="Write a short Arabic sentence here…" /><button className="button" type="button" onClick={next}>Finish reading →</button></div>}
    {stage === 'results' && <LessonCompletion level="A1" lesson={1} section="reading" passed={percent >= 70} score={`${percent}% · ${score}/${readingChoices.length + trueFalseItems.length} correct`} onRetry={reset} />}
    {word && <div className="word-modal-backdrop" role="presentation" onClick={() => setWord(null)}><div className="word-modal" role="dialog" aria-modal="true" onClick={event => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setWord(null)} aria-label="Close">×</button><strong>{word.word}</strong><span dir="ltr">{word.meaning}</span><button className="sound-button" type="button" onClick={() => playFile(word.audioUrl, `word-${word.word}`)} aria-label={`Play ${word.word}`}>🔊 Listen</button></div></div>}
  </section>;
}

function renderInteractive(text: string, onWord: (word: typeof interactiveWords[number]) => void) { return text.split(/(\s+)/).map((part, index) => { const clean = part.replace(/[،.؟]/g, ''); const item = interactiveWords.find(word => clean === word.word.replace(/[،.؟]/g, '') || word.word.split(' ')[0] === clean); return item ? <button className="reading-word" type="button" key={index} onClick={() => onWord(item)}>{part}</button> : <span key={index}>{part}</span>; }); }

function Question({ question, answer, feedback, onAnswer, onNext }: { question: typeof readingChoices[number]; answer: string; feedback: string; onAnswer: (value: string, correct: string, explanation: string) => void; onNext: () => void }) { return <div className="reading-panel question-panel"><div className="eyebrow">COMPREHENSION QUESTION</div><h2>{question.prompt}</h2><div className="reading-options">{question.choices.map(item => <button type="button" className={answer === item ? 'selected' : ''} key={item} onClick={() => onAnswer(item, question.answer, question.explanation)}>{item}</button>)}</div>{feedback && <p className="reading-feedback">{feedback}</p>}<button className="button" type="button" disabled={!feedback} onClick={onNext}>Next →</button></div>; }
