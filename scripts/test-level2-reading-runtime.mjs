import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const baseUrl = process.env.READING_TEST_BASE_URL || 'http://localhost:3000';
const root = resolve(import.meta.dirname, '..');
const exercises = JSON.parse(readFileSync(resolve(root, 'data/level2/lesson-01-reading-source/exercises.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(resolve(root, 'data/level2/lesson-01-reading-source/audio-manifest.json'), 'utf8'));
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
  const forbidden = new Set(['answer', 'answers', 'modelAnswerAr', 'modelAnswerEn', 'requiredAny', 'feedback', 'correctionAr', 'correctionEn']);
  return Object.entries(value).some(([key, child]) => forbidden.has(key) || containsPrivateKey(child));
}

await expectOk('/levels/A2', 'A2 level page');
await expectOk('/levels/A2/lessons/1/reading', 'A2 lesson-one reading page');

const apiResponse = await expectOk('/api/level2-reading', 'Reading API');
const publicData = await apiResponse.json();
const publicItems = publicData.stages.flatMap((stage) => stage.items);
assert(publicItems.length === 32, `Public API returned ${publicItems.length} activities instead of 32.`);
assert(!containsPrivateKey(publicData), 'Public API exposed a protected answer or feedback key.');

const objective = exercises.stages.flatMap((stage) => stage.items).find((item) => item.id === 'g01');
assert(objective, 'Could not locate g01 for grading tests.');

const wrongOne = await fetch(`${baseUrl}/api/level2-reading`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ id: objective.id, response: '__wrong__', attemptNumber: 1 }),
}).then((response) => response.json());
assert(wrongOne.correct === false && wrongOne.reveal === false, 'The first wrong attempt must not reveal the answer.');

const wrongTwo = await fetch(`${baseUrl}/api/level2-reading`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ id: objective.id, response: '__wrong__', attemptNumber: 2 }),
}).then((response) => response.json());
assert(wrongTwo.correct === false && wrongTwo.reveal === true, 'The second wrong attempt must reveal guidance.');

const correct = await fetch(`${baseUrl}/api/level2-reading`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ id: objective.id, response: objective.answer, attemptNumber: 1 }),
}).then((response) => response.json());
assert(correct.correct === true, 'The documented correct response was rejected.');

for (const entry of manifest.files) {
  const filename = entry.path.split('/').at(-1);
  const response = await expectOk(`/audio/level-02/lesson-01/reading/${filename}`, filename);
  assert(Number(response.headers.get('content-length') || 0) > 1_000, `${filename} returned an invalid content length.`);
}

const image = await expectOk('/images/level-02/lesson-01/reading/reading-opening-volubilis.png', 'Opening image');
assert(Number(image.headers.get('content-length') || 0) > 100_000, 'Opening image returned an invalid content length.');

console.log('RUNTIME VALID: A2 level route, reading page, protected API, two-attempt grading, 6 audio files, and opening image.');
