import assert from 'node:assert/strict';
import {
  CURRICULUM_LEVELS,
  curriculumExamHref,
  getLessonConfig,
  isImplementedLesson,
  isLessonSectionAvailable,
  lessonSectionHref,
  parseLevelCode,
} from '../lib/curriculum.mjs';

assert.equal(parseLevelCode('a1'), 'A1');
assert.equal(parseLevelCode('unknown'), null);
assert.equal(CURRICULUM_LEVELS.A1.lessons.length, 2);
assert.equal(CURRICULUM_LEVELS.A2.lessons.length, 10);
assert.equal(CURRICULUM_LEVELS.B1.lessons.length, 1);
assert.equal(isImplementedLesson('A1', 1), true);
assert.equal(isImplementedLesson('A1', 2), true);
assert.equal(isImplementedLesson('A1', 3), false);
assert.equal(isImplementedLesson('A2', 2), false);
assert.equal(getLessonConfig('B1', 2), null);
assert.equal(isLessonSectionAvailable('A1', 1, 'phrases'), false);
assert.equal(isLessonSectionAvailable('B1', 1, 'phrases'), true);
assert.equal(lessonSectionHref('A1', 2, 'conversation'), '/lessons/2/speaking');
assert.equal(lessonSectionHref('A2', 2, 'vocabulary'), null);
assert.equal(curriculumExamHref('B1', 1), '/levels/B1/lessons/1/exam');

console.log('Curriculum registry and canonical route tests passed.');

