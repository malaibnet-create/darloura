import 'server-only';
import lesson from './lesson-01-vocabulary-source/lesson.json';
import vocabulary from './lesson-01-vocabulary-source/vocabulary.json';
import exercises from './lesson-01-vocabulary-source/exercises.json';

export const levelTwoLessonOneVocabularyPrivate = {
  lesson,
  vocabulary,
  exercises,
} as const;
