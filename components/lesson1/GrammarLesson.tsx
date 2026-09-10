'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { audio, grammarContent, grammarRules, ruleOneQuestions, ruleTwoQuestions, type GrammarQuestion } from '../../data/lesson1/grammar';
import LessonCompletion from '../learning/LessonCompletion';
import { markSectionStarted } from '../../lib/learning-progress';
import { userStorage as localStorage } from '../../lib/user-scoped-storage.mjs';

type RuleKey = 'grammar-01' | 'grammar-02';

export default function GrammarLesson({ ruleId }: { ruleId?: string }) {
  const [selected, setSelected] = useState<RuleKey | ''>((ruleId === 'grammar-01' || ruleId === 'grammar-02') ? ruleId : '');
  const [stage, setStage] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [completedRules, setCompletedRules] = useState<RuleKey[]>([]);
  const player = useRef<HTMLAudioElement | null>(null);
  const key = selected === 'grammar-02' ? 'two' : 'one';
  const content = grammarContent[key];
  const questions = (selected === 'grammar-02' ? ruleTwoQuestions : ruleOneQuestions) as readonly GrammarQuestion[];
  const totalStages = 1 + content.sections.length + questions.length + 1;
  const isExercise = selected !== '' && stage > content.sections.length && stage < totalStages - 1;
  const questionIndex = stage - content.sections.length - 1;
  const progressKey = selected ? `darlugha-${selected}-progress` : '';

  useEffect(() => {
    markSectionStarted('A1', 1, 'grammar');
    const frame = window.requestAnimationFrame(() => {
      try { setCompletedRules(JSON.parse(localStorage.getItem('darlugha-a1-lesson-1-grammar-rules') || '[]')); } catch { /* fresh rule progress */ }
    });
    return () => { window.cancelAnimationFrame(frame); player.current?.pause(); };
  }, []);
  useEffect(() => {
    if (!selected) return;
    const frame = window.requestAnimationFrame(() => {
      const saved = localStorage.getItem(progressKey);
      if (!saved) return;
      try { const value = JSON.parse(saved); if (typeof value.stage === 'number') setStage(Math.min(value.stage, totalStages - 1)); if (typeof value.score === 'number') setScore(value.score); } catch { /* ignore invalid local progress */ }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selected, progressKey, totalStages]);
  useEffect(() => { if (selected) localStorage.setItem(progressKey, JSON.stringify({ stage, score, completed: stage === totalStages - 1 })); }, [selected, progressKey, stage, score, totalStages]);

  function play(id: string) {
    const url = audio(id); if (!url) return;
    if (!player.current) { player.current = new Audio(); player.current.preload = 'none'; }
    player.current.pause(); player.current.currentTime = 0; player.current.src = url;
    void player.current.play().catch(() => setFeedback('The audio could not be played. Please try again.'));
  }
  function choose(value: string, question: GrammarQuestion) {
    if (feedback) return;
    setAnswer(value);
    if (value === question.answer) { setScore(n => n + 1); setFeedback(`Correct ✓ ${question.explanation}`); }
    else setFeedback(`Not quite. The correct answer is: ${question.answer}. ${question.explanation}`);
  }
  function next() { setFeedback(''); setAnswer(''); setStage(n => Math.min(n + 1, totalStages - 1)); }
  function resetRule() { setStage(0); setScore(0); setAnswer(''); setFeedback(''); if (selected) localStorage.removeItem(`darlugha-${selected}-progress`); }

  if (!selected) return <main className="grammar-page"><header className="grammar-head"><Link className="back-link" href="/levels/A1?lesson=1">← Lesson sections</Link><div className="eyebrow">A1 · Lesson 1</div><h1>القواعد <span dir="ltr">Grammar</span></h1><p dir="ltr">Choose a grammar rule. Complete both rules to finish the Grammar section.</p></header><div className="grammar-cards">{grammarRules.map(item => { const saved = typeof window !== 'undefined' && Boolean(localStorage.getItem(`darlugha-${item.id}-progress`)); const complete = completedRules.includes(item.id as RuleKey); return <article className="grammar-card" key={item.id}><div className="grammar-icon">◈</div><h2>{item.title}</h2><p dir="ltr">{item.english}</p><p>{item.description}</p><small dir="ltr">Duration: {item.duration}</small><div className="grammar-status">{complete ? 'Completed ✓' : saved ? 'In progress' : 'Not started'}</div><button className="button" onClick={() => { setSelected(item.id as RuleKey); setStage(0); }}>{saved ? 'Review lesson' : 'Start lesson'}</button></article>; })}</div></main>;

  const rule = grammarRules.find(item => item.id === selected);
  if (stage === totalStages - 1) {
    const passed = score / questions.length >= .7;
    const ruleSet = passed && selected && !completedRules.includes(selected) ? [...completedRules, selected] : completedRules;
    if (passed && selected && ruleSet.length !== completedRules.length) {
      localStorage.setItem('darlugha-a1-lesson-1-grammar-rules', JSON.stringify(ruleSet));
      queueMicrotask(() => setCompletedRules(ruleSet));
    }
    const rulesRemain = ruleSet.length < grammarRules.length;
    return <main className="grammar-page"><LessonCompletion level="A1" lesson={1} section="grammar" passed={passed} markCompleted={passed && !rulesRemain} score={`${Math.round(score / questions.length * 100)}% · ${score}/${questions.length} correct`} onRetry={resetRule} grammarRulesRemain={rulesRemain} onBackToRules={() => setSelected('')} /></main>;
  }

  const section = stage > 0 && stage <= content.sections.length ? content.sections[stage - 1] : null;
  const question = isExercise ? questions[questionIndex] : null;
  return <main className="grammar-page"><header className="grammar-head"><button className="back-link" onClick={() => setSelected('')}>← Grammar rules</button><div className="eyebrow" dir="ltr">{rule?.duration} · Part {stage + 1} of {totalStages}</div><h1>{rule?.title}</h1><p dir="ltr">{rule?.english}</p><div className="grammar-progress"><span style={{ width: `${Math.round((stage / (totalStages - 1)) * 100)}%` }} /></div></header><section className="grammar-panel">
    {stage === 0 && <><h2 dir="ltr">By the end of this lesson, you can:</h2><ul dir="ltr" className="grammar-ltr">{content.objectives.map(item => <li key={item}>{item}</li>)}</ul><p className="grammar-tip" dir="ltr">Work through the explanation, examples, audio, and practice one step at a time.</p></>}
    {section && <><h2>{section.title}</h2><p dir="ltr" className="grammar-ltr">{section.explanation}</p>{section.table.length > 0 && <div className="grammar-data-table">{section.table.map((row, i) => <div className={i === 0 ? 'table-row table-head' : 'table-row'} key={`${row.join('-')}-${i}`}>{row.map(cell => <span dir={/[A-Za-z]/.test(cell) ? 'ltr' : 'rtl'} key={cell}>{cell}</span>)}</div>)}</div>}{section.examples.length > 0 && <div className="grammar-examples">{section.examples.map(([text, id]) => <button key={`${text}-${id}`} onClick={() => play(id)} aria-label={`استمع إلى ${text}`}>{text} <span aria-hidden="true">🔊</span></button>)}</div>}{'tip' in section && section.tip && <p className="grammar-tip">{section.tip}</p>}</>}
    {question && <><div className="eyebrow" dir="ltr">Practice {questionIndex + 1} of {questions.length}</div><h2>{question.prompt}</h2><div className="grammar-options">{question.choices.map(item => <button className={answer === item ? 'selected' : ''} onClick={() => choose(item, question)} key={item}>{item}</button>)}</div>{feedback && <p dir="ltr" className={answer === question.answer ? 'grammar-correct' : 'grammar-wrong'}>{feedback}</p>}</>}
  </section><div className="grammar-actions"><button className="review-button" onClick={() => { setFeedback(''); setAnswer(''); setStage(n => Math.max(0, n - 1)); }}>← Previous</button><button className="button" disabled={Boolean(isExercise && !feedback)} onClick={next}>{stage === totalStages - 2 ? 'View result' : 'Next →'}</button></div></main>;
}
