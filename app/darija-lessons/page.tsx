'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { darijaLessons } from '../../data/darija/lessons';
import { userStorage as localStorage } from '../../lib/user-scoped-storage.mjs';

const progressKey = 'darlugha-darija-progress';

export default function DarijaLessonsPage() {
  const [completed, setCompleted] = useState<number[]>([]);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = localStorage.getItem(progressKey);
      if (saved) setCompleted(JSON.parse(saved));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return <main className="shell darija-page"><header className="topbar"><div className="brand"><span className="brand-mark">د</span><span>Dar<span>Lugha</span></span></div><Link className="link" href="/dashboard">لوحة الطالب</Link></header><section className="darija-heading"><div className="eyebrow">مسار الدارجة المغربية</div><h1>تعلم الدارجة المغربية خطوة بخطوة</h1><p>أكمل فيديو الدرس وأجب عن أسئلته لفتح الدرس التالي.</p></section><div className="darija-grid">{darijaLessons.map((lesson, index) => { const unlocked = index === 0 || completed.includes(index); const isDone = completed.includes(lesson.id); return <Link key={lesson.id} className={`darija-lesson ${unlocked ? '' : 'locked'} ${isDone ? 'done' : ''}`} href={unlocked ? `/darija-lessons/${lesson.id}` : '#'} aria-disabled={!unlocked} onClick={(event) => { if (!unlocked) event.preventDefault(); }}><span className="lesson-number">{isDone ? '✓' : lesson.id}</span><div><strong>{lesson.title}</strong><small>{lesson.description}</small></div><span className="lesson-status">{isDone ? 'مكتمل' : unlocked ? 'ابدأ ←' : 'مقفل 🔒'}</span></Link>; })}</div></main>;
}
