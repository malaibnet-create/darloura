import assert from 'node:assert/strict';
import { access, readFile, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = resolve(root, 'data/level3/exam-source');
const exam = JSON.parse(await readFile(resolve(sourceRoot, 'exam.source.json'), 'utf8'));
const { questions } = JSON.parse(await readFile(resolve(sourceRoot, 'questions.source.json'), 'utf8'));
const expected = { vocabulary: 15, reading: 15, listening: 20, grammar: 20 };

assert.equal(new Set(questions.map((question) => question.id)).size, 33, 'question ids must be unique');
assert.equal(questions.length, 33, 'the objective exam must contain 33 questions');
for (const [section, points] of Object.entries(expected)) {
  assert.equal(questions.filter((question) => question.section === section).reduce((sum, question) => sum + question.points, 0), points, `${section} score mismatch`);
}
assert.equal(exam.exam.sections.reduce((sum, section) => sum + section.score, 0), 100, 'section scores must total 100');
assert.equal(exam.exam.passScore, 70, 'pass score must be 70');
assert.equal(exam.listening.policy.maxPlays, 2, 'listening must allow two plays only');
assert.equal(exam.listening.turns.length, 10, 'listening transcript must retain ten turns');
for (const task of [exam.writing, exam.speaking]) {
  assert.equal(task.rubric.reduce((sum, row) => sum + row.max, 0), 15, 'each production rubric must total 15');
}

const audio = resolve(root, 'public/audio/level-03/exam/lesson-01/exam-listening-full.mp3');
await access(audio, constants.R_OK);
assert.ok((await stat(audio)).size > 1000, 'listening audio must not be empty');
for (const file of [
  'app/levels/B1/lessons/1/exam/page.tsx',
  'app/api/level3-exam/attempt/route.ts',
  'app/api/level3-exam/submit/route.ts',
  'app/api/level3-exam/realtime/route.ts',
  'components/level3/LevelThreeFinalExam.tsx',
  'components/level3/ExamSpeakingPanel.tsx',
  'supabase/migrations/010_level3_final_exam.sql',
]) await access(resolve(root, file), constants.R_OK);

const client = await readFile(resolve(root, 'components/level3/LevelThreeFinalExam.tsx'), 'utf8');
const privateData = await readFile(resolve(root, 'data/level3/final-exam-private.ts'), 'utf8');
assert.ok(privateData.startsWith("import 'server-only';"), 'answer key must be server-only');
assert.ok(!client.includes('final-exam-private'), 'client must not import the answer key');
assert.ok(!client.includes('question.answer'), 'client source must not read answer indexes');

console.log('PASS: 100 points, 33 questions, six sections, audio, routes, migration, and server-only answer key validated.');
