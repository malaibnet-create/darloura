import assert from 'node:assert/strict';
import { countExamWords, determineExamStatus, listeningPlayMayCount } from '../lib/level2-exam-rules.mjs';

assert.equal(determineExamStatus(80, 5, 5), 'passed', '80/100 with both production minimums must pass');
assert.equal(determineExamStatus(100, 10, 10), 'passed', 'a perfect attempt must pass');
assert.equal(determineExamStatus(80, 4, 5), 'production_retake', 'writing below 5 requires a production retake');
assert.equal(determineExamStatus(80, 5, 4), 'production_retake', 'speaking below 5 requires a production retake');
assert.equal(determineExamStatus(79, 10, 10), 'failed', '79/100 must fail');

const startedAt = new Date('2026-08-31T12:00:00.000Z').toISOString();
const eightyPercent = new Date(startedAt).getTime() + 19_200;
assert.equal(listeningPlayMayCount(startedAt, eightyPercent - 1), false, 'a play interrupted before 80% must not count');
assert.equal(listeningPlayMayCount(startedAt, eightyPercent), true, 'a play reaching 80% must count');
assert.equal(listeningPlayMayCount(null, eightyPercent), false, 'a missing server start must not count');

const unvocalizedArabic = Array.from({ length: 70 }, () => 'تعلم').join(' ');
assert.equal(countExamWords(unvocalizedArabic), 70, 'unvocalized Arabic must be accepted and counted');
assert.equal(countExamWords(`  ${unvocalizedArabic}  `), 70, 'surrounding whitespace must not change the count');

console.log('PASS: 80/100 boundary, 5/10 production minimums, listening 80% rule, and unvocalized Arabic writing.');
