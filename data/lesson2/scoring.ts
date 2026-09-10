import { lesson02Exam, type Skill } from './exam';

const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

export function normalizeBeginnerArabic(value: string): string {
  return value.normalize('NFC').replace(DIACRITICS, '').replace(/ـ/g, '').replace(/[أإآٱ]/g, 'ا').replace(/[،؛؟.!?]/g, ' ').replace(/\s+/g, ' ').trim();
}

export type WritingEvidence = { name: string; country: string; languages: string[]; study?: string; place?: string; startTime?: string; endTime?: string };

export function scoreWriting(e: WritingEvidence) {
  const has = (v?: string) => normalizeBeginnerArabic(v ?? '').length > 0;
  const criteria = {
    name: has(e.name),
    country: has(e.country),
    languages: e.languages.some(has),
    studyOrTime: (has(e.study) && has(e.place)) || (has(e.startTime) && has(e.endTime)),
  };
  const met = Object.values(criteria).filter(Boolean).length;
  return { point: met >= 3 ? 1 : 0, met, total: 4, criteria };
}

export function calculateExamResult(skillPoints: Record<Skill, number>, speakingAssessed = true) {
  const total = Object.values(skillPoints).reduce((sum, value) => sum + value, 0);
  const effectiveMaximum = speakingAssessed ? lesson02Exam.totalPoints : lesson02Exam.totalPoints - 1;
  const percent = Math.round((total / effectiveMaximum) * 100);
  return { total, effectiveMaximum, percent, passed: percent >= lesson02Exam.passingPercent, unlockLessonId: percent >= lesson02Exam.passingPercent ? lesson02Exam.unlockOnPass : null };
}

export function retainHighestScore(previous: number | undefined, current: number): number {
  return Math.max(previous ?? 0, current);
}

