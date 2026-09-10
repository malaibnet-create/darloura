import assert from 'node:assert/strict';
import { access, readFile, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = resolve(root, 'data/level2/lesson-01-exam-source');
const exam = JSON.parse(await readFile(resolve(sourceRoot, 'exam.source.json'), 'utf8'));
const { questions } = JSON.parse(await readFile(resolve(sourceRoot, 'questions.source.json'), 'utf8'));
const manifest = JSON.parse(await readFile(resolve(sourceRoot, 'audio-manifest.json'), 'utf8'));
const expected = { vocabulary: 20, reading: 20, listening: 20, grammar: 20 };

assert.equal(exam.exam.sections.length, 6, 'the exam must contain six sections');
assert.equal(exam.exam.gradedTasks, 20, 'the exam must contain twenty graded tasks');
assert.equal(exam.exam.sections.reduce((sum, section) => sum + section.score, 0), 100, 'section scores must total 100');
assert.equal(exam.exam.passScore, 80, 'pass score must remain 80');
assert.equal(questions.length, 18, 'the objective exam must contain eighteen questions');
assert.equal(new Set(questions.map((question) => question.id)).size, 18, 'question ids must be unique');
for (const [section, points] of Object.entries(expected)) {
  assert.equal(questions.filter((question) => question.section === section).reduce((sum, question) => sum + question.points, 0), points, `${section} score mismatch`);
}
for (const question of questions) {
  assert.equal(question.options.length, 4, `${question.id} must have four options`);
  assert.ok(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < 4, `${question.id} answer is invalid`);
}
assert.equal(exam.writing.wordRange.minimum, 70);
assert.equal(exam.writing.wordRange.maximum, 90);
assert.equal(exam.writing.acceptWithoutDiacritics, true);
assert.equal(exam.speaking.minimumLearnerTurns, 6);
assert.equal(exam.listening.policy.maxPlays, 2);
assert.equal(manifest.files[0].maxPlays, 2);

const audio = resolve(root, 'public/audio/level-02/lesson-01/exam/exam-listening-full.mp3');
await access(audio, constants.R_OK);
assert.ok((await stat(audio)).size > 10_000, 'listening audio must not be empty');
for (const file of [
  'app/levels/A2/lessons/1/exam/page.tsx',
  'app/api/level2-exam/attempt/route.ts',
  'app/api/level2-exam/submit/route.ts',
  'app/api/level2-exam/realtime/route.ts',
  'components/level2/LevelTwoFinalExam.tsx',
  'components/level2/ExamSpeakingPanel.tsx',
  'supabase/migrations/011_level2_final_exam.sql',
]) await access(resolve(root, file), constants.R_OK);

const client = await readFile(resolve(root, 'components/level2/LevelTwoFinalExam.tsx'), 'utf8');
const privateData = await readFile(resolve(root, 'data/level2/final-exam-private.ts'), 'utf8');
const publicBuilder = await readFile(resolve(root, 'lib/level2-exam-server.ts'), 'utf8');
assert.ok(privateData.startsWith("import 'server-only';"), 'answer key must be server-only');
assert.ok(!client.includes('final-exam-private'), 'client must not import the answer key');
assert.ok(!client.includes('question.answer'), 'client must not read answer indexes');
const publicFactory = publicBuilder.slice(publicBuilder.indexOf('export function createPublicExam'), publicBuilder.indexOf('export function scoreObjectiveAnswers'));
assert.ok(publicFactory.includes('promptAr') && !publicFactory.includes('feedbackAr') && !publicFactory.includes('answer:'), 'public payload must omit answers and feedback');

console.log('PASS: exact A2 exam package, 100 points, 20 tasks, 18 questions, audio, routes, migration, and server-only key.');
