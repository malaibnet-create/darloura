import 'server-only';

import { createHash } from 'node:crypto';
import { darijaLessons } from '../../data/darija/lessons';
import { lessonOneVocabulary } from '../../data/lesson1/vocabulary';
import { readingContent as lessonOneReading } from '../../data/lesson1/reading';
import { listeningContent as lessonOneListening } from '../../data/lesson1/listening';
import { grammarContent as lessonOneGrammar, grammarRules as lessonOneGrammarRules } from '../../data/lesson1/grammar';
import { speakingClips as lessonOneSpeaking, speakingQuestions as lessonOneSpeakingQuestions } from '../../data/lesson1/speaking';
import { lessonTwoVocabulary } from '../../data/lesson2/vocabulary';
import { lessonTwoReading } from '../../data/lesson2/reading';
import { lesson02Listening } from '../../data/lesson2/listening';
import { lesson02Grammar } from '../../data/lesson2/grammar';
import { lesson02Conversation } from '../../data/lesson2/conversation';
import levelTwoLesson from '../../data/level2/lesson-01-vocabulary-source/lesson.json';
import levelTwoVocabulary from '../../data/level2/lesson-01-vocabulary-source/vocabulary.json';
import levelTwoReadingLesson from '../../data/level2/lesson-01-reading-source/lesson.json';
import levelTwoReading from '../../data/level2/lesson-01-reading-source/reading.json';
import levelTwoListeningLesson from '../../data/level2/lesson-01-listening-source/lesson.json';
import levelTwoListening from '../../data/level2/lesson-01-listening-source/listening.json';
import levelTwoGrammarLesson from '../../data/level2/lesson-01-grammar-source/lesson.json';
import levelTwoGrammarRules from '../../data/level2/lesson-01-grammar-source/rules.json';
import { levelThreeVocabularyLesson } from '../../data/level3/vocabulary';
import { level03Lesson01Reading } from '../../data/level3/reading';
import { listeningLesson as levelThreeListening } from '../../data/level3/listening';
import { grammarLesson as levelThreeGrammar } from '../../data/level3/grammar';
import { level03Lesson01Phrases } from '../../data/level3/phrases';
import { conversationRoom as levelThreeConversation } from '../../data/level3/conversation-room';
import type { CurriculumItem, CurriculumKind, TutorActivity, TutorLevel, TutorTrack } from './types';

type LessonSource = {
  id: string;
  level: TutorLevel;
  lesson: number;
  titleAr: string;
  titleEn: string;
  track: TutorTrack;
  sections: Array<{ kind: CurriculumKind; source: string; value: unknown }>;
};

const SOURCES: LessonSource[] = [
  {
    id: 'A1-1', level: 'A1', lesson: 1, titleAr: 'التحية والتعارف', titleEn: 'Greetings and introductions', track: 'msa',
    sections: [
      { kind: 'vocabulary', source: 'data/lesson1/vocabulary.ts', value: lessonOneVocabulary },
      { kind: 'reading', source: 'data/lesson1/reading.ts', value: lessonOneReading },
      { kind: 'listening', source: 'data/lesson1/listening.ts', value: lessonOneListening },
      { kind: 'grammar', source: 'data/lesson1/grammar.ts', value: { content: lessonOneGrammar, rules: lessonOneGrammarRules } },
      { kind: 'conversation', source: 'data/lesson1/speaking.ts', value: { clips: lessonOneSpeaking, questions: lessonOneSpeakingQuestions } },
    ],
  },
  {
    id: 'A1-2', level: 'A1', lesson: 2, titleAr: 'الأسرة والعمل واللغات', titleEn: 'Family, work, and languages', track: 'msa',
    sections: [
      { kind: 'vocabulary', source: 'data/lesson2/vocabulary.ts', value: lessonTwoVocabulary },
      { kind: 'reading', source: 'data/lesson2/reading.ts', value: lessonTwoReading },
      { kind: 'listening', source: 'data/lesson2/listening.ts', value: lesson02Listening },
      { kind: 'grammar', source: 'data/lesson2/grammar.ts', value: lesson02Grammar },
      { kind: 'conversation', source: 'data/lesson2/conversation.ts', value: lesson02Conversation },
    ],
  },
  {
    id: 'A2-1', level: 'A2', lesson: 1, titleAr: String(levelTwoLesson.titleAr), titleEn: String(levelTwoLesson.titleEn), track: 'msa',
    sections: [
      { kind: 'objective', source: 'data/level2/lesson-01-vocabulary-source/lesson.json', value: levelTwoLesson },
      { kind: 'vocabulary', source: 'data/level2/lesson-01-vocabulary-source/vocabulary.json', value: levelTwoVocabulary },
      { kind: 'reading', source: 'data/level2/lesson-01-reading-source/reading.json', value: { lesson: levelTwoReadingLesson, reading: levelTwoReading } },
      { kind: 'listening', source: 'data/level2/lesson-01-listening-source/listening.json', value: { lesson: levelTwoListeningLesson, listening: levelTwoListening } },
      { kind: 'grammar', source: 'data/level2/lesson-01-grammar-source/rules.json', value: { lesson: levelTwoGrammarLesson, rules: levelTwoGrammarRules } },
    ],
  },
  {
    id: 'B1-1', level: 'B1', lesson: 1, titleAr: 'الاعتراف بالخطأ فضيلة', titleEn: 'Admitting a mistake is a virtue', track: 'msa',
    sections: [
      { kind: 'vocabulary', source: 'data/level3/vocabulary.ts', value: levelThreeVocabularyLesson },
      { kind: 'reading', source: 'data/level3/reading.ts', value: level03Lesson01Reading },
      { kind: 'listening', source: 'data/level3/listening.ts', value: levelThreeListening },
      { kind: 'grammar', source: 'data/level3/grammar.ts', value: levelThreeGrammar },
      { kind: 'phrase', source: 'data/level3/phrases.ts', value: level03Lesson01Phrases },
      { kind: 'conversation', source: 'data/level3/conversation-room.ts', value: levelThreeConversation },
    ],
  },
  {
    id: 'DAR-1', level: 'A1', lesson: 1, titleAr: 'الدارجة المغربية: البداية', titleEn: 'Moroccan Darija: getting started', track: 'moroccan_darija',
    sections: [{ kind: 'conversation', source: 'data/darija/lessons.ts', value: darijaLessons.slice(0, 4) }],
  },
];

const ARABIC_KEYS = /(^ar$|arabic|textar|displayar|titlear|word|example|phrasear|headwordar|promptar|objectivear|explanationar|purposear|formulaar|correct|answer)/i;
const ENGLISH_KEYS = /(^en$|english|texten|titleen|meaning|translation|prompten|objectiveen|explanationen|purposeen|formulaen)/i;
const AUDIO_KEYS = /(audio|audiourl|path)$/i;

function textValues(record: Record<string, unknown>, matcher: RegExp) {
  return Object.entries(record)
    .filter(([key, value]) => matcher.test(key) && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'))
    .map(([, value]) => String(value).trim())
    .filter(Boolean);
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function stableId(lessonId: string, kind: CurriculumKind, path: string, explicit?: unknown) {
  if (typeof explicit === 'string' || typeof explicit === 'number') return `${lessonId}:${kind}:${String(explicit)}`;
  return `${lessonId}:${kind}:${createHash('sha1').update(path).digest('hex').slice(0, 10)}`;
}

function collectItems(source: LessonSource, section: LessonSource['sections'][number]) {
  const items: CurriculumItem[] = [];
  const visit = (value: unknown, path: string, depth: number) => {
    if (depth > 8 || value == null) return;
    if (Array.isArray(value)) {
      value.forEach((entry, index) => visit(entry, `${path}.${index}`, depth + 1));
      return;
    }
    if (typeof value !== 'object') return;
    const record = value as Record<string, unknown>;
    const ar = unique(textValues(record, ARABIC_KEYS));
    const en = unique(textValues(record, ENGLISH_KEYS));
    const hasUsefulText = ar.some((text) => /[\u0600-\u06ff]/u.test(text)) || en.some((text) => text.length > 2);
    if (hasUsefulText) {
      const titleAr = ar.find((text) => /[\u0600-\u06ff]/u.test(text)) || source.titleAr;
      const titleEn = en.find((text) => /[A-Za-z]/.test(text));
      const audioUrl = Object.entries(record).find(([key, entry]) => AUDIO_KEYS.test(key) && typeof entry === 'string')?.[1];
      items.push({
        id: stableId(source.id, section.kind, path, record.id ?? record.slug),
        lessonId: source.id,
        level: source.level,
        kind: section.kind,
        titleAr: titleAr.slice(0, 180),
        titleEn: titleEn?.slice(0, 180),
        arabic: ar.join(' | ').slice(0, 1200),
        english: en.join(' | ').slice(0, 900) || undefined,
        audioUrl: typeof audioUrl === 'string' ? audioUrl : undefined,
        difficulty: source.level,
        source: section.source,
      });
    }
    Object.entries(record).forEach(([key, entry]) => {
      if (typeof entry === 'object' && entry !== null) visit(entry, `${path}.${key}`, depth + 1);
    });
  };
  visit(section.value, section.kind, 0);
  return items;
}

const INDEX = SOURCES.flatMap((source) => source.sections.flatMap((section) => collectItems(source, section)));

const MODE_KINDS: Record<TutorActivity, CurriculumKind[]> = {
  lesson_review: ['objective', 'vocabulary', 'reading', 'listening', 'grammar', 'phrase', 'conversation', 'exercise'],
  vocabulary: ['vocabulary', 'phrase'],
  free_conversation: ['conversation', 'vocabulary', 'phrase', 'reading', 'listening'],
  role_play: ['conversation', 'vocabulary', 'phrase'],
  grammar: ['grammar', 'exercise'],
  pronunciation: ['vocabulary', 'phrase', 'conversation'],
};

export function listCurriculumLessons(track: TutorTrack = 'msa') {
  return SOURCES.filter((source) => source.track === track).map(({ id, level, lesson, titleAr, titleEn }) => ({ id, level, lesson, titleAr, titleEn }));
}

export function retrieveCurriculum(input: {
  level: TutorLevel;
  track: TutorTrack;
  activity: TutorActivity;
  lessonIds?: string[];
  query?: string;
  limit?: number;
}) {
  const limit = Math.min(Math.max(input.limit ?? 18, 4), 30);
  const allowedKinds = MODE_KINDS[input.activity];
  const preferredLessons = new Set(input.lessonIds?.filter(Boolean) || []);
  const terms = (input.query || '').toLocaleLowerCase('ar').split(/[\s،,]+/u).filter((term) => term.length > 1).slice(0, 8);
  const trackLessons = new Set(SOURCES.filter((source) => source.track === input.track).map((source) => source.id));

  return INDEX
    .filter((item) => trackLessons.has(item.lessonId) && allowedKinds.includes(item.kind))
    .map((item) => {
      const haystack = `${item.titleAr} ${item.titleEn || ''} ${item.arabic} ${item.english || ''}`.toLocaleLowerCase('ar');
      let score = item.level === input.level ? 8 : 0;
      if (preferredLessons.has(item.lessonId)) score += 24;
      if (allowedKinds[0] === item.kind) score += 5;
      for (const term of terms) if (haystack.includes(term)) score += 10;
      return { item, score };
    })
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
    .slice(0, limit)
    .map(({ item }) => item);
}

export function getCurriculumItemIdsForLesson(lessonId: string, kind?: CurriculumKind) {
  return INDEX.filter((item) => item.lessonId === lessonId && (!kind || item.kind === kind)).map((item) => item.id);
}
