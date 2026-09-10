import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const baseUrl = process.env.LISTENING_TEST_BASE_URL || 'http://localhost:3000';
const root = resolve(import.meta.dirname, '..');
const exercises = JSON.parse(readFileSync(resolve(root, 'data/level2/lesson-01-listening-source/exercises.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(resolve(root, 'data/level2/lesson-01-listening-source/audio-manifest.json'), 'utf8'));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function expectOk(path, label) {
  const response = await fetch(`${baseUrl}${path}`);
  assert(response.ok, `${label} returned ${response.status}.`);
  return response;
}

function containsPrivateKey(value) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsPrivateKey);
  const forbidden = new Set(['answer', 'answers', 'modelAnswerAr', 'requiredAny', 'correctionAr', 'displayAr', 'textAr', 'turns', 'speakers']);
  return Object.entries(value).some(([key, child]) => forbidden.has(key) || containsPrivateKey(child));
}

await expectOk('/levels/A2', 'A2 level page');
await expectOk('/levels/A2/lessons/1/listening', 'A2 lesson-one listening page');

const apiResponse = await expectOk('/api/level2-listening', 'Listening API');
const publicData = await apiResponse.json();
const publicItems = publicData.stages.flatMap((stage) => stage.items);
assert(publicItems.length === 33, `Public API returned ${publicItems.length} activities instead of 33.`);
assert(!containsPrivateKey(publicData), 'Public API exposed a protected answer or transcript field.');

const allPrivateItems = exercises.stages.flatMap((stage) => stage.items);
const objectiveIds = exercises.stages.filter((stage) => ['gist', 'details', 'language', 'inference'].includes(stage.id)).flatMap((stage) => stage.items.map((item) => item.id));
const objective = allPrivateItems.find((item) => item.id === 'g01');

const wrongOne = await fetch(`${baseUrl}/api/level2-listening`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: objective.id, response: '__wrong__', attemptNumber: 1 }) }).then((response) => response.json());
assert(wrongOne.correct === false && wrongOne.reveal === false, 'First wrong attempt revealed the answer.');
const wrongTwo = await fetch(`${baseUrl}/api/level2-listening`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: objective.id, response: '__wrong__', attemptNumber: 2 }) }).then((response) => response.json());
assert(wrongTwo.correct === false && wrongTwo.reveal === true, 'Second wrong attempt did not reveal guidance.');
const correct = await fetch(`${baseUrl}/api/level2-listening`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: objective.id, response: objective.answer, attemptNumber: 1 }) }).then((response) => response.json());
assert(correct.correct === true, 'Documented correct response was rejected.');

const lockedTranscript = await fetch(`${baseUrl}/api/level2-listening`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'transcript', submittedIds: objectiveIds.slice(0, -1) }) });
assert(lockedTranscript.status === 403, 'Transcript opened before every objective activity was submitted.');
const openTranscript = await fetch(`${baseUrl}/api/level2-listening`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'transcript', submittedIds: objectiveIds }) });
assert(openTranscript.ok, `Completed transcript request returned ${openTranscript.status}.`);
const transcript = await openTranscript.json();
assert(transcript.turns.length === 12 && transcript.speakers.length === 2, 'Unlocked transcript is incomplete.');

for (const entry of manifest.files) {
  const filename = entry.path.split('/').at(-1);
  const response = await expectOk(`/audio/level-02/lesson-01/listening/${filename}`, filename);
  assert(Number(response.headers.get('content-length') || 0) > 1_000, `${filename} has an invalid content length.`);
}
const image = await expectOk('/images/level-02/lesson-01/listening/listening-opening-workshop.png', 'Opening image');
assert(Number(image.headers.get('content-length') || 0) > 100_000, 'Opening image has an invalid content length.');

console.log('RUNTIME VALID: A2 route, listening page, protected API, two attempts, locked/unlocked transcript, 5 audio files, and image.');
