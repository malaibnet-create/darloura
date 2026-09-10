export type WritingDraft = {
  name: string;
  country: string;
  languages: string[];
  studySubject: string;
  studyPlace: string;
  day?: string;
  startTime: string;
  endTime: string;
};

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

export function normalizeBeginnerArabic(value: string): string {
  return value
    .normalize('NFC')
    .replace(ARABIC_DIACRITICS, '')
    .replace(/ـ/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[،؛؟.!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const hasValue = (value: string | undefined) => normalizeBeginnerArabic(value ?? '').length > 0;

export function buildWritingCard(draft: WritingDraft): string[] {
  const languages = draft.languages.filter(hasValue).join(' وَ');
  const day = hasValue(draft.day) ? ` ${draft.day}` : '';
  return [
    `اِسْمِي ${draft.name}.`,
    `أَنَا مِنْ ${draft.country}.`,
    `أَتَكَلَّمُ ${languages}.`,
    `أَدْرُسُ ${draft.studySubject} فِي ${draft.studyPlace}.`,
    `دَرْسِي${day} مِنَ ${draft.startTime} إِلَى ${draft.endTime}.`,
  ];
}

export function evaluateWritingDraft(draft: WritingDraft) {
  const criteria = {
    name: hasValue(draft.name),
    country: hasValue(draft.country),
    languages: draft.languages.some(hasValue),
    study: hasValue(draft.studySubject) && hasValue(draft.studyPlace),
    time: hasValue(draft.startTime) && hasValue(draft.endTime),
  };
  const points = Object.values(criteria).filter(Boolean).length;
  return { criteria, points, total: 5, passed: points >= 4 };
}
