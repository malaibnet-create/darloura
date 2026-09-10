'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { writingCountries, writingModels, writingNisba, writingOrders } from '../../data/lesson1/writing';
import { userStorage as localStorage } from '../../lib/user-scoped-storage.mjs';

const strip = (value: string) => value
  .normalize('NFD')
  .replace(/[\u064B-\u065F\u0670]/g, '')
  .replace(/[.؟!?]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

export default function WritingLesson() {
  const [stage, setStage] = useState(0);
  const [order, setOrder] = useState<string[]>([]);
  const [orderIndex, setOrderIndex] = useState(0);
  const [orderFeedback, setOrderFeedback] = useState('');
  const [country, setCountry] = useState('الْمَغْرِبِ');
  const [nisba, setNisba] = useState('مَغْرِبِيٌّ');
  const [student, setStudent] = useState('طَالِبٌ');
  const [name, setName] = useState('آدَمُ');
  const [writingFeedback, setWritingFeedback] = useState('');

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = localStorage.getItem('darlugha-lesson-1-writing');
      if (!saved) return;
      try {
        const value = JSON.parse(saved);
        setStage(value.stage || 0);
        setName(value.name || 'آدَمُ');
        setCountry(value.country || 'الْمَغْرِبِ');
        setNisba(value.nisba || 'مَغْرِبِيٌّ');
        setStudent(value.student || 'طَالِبٌ');
      } catch { /* Ignore an invalid local draft. */ }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    localStorage.setItem('darlugha-lesson-1-writing', JSON.stringify({ stage, name, country, nisba, student }));
  }, [stage, name, country, nisba, student]);

  function chooseWord(word: string) {
    setOrder((current) => current.includes(word) ? current : [...current, word]);
    setOrderFeedback('');
  }

  function checkOrder() {
    const expected = strip(writingOrders[orderIndex].answer);
    if (strip(order.join(' ')) === expected) setOrderFeedback('صحيح ✓ Correct');
    else setOrderFeedback(`حاول مرة أخرى. Start with أَنَا. الجملة الصحيحة: ${writingOrders[orderIndex].answer}`);
  }

  function next() {
    setOrder([]);
    setOrderFeedback('');
    if (stage === 1 && orderIndex < 3) setOrderIndex((current) => current + 1);
    else setStage((current) => Math.min(4, current + 1));
  }

  const lines = [
    `اسْمِي ${name}.`,
    `أَنَا مِنَ ${country}.`,
    `أَنَا ${nisba}.`,
    `أَنَا ${student}.`,
  ];

  return <main className="writing-page">
    <header className="writing-head">
      <Link className="back-link" href="/lessons/1">← عناصر الدرس</Link>
      <div className="eyebrow">المستوى A1 · الدرس الأول</div>
      <h1>أَكْتُبُ بِطَاقَةَ تَعَارُفٍ</h1>
      <p dir="ltr">Write a Self-Introduction Card · 5–8 minutes</p>
      <div className="writing-progress"><span style={{ width: `${(stage + 1) * 20}%` }} /></div>
    </header>

    {stage === 0 && <section className="writing-panel">
      <h2>اقرأ النموذج – Read the Model</h2>
      {writingModels.map((model, index) => <article className="writing-model" key={model.name}>
        <h3>النموذج {index + 1}</h3>
        <p>اسْمِي {model.name}.</p>
        <p>أَنَا مِنَ {model.from}.</p>
        <p className="changing">أَنَا {model.nisba}.</p>
        <p className="changing">أَنَا {model.student}.</p>
        <div dir="ltr">{model.english.map((text) => <div key={text}>{text}</div>)}</div>
      </article>)}
      <p className="writing-tip" dir="ltr">Use the masculine form for a male and the feminine form for a female.</p>
      <button className="button" type="button" onClick={() => setStage(1)}>التالي ←</button>
    </section>}

    {stage === 1 && <section className="writing-panel">
      <h2>رتّب الجملة – Arrange the Sentence</h2>
      <div className="eyebrow">السؤال {orderIndex + 1} من 4</div>
      <p className="writing-sentence">{order.join(' ') || 'اضغط الكلمات بالترتيب الصحيح'}</p>
      <div className="writing-word-bank">{writingOrders[orderIndex].words.map((word) => <button type="button" key={word} onClick={() => chooseWord(word)}>{word}</button>)}</div>
      <div className="writing-actions">
        <button className="review-button" type="button" onClick={() => setOrder((current) => current.slice(0, -1))}>إزالة آخر كلمة</button>
        <button className="review-button" type="button" onClick={() => { setOrder([]); setOrderFeedback(''); }}>ابدأ من جديد – Reset</button>
        <button className="button" type="button" onClick={checkOrder}>تحقق – Check</button>
      </div>
      {orderFeedback && <p className={orderFeedback.startsWith('صحيح') ? 'writing-correct' : 'writing-wrong'}>{orderFeedback}</p>}
      {orderFeedback.startsWith('صحيح') && <button className="button" type="button" onClick={next}>التالي ←</button>}
    </section>}

    {stage === 2 && <section className="writing-panel">
      <h2>أكمل الجملة – Complete the Sentence</h2>
      <label>اسْمِي <input value={name} onChange={(event) => setName(event.target.value)} />.</label>
      <div className="writing-choice"><p>أَنَا مِنَ ________.</p>{writingCountries.map((value) => <button type="button" className={country === value ? 'selected' : ''} onClick={() => setCountry(value)} key={value}>{value}</button>)}</div>
      <div className="writing-choice"><p>أَنَا ________.</p>{writingNisba.map((value) => <button type="button" className={nisba === value ? 'selected' : ''} onClick={() => setNisba(value)} key={value}>{value}</button>)}</div>
      <div className="writing-choice"><p>Choose the form you want to practise.</p>{['طَالِبٌ', 'طَالِبَةٌ'].map((value) => <button type="button" className={student === value ? 'selected' : ''} onClick={() => setStudent(value)} key={value}>{value}</button>)}</div>
      <button className="button" type="button" onClick={() => setStage(3)}>أنشئ بطاقتي ←</button>
    </section>}

    {stage === 3 && <section className="writing-panel">
      <h2>أنشئ بطاقتك – Create Your Card</h2>
      <p>يمكنك تعديل كل جملة:</p>
      {lines.map((line, index) => <input className="writing-line-input" key={index} value={line} onChange={(event) => {
        const value = event.target.value;
        if (index === 0) setName(value.replace(/^اسْمِي\s*/, '').replace(/[.。]$/, ''));
        if (index === 1) setCountry(value.replace(/^أَنَا مِنَ\s*/, '').replace(/[.。]$/, ''));
        if (index === 2) setNisba(value.replace(/^أَنَا\s*/, '').replace(/[.。]$/, ''));
        if (index === 3) setStudent(value.replace(/^أَنَا\s*/, '').replace(/[.。]$/, ''));
      }} />)}
      <div className="writing-word-bank">{['اسْمِي', 'أَنَا', 'مِنَ', 'الْمَغْرِبِ', 'أَمْرِيكَا', 'فَرَنْسَا', 'مَغْرِبِيٌّ', 'مَغْرِبِيَّةٌ', 'طَالِبٌ', 'طَالِبَةٌ'].map((value) => <button type="button" key={value} onClick={() => setWritingFeedback(value)}> {value} </button>)}</div>
      {writingFeedback && <p>الكلمة المختارة: {writingFeedback}</p>}
      <button className="button" type="button" onClick={() => { setWritingFeedback(''); setStage(4); }}>تحقق من كتابتي – Check My Writing</button>
    </section>}

    {stage === 4 && <section className="writing-panel writing-final">
      <h2>بطاقة التعارف الخاصة بك</h2>
      {lines.map((line) => <p key={line}>{line}</p>)}
      <p dir="ltr">Great work! You wrote a short introduction in Arabic.</p>
      <button className="button" type="button" onClick={() => setStage(3)}>عدّل بطاقتي – Edit My Card</button>
      <button className="review-button" type="button" onClick={() => { setStage(0); setOrderIndex(0); }}>أعد النشاط – Try Again</button>
      <Link className="review-button" href="/lessons/1">العودة إلى الدرس</Link>
    </section>}
  </main>;
}
