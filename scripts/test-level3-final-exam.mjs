import assert from 'node:assert/strict';
import { countExamWords, determineExamStatus, listeningPlayMayCount } from '../lib/level3-exam-rules.mjs';

assert.equal(determineExamStatus(70, 8, 8), 'passed', '70/100 with both production minimums must pass');
assert.equal(determineExamStatus(100, 15, 15), 'passed', 'perfect score must pass');
assert.equal(determineExamStatus(70, 7, 8), 'production_retake', 'writing below 8 requires production retake');
assert.equal(determineExamStatus(70, 8, 7), 'production_retake', 'speaking below 8 requires production retake');
assert.equal(determineExamStatus(69, 15, 15), 'failed', '69/100 must fail');

const startedAt = new Date('2026-08-30T12:00:00.000Z').toISOString();
const eightyPercent = new Date(startedAt).getTime() + 91_660 * 0.8;
assert.equal(listeningPlayMayCount(startedAt, eightyPercent - 1), false, '79.99% must not consume a listening play');
assert.equal(listeningPlayMayCount(startedAt, eightyPercent), true, '80% must consume one listening play');
assert.equal(listeningPlayMayCount(null, eightyPercent), false, 'a missing server start must never count');

const unvocalizedArabic = Array.from({ length: 120 }, () => 'قرار').join(' ');
assert.equal(countExamWords(unvocalizedArabic), 120, 'unvocalized Arabic writing must be accepted and counted normally');
assert.equal(countExamWords(`  ${unvocalizedArabic}  `), 120, 'surrounding whitespace must not affect writing count');

console.log('PASS: score boundaries, production minimums, listening 80% rule, and unvocalized Arabic writing.');
