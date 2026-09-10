import 'server-only';

import lesson from './lesson-01-listening-source/lesson.json';
import listening from './lesson-01-listening-source/listening.json';
import exercises from './lesson-01-listening-source/exercises.json';
import audioManifest from './lesson-01-listening-source/audio-manifest.json';
import vocabulary from './lesson-01-vocabulary-source/vocabulary.json';

export const levelTwoLessonOneListeningPrivate = {
  lesson,
  listening,
  exercises,
  audioManifest,
  vocabulary,
} as const;
