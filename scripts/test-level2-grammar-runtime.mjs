import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const baseUrl = process.env.GRAMMAR_TEST_BASE_URL || 'http://localhost:3000';
const root = resolve(import.meta.dirname, '..');
const exercises = JSON.parse(
  readFileSync(resolve(root, 'data/level2/lesson-01-grammar-source/exercises.json'), 'utf8'),
);
const manifest = JSON.parse(
  readFileSync(resolve(root, 'data/level2/lesson-01-grammar-source/audio-manifest.json'), 'utf8'),
);

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function expectOk(path, label) {
  const response = await fetch(`${baseUrl}${path}`);
  assert(response.ok, `${label} returned ${response.status}.`);
  return response;
}

function containsPrivateKey(value) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsPrivateKey);
  const forbidden = new Set([
    'answer',
    'modelAnswer',
    'modelAnswers',
    'requiredTerms',
    'pairs',
    'groups',
    'blanks',
    'feedbackAr',
    'feedbackEn',
  ]);
  return Object.entries(value).some(
    ([key, child]) => forbidden.has(key) || containsPrivateKey(child),
  );
}

async function grade(id, response, attemptNumber = 1) {
  const result = await fetch(`${baseUrl}/api/level2-grammar`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, response, attemptNumber }),
  });
  assert(result.ok, `Grammar grading for ${id} returned ${result.status}.`);
  return result.json();
}

await expectOk('/levels/A2', 'A2 level page');
await expectOk('/levels/A2/lessons/1/grammar', 'A2 lesson-one grammar page');

const apiResponse = await expectOk('/api/level2-grammar?attempt=runtime-check', 'Grammar API');
const publicData = await apiResponse.json();
const publicItems = publicData.stages.flatMap((stage) => stage.items);
const publicIds = new Set(publicItems.map((item) => item.id));
const expectedIds = [
  'r01', 'r02', 'r03', 'r08', 'r09',
  'p01', 'p02', 'p03', 'p04', 'p05', 'p06', 'p08', 'p09',
  'm01', 'm03',
];
for (const id of expectedIds) assert(publicIds.has(id), `Learner flow is missing ${id}.`);
for (const id of ['r04', 'r05', 'r06', 'r07', 'p07', 'p10', 'm02', 'm04', 'm05']) {
  assert(!publicIds.has(id), `Removed writing/correction/cloze activity ${id} is still exposed.`);
}
assert(!containsPrivateKey(publicData), 'Public grammar API exposed protected answer data.');

const privateItems = exercises.stages.flatMap((stage) => stage.items);
const objective = privateItems.find((item) => item.id === 'r01');
assert(objective, 'Could not locate r01 for grading tests.');
const wrongOne = await grade(objective.id, '__wrong__', 1);
assert(wrongOne.correct === false && wrongOne.reveal === false, 'First wrong attempt revealed the answer.');
const wrongTwo = await grade(objective.id, '__wrong__', 2);
assert(wrongTwo.correct === false && wrongTwo.reveal === true, 'Second wrong attempt did not reveal guidance.');
const correct = await grade(objective.id, objective.answer, 1);
assert(correct.correct === true, 'Documented r01 answer was rejected.');

const orderedTokens = ['قَرَّرَ', 'الطُّلَّابُ', 'أَنْ', 'يَعْمَلُوا', 'مَعًا'];
const ordered = await grade('m03', orderedTokens, 1);
assert(ordered.correct === true, 'Correct m03 token order was rejected.');
const unvocalized = await grade('m03', 'قرر الطلاب ان يعملوا معا', 1);
assert(unvocalized.correct === true, 'Correct m03 answer without diacritics was rejected.');
const wrongOrder = await grade('m03', [...orderedTokens].reverse(), 1);
assert(wrongOrder.correct === false, 'Incorrect m03 token order was accepted.');

for (const entry of manifest.files) {
  const filename = entry.path.split('/').at(-1);
  const response = await expectOk(`/audio/level-02/lesson-01/grammar/${filename}`, filename);
  assert(
    Number(response.headers.get('content-length') || 0) > 1_000,
    `${filename} has an invalid content length.`,
  );
}

console.log(
  `RUNTIME VALID: A2 grammar page, protected API, ${expectedIds.length} learner activities, two-attempt grading, corrected m03 order, diacritic-insensitive grading, and ${manifest.files.length} audio files.`,
);
