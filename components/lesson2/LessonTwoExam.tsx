'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { lesson02Exam, type Skill } from '../../data/lesson2/exam';
import { calculateExamResult, normalizeBeginnerArabic, scoreWriting, retainHighestScore, type WritingEvidence } from '../../data/lesson2/scoring';
import manifest from '../../data/lesson2/exam-audio-manifest.json';
import { isLesson2Complete } from '../../lib/lesson2-progress';
import { userStorage as localStorage } from '../../lib/user-scoped-storage.mjs';

type WritingForm = WritingEvidence;
type SkillReport = Record<Skill, number>;
type Saved = { started?: boolean; answers?: Record<string, number>; marked?: string[]; writing?: WritingForm; speakingText?: string; speakingAssessed?: boolean; reviewing?: boolean; result?: ReturnType<typeof calculateExamResult> | null; skillReport?: SkillReport; highest?: number; attempts?: number };
const KEY = 'darlugha-lesson-2-exam-progress';
const initialWriting: WritingForm = { name: '', country: '', languages: [], study: '', place: '', startTime: '', endTime: '' };
const emptySkillReport: SkillReport = { vocabulary: 0, reading: 0, grammar: 0, listening: 0, conversation: 0, writing: 0, speaking: 0 };
const skillLabels: Record<Skill, string> = { vocabulary: 'Vocabulary', reading: 'Reading', grammar: 'Grammar', listening: 'Listening', conversation: 'Conversation', writing: 'Writing', speaking: 'Speaking' };
const audioFiles = Object.fromEntries(manifest.clips.map((clip) => [clip.id, `${manifest.basePath}${clip.file}`]));
const questions = lesson02Exam.choiceQuestions;
const allQuestions = [...questions, lesson02Exam.writingQuestion, lesson02Exam.speakingQuestion];
function stableShuffle(values: readonly string[], seedText: string) {
  let seed = [...seedText].reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 2166136261);
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const swapIndex = seed % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export default function LessonTwoExam() {
  const [started, setStarted] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [marked, setMarked] = useState<string[]>([]);
  const [writing, setWriting] = useState<WritingForm>(initialWriting);
  const [speakingText, setSpeakingText] = useState('');
  const [speakingAssessed, setSpeakingAssessed] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof calculateExamResult> | null>(null);
  const [skillReport, setSkillReport] = useState<SkillReport>(emptySkillReport);
  const [highest, setHighest] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [shuffled, setShuffled] = useState<Record<string, string[]>>({});
  const [plays, setPlays] = useState<Record<string, number>>({});
  const [audioState, setAudioState] = useState<{ id: string; state: 'loading' | 'playing' | 'error' } | null>(null);
  const [audioError, setAudioError] = useState('');
  const activeAudio = useRef<HTMLAudioElement | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState('');
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const recordingChunks = useRef<Blob[]>([]);

  const current = questions[index];

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(KEY) || '{}') as Saved;
        if (saved.started) setStarted(true); if (saved.answers) setAnswers(saved.answers); if (saved.marked) setMarked(saved.marked); if (saved.writing) setWriting({ ...initialWriting, ...saved.writing }); if (saved.speakingText) setSpeakingText(saved.speakingText); if (typeof saved.speakingAssessed === 'boolean') setSpeakingAssessed(saved.speakingAssessed); if (saved.reviewing) setReviewing(true); if (saved.result) { setResult(saved.result); setSubmitted(true); } if (saved.skillReport) setSkillReport(saved.skillReport); if (typeof saved.highest === 'number') setHighest(saved.highest); if (typeof saved.attempts === 'number') setAttempts(saved.attempts);
      } catch { /* ignore invalid local progress */ }
      const next: Record<string, string[]> = {};
      questions.forEach((question) => { next[question.id] = stableShuffle(question.options, question.id); });
      setShuffled(next);
      setUnlocked(isLesson2Complete());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify({ started, answers, marked, writing, speakingText, speakingAssessed, reviewing, result, skillReport, highest, attempts } satisfies Saved)); }, [started, answers, marked, writing, speakingText, speakingAssessed, reviewing, result, skillReport, highest, attempts]);

  const stopAudio = () => { activeAudio.current?.pause(); activeAudio.current = null; setAudioState(null); };
  const play = (id: string) => {
    const url = audioFiles[id as keyof typeof audioFiles]; if (!url) return;
    if (lesson02Exam.audio.maxPlaysPerClipPerAttempt && (plays[id] || 0) >= lesson02Exam.audio.maxPlaysPerClipPerAttempt) { setAudioError('You used both plays for this recording in this attempt.'); return; }
    stopAudio(); const player = new Audio(url); player.preload = 'none'; activeAudio.current = player; setPlays((old) => ({ ...old, [id]: (old[id] || 0) + 1 })); setAudioError(''); setAudioState({ id, state: 'loading' });
    player.onended = () => { if (activeAudio.current === player) { activeAudio.current = null; setAudioState(null); } }; player.onerror = () => { if (activeAudio.current === player) { activeAudio.current = null; setAudioState({ id, state: 'error' }); setAudioError('The audio could not be loaded. Please try again.'); } }; void player.play().then(() => { if (activeAudio.current === player) setAudioState({ id, state: 'playing' }); }).catch(() => { if (activeAudio.current === player) { activeAudio.current = null; setAudioState({ id, state: 'error' }); setAudioError('The audio could not be played.'); } });
  };
  const audioButton = (id: string, label: string) => <button type="button" className="review-button" onClick={() => audioState?.id === id && audioState.state === 'playing' ? stopAudio() : play(id)} aria-label={label}>{audioState?.id === id && audioState.state === 'loading' ? 'Loading…' : audioState?.id === id && audioState.state === 'playing' ? 'Stop audio' : `🔊 ${label} (${plays[id] || 0}/2)`}</button>;
  const answer = (value: number) => { if (!current) return; setAnswers((old) => ({ ...old, [current.id]: value })); };
  const go = (next: number) => { setIndex(Math.max(0, Math.min(19, next))); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const setWritingValue = (key: keyof WritingForm, value: string | string[]) => setWriting((old) => ({ ...old, [key]: value }));
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('unsupported');
      if (recordingUrl) URL.revokeObjectURL(recordingUrl);
      setRecordingUrl(''); recordingChunks.current = [];
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const nextRecorder = new MediaRecorder(stream.current); recorder.current = nextRecorder;
      nextRecorder.ondataavailable = (event) => { if (event.data.size) recordingChunks.current.push(event.data); };
      nextRecorder.onstop = () => { const url = URL.createObjectURL(new Blob(recordingChunks.current, { type: nextRecorder.mimeType || 'audio/webm' })); setRecordingUrl(url); setSpeakingAssessed(true); setSpeakingText('Recorded answer'); stream.current?.getTracks().forEach((track) => track.stop()); };
      nextRecorder.start(); setRecording(true); setSpeakingAssessed(true);
    } catch { setSpeakingAssessed(false); setRecording(false); }
  };
  const stopRecording = () => { recorder.current?.stop(); setRecording(false); };
  const submit = () => {
    const points: Record<Skill, number> = { vocabulary: 0, reading: 0, grammar: 0, listening: 0, conversation: 0, writing: scoreWriting(writing).point, speaking: speakingAssessed && normalizeBeginnerArabic(speakingText).length > 0 ? 1 : 0 };
    questions.forEach((question) => { const options = shuffled[question.id] || [...question.options]; const correctIndex = options.indexOf(question.options[question.answer]); if (answers[question.id] === correctIndex) points[question.skill] += 1; });
    const calculated = calculateExamResult(points, speakingAssessed); setSkillReport(points); setResult(calculated); setHighest((old) => retainHighestScore(old, calculated.total)); setAttempts((old) => old + 1); setSubmitted(true);
  };
  const startAgain = () => { if (recordingUrl) URL.revokeObjectURL(recordingUrl); setRecordingUrl(''); setStarted(true); setReviewing(false); setSubmitted(false); setResult(null); setSkillReport(emptySkillReport); setIndex(0); setAnswers({}); setMarked([]); setPlays({}); setWriting(initialWriting); setSpeakingText(''); setSpeakingAssessed(true); };
  const skillMaximums = questions.reduce<SkillReport>((maximums, question) => ({ ...maximums, [question.skill]: maximums[question.skill] + 1 }), { ...emptySkillReport, writing: 1, speaking: speakingAssessed ? 1 : 0 });
  const isAnswered = (question: (typeof allQuestions)[number], questionIndex: number) => questionIndex < questions.length ? answers[question.id] !== undefined : questionIndex === questions.length ? scoreWriting(writing).met > 0 : Boolean(speakingText.trim() || recordingUrl);

  if (!unlocked) return <main className="shell exam-panel" dir="rtl"><Link className="back-link" href="/levels/A1?lesson=2">← Lesson sections</Link><div className="eyebrow">A1 · Lesson 2</div><h1>Lesson 2 exam is locked</h1><p>Complete the five lesson sections first: vocabulary, reading, listening, grammar, and conversation.</p><Link className="button" href="/levels/A1?lesson=2">Back to lesson sections</Link></main>;
  if (!started) return <main className="shell exam-panel" dir="rtl"><Link className="back-link" href="/levels/A1?lesson=2">← Lesson sections</Link><div className="eyebrow">A1 · Lesson 2</div><h1>{lesson02Exam.title.ar}</h1><p dir="ltr">{lesson02Exam.title.en} · {lesson02Exam.estimatedMinutes} minutes</p><p>This exam is worth 20 points. You pass with 16/20. Answer one question per screen, then review your answers before submitting.</p><button type="button" className="button" onClick={() => setStarted(true)}>Start exam</button></main>;
  if (submitted && result) return <main className="shell exam-panel" dir="rtl"><div className="result-medal">{result.passed ? '🎉' : '🌱'}</div><h1>{result.passed ? 'You passed the Lesson 2 exam' : 'Exam completed'}</h1><div className="result-score"><strong>{result.total}/{result.effectiveMaximum}</strong><span>{result.percent}% · Pass mark: 80%</span></div><p>{result.passed ? 'Your result has been saved. Lesson 3 has not been published yet.' : 'You may review the lesson and retake the exam.'}</p><p>Highest score: {highest} · Attempts: {attempts}</p><section className="exam-skill-report"><h2>Skill report</h2>{(Object.keys(skillReport) as Skill[]).map((skill) => <div key={skill}><span>{skillLabels[skill]}</span><strong>{skill === 'speaking' && !speakingAssessed ? 'Not assessed' : `${skillReport[skill]}/${skillMaximums[skill]}`}</strong></div>)}</section><div className="result-actions"><button type="button" className="button" onClick={startAgain}>Retake exam</button><Link className="review-button" href="/levels/A1?lesson=2">Review weak skills</Link></div></main>;
  if (reviewing) return <main className="shell exam-panel" dir="rtl"><Link className="back-link" href="/levels/A1?lesson=2">← Save and exit</Link><h1>Review answers before submission</h1><p>You can return to any question and edit it. Correct answers stay hidden before submission.</p><div className="choice-grid">{allQuestions.map((question, questionIndex) => <button type="button" className={marked.includes(question.id) ? 'selected' : ''} key={question.id} onClick={() => { setReviewing(false); go(questionIndex); }}>{questionIndex + 1}. {isAnswered(question, questionIndex) ? 'Answered' : 'Not answered'}{marked.includes(question.id) ? ' ★' : ''}</button>)}</div><div className="writing-actions"><button type="button" className="review-button" onClick={() => { setReviewing(false); go(19); }}>Back to the last question</button><button type="button" className="button" onClick={() => { setReviewing(false); submit(); }}>Submit final answers</button></div></main>;

  const isWriting = index === 18; const isSpeaking = index === 19; const options = current ? (shuffled[current.id] || [...current.options]) : [];
  return <main className="shell exam-panel" dir="rtl"><header className="exam-header"><Link className="back-link" href="/levels/A1?lesson=2">← Save and exit</Link><div><div className="eyebrow">Lesson 2 exam</div><h1>Question {index + 1} of 20</h1></div><span>{marked.includes(allQuestions[index].id) ? '★ Review' : ''}</span></header><div className="writing-progress"><span style={{ width: `${((index + 1) / 20) * 100}%` }} /></div>{!isWriting && !isSpeaking && current && <section className="writing-panel"><p className="eyebrow">{current.skill}</p>{current.promptAr && <h2>{current.promptAr}</h2>}{current.promptEn && <p dir="ltr">{current.promptEn}</p>}{current.audioId && <div>{audioButton(current.audioId, 'Listen to the recording')}<p>You can play this recording only twice per attempt. The transcript stays hidden during the exam.</p>{answers[current.id] !== undefined && <p className="writing-tip">Transcript after answering: {manifest.clips.find((clip) => clip.id === current.audioId)?.text}</p>}</div>}<div className="choice-grid">{options.map((option, optionIndex) => <button type="button" className={answers[current.id] === optionIndex ? 'selected' : ''} key={option} onClick={() => answer(optionIndex)}>{option}</button>)}</div>{answers[current.id] !== undefined && <p className="writing-tip">Answer saved. Your result appears only after submission.</p>}</section>}{isWriting && <section className="writing-panel"><p className="eyebrow">Writing · Question 19</p><h2>{lesson02Exam.writingQuestion.promptEn}</h2><Field label="Name / الاسم" value={writing.name} onChange={(v) => setWritingValue('name', v)} /><Field label="Country / البلد" value={writing.country} onChange={(v) => setWritingValue('country', v)} /><Field label="Languages / اللغات" value={writing.languages.join(' و')} onChange={(v) => setWritingValue('languages', v.split(/\s+و\s*/).filter(Boolean))} /><Field label="Study / الدراسة" value={writing.study || ''} onChange={(v) => setWritingValue('study', v)} /><Field label="Place / المكان" value={writing.place || ''} onChange={(v) => setWritingValue('place', v)} /><div className="field-row"><Field label="From / مِن" value={writing.startTime || ''} onChange={(v) => setWritingValue('startTime', v)} /><Field label="To / إِلَى" value={writing.endTime || ''} onChange={(v) => setWritingValue('endTime', v)} /></div><p className="writing-tip">Diacritics are optional. Write your own information; you earn 1/1 when three of four criteria are met.</p></section>}{isSpeaking && <section className="writing-panel"><p className="eyebrow">Speaking · Question 20</p><h2>{lesson02Exam.speakingQuestion.promptAr}</h2><p dir="ltr">{lesson02Exam.speakingQuestion.promptEn}</p>{audioButton('l2-exam-speaking-model', 'Listen to the speaking model')}<div className="recording-box">{recording ? <button type="button" className="record-button recording" onClick={stopRecording}>Stop recording</button> : <button type="button" className="record-button" onClick={startRecording}>{speakingAssessed ? (recordingUrl ? 'Record again' : 'Start recording') : 'Microphone unavailable'}</button>}{recordingUrl && <audio controls preload="metadata" src={recordingUrl} aria-label="Play the recorded speaking answer" />}<textarea dir="rtl" value={speakingAssessed && speakingText !== 'Recorded answer' ? speakingText : ''} onChange={(event) => { setSpeakingText(event.target.value); setSpeakingAssessed(false); }} placeholder="Written alternative: write two Arabic sentences about language and lesson time" /><p>If the microphone is unavailable, use the written alternative. The speaking point is excluded and the percentage is calculated from 19 points.</p></div></section>}<div className="writing-actions"><button type="button" className="review-button" disabled={index === 0} onClick={() => go(index - 1)}>Previous</button><button type="button" className="review-button" onClick={() => setMarked((old) => old.includes(allQuestions[index].id) ? old.filter((id) => id !== allQuestions[index].id) : [...old, allQuestions[index].id])}>Mark for review</button>{index < 19 ? <button type="button" className="button" onClick={() => go(index + 1)}>Next</button> : <><button type="button" className="review-button" onClick={() => setReviewing(true)}>Review answers</button><button type="button" className="button" onClick={() => setReviewing(true)}>Submit exam</button></>}</div>{audioError && <p className="writing-wrong" role="alert">{audioError}</p>}</main>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="field-block"><span dir="ltr">{label}</span><input dir="rtl" value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
