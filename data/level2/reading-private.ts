import 'server-only';

import lesson from './lesson-01-reading-source/lesson.json';
import reading from './lesson-01-reading-source/reading.json';
import exercises from './lesson-01-reading-source/exercises.json';
import audioManifest from './lesson-01-reading-source/audio-manifest.json';
import vocabulary from './lesson-01-vocabulary-source/vocabulary.json';

export const levelTwoLessonOneReadingPrivate = {
  lesson,
  reading,
  exercises,
  audioManifest,
  vocabulary,
} as const;
