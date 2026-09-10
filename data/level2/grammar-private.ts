import 'server-only';

import lesson from './lesson-01-grammar-source/lesson.json';
import rules from './lesson-01-grammar-source/rules.json';
import examples from './lesson-01-grammar-source/examples.json';
import exercises from './lesson-01-grammar-source/exercises.json';
import audioManifest from './lesson-01-grammar-source/audio-manifest.json';

export const levelTwoLessonOneGrammarPrivate = {
  lesson,
  rules,
  examples,
  exercises,
  audioManifest,
} as const;
