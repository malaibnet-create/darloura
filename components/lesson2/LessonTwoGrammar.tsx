'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { lesson02Grammar } from '../../data/lesson2/grammar';
import { lesson02GrammarPractice } from '../../data/lesson2/grammar-practice';
import manifest from '../../data/lesson2/grammar-manifest.json';
import { markLesson2SectionComplete, markLesson2SectionStarted } from '../../lib/lesson2-progress';
import { stableShuffle } from '../../lib/stable-shuffle';
import { userStorage as localStorage } from '../../lib/user-scoped-storage.mjs';
import LessonCompletion from '../learning/LessonCompletion';

type AudioClip = { file: string; text: string };
type AudioMap = Record<string, AudioClip>;
type AudioState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
type GrammarCard = (typeof lesson02Grammar.cards)[number];
type PracticeCards = typeof lesson02GrammarPractice.cards;
type PracticeItem = { [Key in keyof PracticeCards]: PracticeCards[Key][number] }[keyof PracticeCards];
type NounPluralCard = Extract<GrammarCard, { id: 'noun-plurals' }>;
type NounPair = NounPluralCard['soundMasculinePlural'][number] | NounPluralCard['brokenPlurals'][number];

const clips = manifest.clips as AudioMap;
const audioBase = manifest.publicBasePath;
const disabledAudioIds = new Set(['g2-verb-yatakalluna']);
const cardNames: Record<string, string> = {
  'plural-pronouns': 'ضمائر الجمع وتصريف الفعل',
  'noun-plurals': 'المفرد والجمع',
  'plural-agreement': 'مطابقة الجمع',
};
const normalizeArabic = (value: string) => value
  .normalize('NFKC')
  .replace(/[\u064B-\u065F\u0670\u06D6-\u06EDـ]/g, '')
  .replace(/[،,.!?؟]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

export default function LessonTwoGrammar() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [screen, setScreen] = useState<'cards' | 'lesson' | 'results'>('cards');
  const [cardIndex, setCardIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [orderedTokens, setOrderedTokens] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');
  const [itemHadError, setItemHadError] = useState(false);
  const [score, setScore] = useState(0);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [playing, setPlaying] = useState('');
  const [audioState, setAudioState] = useState<AudioState>('idle');
  const [audioError, setAudioError] = useState('');

  useEffect(() => {
    markLesson2SectionStarted('grammar');
    const frame = window.requestAnimationFrame(() => {
      try {
        setStatuses(JSON.parse(localStorage.getItem('darlugha-lesson-2-grammar-status') || '{}'));
      } catch {
        // Invalid local progress should not block the lesson.
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  useEffect(() => () => audio.current?.pause(), []);

  const card: GrammarCard = lesson02Grammar.cards[cardIndex];
  const practiceItems = lesson02GrammarPractice.cards[card.id] as readonly PracticeItem[];
  const item = practiceItems[practiceIndex];
  const percentage = Math.round((score / Math.max(1, practiceItems.length)) * 100);
  const allCardsCompleted = lesson02Grammar.cards.every((entry) => statuses[entry.id] === 'completed');

  useEffect(() => {
    if (screen !== 'lesson') return;
    localStorage.setItem(`darlugha-lesson-2-grammar-${card.id}`, JSON.stringify({ step, practiceIndex, subIndex, score }));
  }, [card.id, practiceIndex, score, screen, step, subIndex]);

  const subCount = useMemo(() => {
    if (!item) return 1;
    if (item.type === 'classify' || item.type === 'fill-choice') return item.items.length || 1;
    if (item.type === 'matching') return item.pairs.length || 1;
    if (item.type === 'audio-choice') return item.source.length;
    return 1;
  }, [item]);

  function audioUrl(id: string) {
    const clip = clips[id];
    return clip ? `${audioBase}/${clip.file.replace(/^audio\//, '')}` : '';
  }

  function play(id: string) {
    if (disabledAudioIds.has(id)) return;
    const src = audioUrl(id);
    if (!src) { setAudioError('This recording is not available.'); return; }
    setAudioError('');
    if (!audio.current) {
      audio.current = new Audio();
      audio.current.preload = 'none';
      audio.current.onended = () => { setPlaying(''); setAudioState('idle'); };
      audio.current.onerror = () => { setAudioState('error'); setAudioError('The recording could not be loaded. Press Retry to try again.'); };
    }
    const player = audio.current;
    if (playing === id) {
      if (player.paused) void player.play().then(() => setAudioState('playing')).catch(() => setAudioState('error'));
      else { player.pause(); setAudioState('paused'); }
      return;
    }
    player.pause();
    player.src = src;
    player.currentTime = 0;
    setPlaying(id);
    setAudioState('loading');
    void player.play().then(() => setAudioState('playing')).catch(() => {
      setAudioState('error');
      setAudioError('The recording could not be played. Press Retry to try again.');
    });
  }

  function audioButton(id: string, label = 'Listen') {
    if (disabledAudioIds.has(id)) return <span className="grammar-audio-disabled" title="This incorrect recording has been disabled">Audio unavailable</span>;
    return <button className="grammar-audio-button" type="button" onClick={() => play(id)} aria-label={`${label}: ${clips[id]?.text || ''}`}>{playing === id && audioState === 'loading' ? 'Loading…' : playing === id && audioState === 'playing' ? 'Pause' : playing === id && audioState === 'paused' ? 'Resume' : `🔊 ${label}`}</button>;
  }

  function start(index: number) {
    const id = lesson02Grammar.cards[index].id;
    const nextStatuses = { ...statuses, [id]: statuses[id] === 'completed' ? 'completed' : 'learning' };
    setStatuses(nextStatuses);
    localStorage.setItem('darlugha-lesson-2-grammar-status', JSON.stringify(nextStatuses));
    let saved: { step?: number; practiceIndex?: number; subIndex?: number; score?: number } = {};
    if (statuses[id] !== 'completed') {
      try { saved = JSON.parse(localStorage.getItem(`darlugha-lesson-2-grammar-${id}`) || '{}'); } catch { /* start from the beginning */ }
    }
    setCardIndex(index); setStep(saved.step ?? 0); setPracticeIndex(saved.practiceIndex ?? 0); setSubIndex(saved.subIndex ?? 0); setAnswer(''); setOrderedTokens([]); setFeedback(''); setItemHadError(false); setScore(saved.score ?? 0); setScreen('lesson');
  }

  function saveCompleted() {
    const nextStatuses: Record<string, string> = { ...statuses, [card.id as string]: 'completed' };
    setStatuses(nextStatuses);
    localStorage.setItem('darlugha-lesson-2-grammar-status', JSON.stringify(nextStatuses));
    if (lesson02Grammar.cards.every((entry) => nextStatuses[entry.id] === 'completed')) markLesson2SectionComplete('grammar');
  }

  function resetResponse() {
    setAnswer(''); setOrderedTokens([]); setFeedback('');
  }

  function check(value: string, correct: string, explanation: string, normalized = false) {
    if (feedback) return;
    const isCorrect = normalized ? normalizeArabic(value) === normalizeArabic(correct) : value === correct;
    setAnswer(value);
    if (!isCorrect) setItemHadError(true);
    setFeedback(isCorrect
      ? `Correct ✓ ${explanation}`
      : `Try again — حاول مرة أخرى. Correct answer: ${correct}. ${explanation}`);
  }

  function advancePractice() {
    if (!feedback.startsWith('Correct')) return;
    if (subIndex < subCount - 1) {
      setSubIndex((value) => value + 1);
      resetResponse();
      return;
    }
    if (!itemHadError) setScore((value) => value + 1);
    if (practiceIndex < practiceItems.length - 1) {
      setPracticeIndex((value) => value + 1);
      setSubIndex(0); setItemHadError(false); resetResponse();
      return;
    }
    setStep(4);
    setSubIndex(0); resetResponse();
  }

  function retry() {
    setFeedback(''); setAnswer(''); setOrderedTokens([]);
  }

  function resetToCards() {
    audio.current?.pause();
    setScreen('cards'); setPlaying(''); setAudioState('idle'); setAudioError('');
  }

  return <main className="shell grammar-page">
    {screen === 'cards' && <>
      <header className="topbar"><Link className="brand" href="/dashboard"><span className="brand-mark">ع</span><span>Dar<span>Lugha</span></span></Link><Link className="link" href="/levels/A1?lesson=2">Back to lesson sections</Link></header>
      <section className="grammar-hero"><div><div className="eyebrow">A1 · Lesson 2</div><h1>Grammar</h1><p>Choose one card. Each card has its full explanation, examples, five practice activities, and an independent result.</p></div></section>
      <section className="grammar-card-grid">{lesson02Grammar.cards.map((entry, entryIndex) => <article className="grammar-card" key={entry.id}><div className="eyebrow">Card {entryIndex + 1}</div><h2>{entry.title.ar}</h2><p dir="ltr">{entry.title.en}</p><p dir="ltr">{entry.estimatedMinutes} minutes · {statuses[entry.id] === 'completed' ? 'Completed' : statuses[entry.id] ? 'Learning' : 'Not started'}</p><button className="button" type="button" onClick={() => start(entryIndex)}>{statuses[entry.id] === 'completed' ? 'Review Lesson' : 'Start Lesson'}</button></article>)}</section>
    </>}

    {screen === 'lesson' && <>
      <header className="topbar"><button className="link" type="button" onClick={resetToCards}>← Grammar cards</button><strong>{cardNames[card.id]}</strong><span>{step + 1} / 5</span></header>
      <div className="reading-progress-bar"><span style={{ width: `${((step + 1) / 5) * 100}%` }} /></div>

      {step === 0 && <section className="grammar-panel"><div className="eyebrow">LEARNING OBJECTIVES</div><h1>{card.title.ar}</h1><p dir="ltr">By the end of this lesson, you can:</p><ul>{card.objectives.map((objective) => <li key={objective} dir="ltr">{objective}</li>)}</ul>{'beginnerLimits' in card && card.beginnerLimits.map((limit) => <p className="grammar-note" dir="ltr" key={limit}>Beginner note: {limit}</p>)}<button className="button" type="button" onClick={() => setStep(1)}>Start discovery →</button></section>}

      {step === 1 && <section className="grammar-panel"><div className="eyebrow">UNGRADED DISCOVERY</div><h2>Notice the forms and listen. This stage is not graded.</h2>
        {card.id === 'plural-pronouns' && <div className="grammar-pronoun-grid">{card.pronouns.map((pronoun) => <article className="grammar-pronoun-card" key={pronoun.slug}><strong>{pronoun.ar}</strong><span dir="ltr">{pronoun.en}</span>{audioButton(pronoun.audioId, 'Pronoun')}</article>)}</div>}
        {card.id === 'noun-plurals' && <div className="grammar-pair-grid">{[...card.soundMasculinePlural, ...card.brokenPlurals].map((pair) => <article className="grammar-pair-card" key={pair.slug}><strong>{pair.singular}</strong><span>←→</span><strong>{pair.plural}</strong>{audioButton(pair.pairAudioId, 'Listen to the pair')}</article>)}</div>}
        {card.id === 'plural-agreement' && <div className="grammar-example-grid">{[...card.humanExamples, ...card.nonhumanExamples].map((example) => <article className="grammar-example" key={example.text}><strong>{example.text}</strong>{audioButton(example.audioId, 'Sentence')}</article>)}</div>}
        <button className="button" type="button" onClick={() => setStep(2)}>Show explanation →</button>
      </section>}

      {step === 2 && <section className="grammar-panel"><div className="eyebrow">EXPLANATION AND ALL EXAMPLES</div>
        {card.id === 'plural-pronouns' && <>
          {card.explanationEn.map((text: string) => <p dir="ltr" key={text}>{text}</p>)}
          <p className="grammar-note" dir="ltr">In this beginner lesson, use أَنْتُمْ and هُمْ for a male or mixed group. The feminine plural forms come later.</p>
          <div className="grammar-conjugation-table"><div className="grammar-conjugation-head"><span>Pronoun</span><span>Present-tense verb</span><span>Audio</span></div>{card.conjugation.map((row) => <div className="grammar-conjugation-row" key={row.pronoun}><button type="button" onClick={() => play(row.pronounAudioId)}>{row.pronoun}</button><strong>{row.verb}</strong><div>{row.pronoun === 'هُمْ' && row.verb === 'يَتَكَلَّمُونَ' ? <span dir="ltr">Audio will be added later</span> : audioButton(row.verbAudioId, row.verb)}</div></div>)}</div>
          <h2>Examples from Lesson 2</h2>{card.examples.map((example) => <div className="grammar-sentence" key={example.text}><span>{example.text}</span>{audioButton(example.audioId, 'Play sentence')}</div>)}
        </>}
        {card.id === 'noun-plurals' && <>
          {card.explanationEn.map((text: string) => <p dir="ltr" key={text}>{text}</p>)}
          <h2>Sound masculine plurals · جَمْعُ الْمُذَكَّرِ السَّالِمُ</h2><p dir="ltr">Some words for male people keep the singular form and add ـُونَ. Focus on recognizing and using this ending.</p><div className="grammar-pair-grid">{card.soundMasculinePlural.map((pair) => <PairCard key={pair.slug} pair={pair} audioButton={audioButton} />)}</div>
          <p className="grammar-note" dir="ltr">You may also hear or see ـِينَ. You do not need to learn the case rule yet.</p>
          <h2>Broken plurals · جُمُوعُ التَّكْسِيرِ</h2><p dir="ltr">The inside pattern changes. Learn every singular and plural together; you do not need to memorize pattern names.</p><div className="grammar-pair-grid">{card.brokenPlurals.map((pair) => <PairCard key={pair.slug} pair={pair} audioButton={audioButton} />)}</div>
        </>}
        {card.id === 'plural-agreement' && <>
          {card.explanationEn.map((text: string) => <p dir="ltr" key={text}>{text}</p>)}
          <div className="agreement-rule human"><h2>Human plural</h2><p dir="ltr">Masculine human plural + masculine plural adjective</p><strong>الْمُتَرْجِمُونَ + مَشْغُولُونَ</strong></div>{card.humanExamples.map((example) => <div className="grammar-sentence" key={example.text}><span>{example.text}</span>{audioButton(example.audioId, 'Play human-plural example')}</div>)}
          <div className="agreement-rule nonhuman"><h2>Nonhuman plural</h2><p dir="ltr">Nonhuman plural + feminine singular adjective</p><strong>الْكُتُبُ + جَدِيدَةٌ</strong></div>{card.nonhumanExamples.map((example) => <div className="grammar-sentence" key={example.text}><span>{example.text}</span>{audioButton(example.audioId, 'Play nonhuman-plural example')}</div>)}
          <p className="grammar-note" dir="ltr">{card.registerNoteEn}</p>
        </>}
        {audioError && <p className="grammar-wrong" role="alert">{audioError} {playing && <button type="button" onClick={() => play(playing)}>Retry</button>}</p>}
        <button className="button" type="button" onClick={() => { setStep(3); setPracticeIndex(0); setSubIndex(0); resetResponse(); }}>Start practice →</button>
      </section>}

      {step === 3 && <Practice
        item={item}
        card={card}
        practiceIndex={practiceIndex}
        total={practiceItems.length}
        subIndex={subIndex}
        subCount={subCount}
        answer={answer}
        orderedTokens={orderedTokens}
        feedback={feedback}
        audioError={audioError}
        audioButton={audioButton}
        check={check}
        setAnswer={setAnswer}
        setOrderedTokens={setOrderedTokens}
        retry={retry}
        next={advancePractice}
      />}

      {step === 4 && <section className="grammar-panel grammar-result"><div className="eyebrow">FINAL CHECK</div><h1>{percentage >= 70 ? 'Card completed' : 'Review this card and try again'}</h1><div className="result-score"><strong>{percentage}%</strong><span>{score}/{practiceItems.length} activities correct on the first attempt</span></div><p dir="ltr">You need 70% (4 of 5 activities) to complete this grammar card.</p><button className="button" type="button" onClick={() => { if (percentage >= 70) saveCompleted(); setScreen('results'); }}>{percentage >= 70 ? 'Save result' : 'See result'}</button></section>}
    </>}

    {screen === 'results' && <LessonCompletion level="A1" lesson={2} section="grammar" passed={percentage >= 70} markCompleted={allCardsCompleted} score={`${cardNames[card.id]} · ${percentage}%`} onRetry={() => start(cardIndex)} grammarRulesRemain={!allCardsCompleted} onBackToRules={resetToCards} />}
  </main>;
}

function PairCard({ pair, audioButton }: { pair: NounPair; audioButton: (id: string, label?: string) => React.ReactNode }) {
  return <article className="grammar-pair-card"><div><strong>{pair.singular}</strong>{audioButton(pair.singularAudioId, 'Singular')}</div><span>←→</span><div><strong>{pair.plural}</strong>{audioButton(pair.pluralAudioId, 'Plural')}</div>{audioButton(pair.pairAudioId, 'Full pair')}</article>;
}

type PracticeProps = {
  item: PracticeItem;
  card: GrammarCard;
  practiceIndex: number;
  total: number;
  subIndex: number;
  subCount: number;
  answer: string;
  orderedTokens: string[];
  feedback: string;
  audioError: string;
  audioButton: (id: string, label?: string) => React.ReactNode;
  check: (value: string, correct: string, explanation: string, normalized?: boolean) => void;
  setAnswer: React.Dispatch<React.SetStateAction<string>>;
  setOrderedTokens: React.Dispatch<React.SetStateAction<string[]>>;
  retry: () => void;
  next: () => void;
};

function Practice({ item, card, practiceIndex, total, subIndex, subCount, answer, orderedTokens, feedback, audioError, audioButton, check, setAnswer, setOrderedTokens, retry, next }: PracticeProps) {
  const isCorrect = feedback.startsWith('Correct');
  const currentPair = item.type === 'matching' ? item.pairs[subIndex] : null;
  const currentClassify = item.type === 'classify' ? item.items[subIndex] : null;
  const currentFill = item.type === 'fill-choice' ? item.items[subIndex] : null;
  const brokenPlurals = card.id === 'noun-plurals' ? card.brokenPlurals : [];
  const audioPair = item.type === 'audio-choice' ? brokenPlurals[subIndex] : null;
  const matchingChoices: string[] = item.type === 'matching' && currentPair
    ? stableShuffle<string>(item.pairs.map((pair) => pair[1]), `${item.id}-${subIndex}`)
    : [];
  const audioDistractors = audioPair ? stableShuffle(
    brokenPlurals.filter((pair) => pair.slug !== audioPair.slug),
    `${item.id}-${subIndex}-distractors`,
  ).slice(0, 2).map((pair) => pair.plural) : [];
  const audioChoices = audioPair ? stableShuffle<string>([audioPair.plural, ...audioDistractors], `${item.id}-${subIndex}`) : [];
  const fillChoices = currentFill ? stableShuffle([currentFill[1], currentFill[1] === 'جَدِيدُونَ' ? 'جَدِيدَةٌ' : 'كَبِيرُونَ'], `${item.id}-${subIndex}`) : [];
  const classifyHuman = item.id === 'pa-1';

  return <section className="grammar-panel grammar-practice-panel"><div className="eyebrow">GUIDED PRACTICE · ACTIVITY {practiceIndex + 1} OF {total}{subCount > 1 ? ` · ITEM ${subIndex + 1} OF ${subCount}` : ''}</div>
    {item.type === 'multiple-choice' && <><h2>{item.prompt}</h2><p dir="ltr">Choose the correct answer.</p><Options options={stableShuffle(item.options, item.id)} answer={answer} disabled={Boolean(feedback)} onChoose={(value) => check(value, item.options[item.answer], item.feedbackEn)} /></>}
    {item.type === 'classify' && currentClassify && <><h2>{currentClassify[0]}</h2><p dir="ltr">{classifyHuman ? 'Is this a human plural or a nonhuman plural?' : 'Is this noun singular or plural?'}</p><Options options={classifyHuman ? ['human', 'nonhuman'] : ['singular', 'plural']} answer={answer} disabled={Boolean(feedback)} labels={classifyHuman ? { human: 'Human plural · جمع عاقل', nonhuman: 'Nonhuman plural · جمع غير عاقل' } : { singular: 'Singular · مفرد', plural: 'Plural · جمع' }} onChoose={(value) => check(value, currentClassify[1], classifyHuman ? 'Identify whether the word refers to people.' : 'Identify whether the noun names one or more than two.')} /></>}
    {item.type === 'matching' && currentPair && <><h2>{item.id === 'pp-3' ? 'Match each pronoun with its verb.' : item.id === 'np-2' ? 'Match each singular noun with its sound masculine plural.' : 'Match each singular noun with its broken plural.'}</h2><p dir="ltr">Choose the form that completes this pair. The activity checks every pair one by one.</p><div className="grammar-match-prompt"><strong>{currentPair[0]}</strong><span>↔</span><strong>؟</strong></div><Options options={matchingChoices} answer={answer} disabled={Boolean(feedback)} onChoose={(value) => check(value, currentPair[1], `The matching pair is ${currentPair[0]} — ${currentPair[1]}.`)} /></>}
    {item.type === 'transform' && <><h2>Change the singular sentence to the plural.</h2><p className="grammar-sentence">{item.prompt}</p><p dir="ltr">Change both the subject pronoun and the verb. Diacritics are optional.</p><textarea value={answer} disabled={Boolean(feedback)} onChange={(event) => setAnswer(event.target.value)} placeholder="Write the complete plural sentence…" /><button className="button" type="button" disabled={!answer.trim() || Boolean(feedback)} onClick={() => check(answer, item.answerText, 'The subject and the verb are both plural.', true)}>Check sentence</button></>}
    {item.type === 'ordering' && <><h2>Put the words in the correct order.</h2><p dir="ltr">Build one complete sentence. You can reset the order before checking.</p><div className="reading-options">{item.tokens.map((token: string) => <button type="button" key={token} disabled={orderedTokens.includes(token) || Boolean(feedback)} onClick={() => setOrderedTokens((tokens: string[]) => [...tokens, token])}>{token}</button>)}</div><p className="grammar-sentence">{orderedTokens.join(' ') || '…'}</p><button className="review-button" type="button" disabled={!orderedTokens.length || Boolean(feedback)} onClick={() => setOrderedTokens([])}>Reset order</button><button className="button" type="button" disabled={orderedTokens.length !== item.tokens.length || Boolean(feedback)} onClick={() => check(orderedTokens.join(' '), item.answer.join(' '), 'The subject comes before the verb.', true)}>Check order</button></>}
    {item.type === 'audio-choice' && audioPair && <><h2>Listen to the singular noun and choose its plural.</h2><p dir="ltr">This memory activity checks all eight broken-plural pairs.</p>{audioButton(item.source[subIndex], 'Play singular noun')}<Options options={audioChoices} answer={answer} disabled={Boolean(feedback)} onChoose={(value) => check(value, audioPair.plural, `${audioPair.singular} has the plural ${audioPair.plural}.`)} /></>}
    {item.type === 'fill-choice' && currentFill && <><h2>Choose the adjective that correctly completes the sentence.</h2><p className="grammar-sentence">{currentFill[0]}</p><p dir="ltr">Use a plural adjective for a human plural and a feminine singular adjective for a nonhuman plural.</p><Options options={fillChoices} answer={answer} disabled={Boolean(feedback)} onChoose={(value) => check(value, currentFill[1], `The complete sentence uses ${currentFill[1]}.`)} /></>}
    {item.type === 'true-false-correct' && <><h2>Is this sentence correct?</h2><p className="grammar-sentence">{item.prompt}</p><Options options={['true', 'false']} answer={answer} disabled={Boolean(feedback)} labels={{ true: 'True · صحيح', false: 'False · خطأ' }} onChoose={(value) => check(value, item.answer ? 'true' : 'false', `Correction: ${item.correction}`)} /></>}
    {audioError && <p className="grammar-wrong" role="alert">{audioError}</p>}
    {feedback && <p className={isCorrect ? 'grammar-correct' : 'grammar-wrong'}>{feedback}</p>}
    {feedback && !isCorrect && <button className="review-button" type="button" onClick={retry}>Try Again</button>}
    {isCorrect && <button className="button" type="button" onClick={next}>{practiceIndex === total - 1 && subIndex === subCount - 1 ? 'Show final result →' : 'Next →'}</button>}
  </section>;
}

function Options({ options, answer, disabled, labels, onChoose }: { options: readonly string[]; answer: string; disabled: boolean; labels?: Record<string, string>; onChoose: (value: string) => void }) {
  return <div className="reading-options">{options.map((option) => <button type="button" className={answer === option ? 'selected' : ''} disabled={disabled} key={option} onClick={() => onChoose(option)}>{labels?.[option] || option}</button>)}</div>;
}
