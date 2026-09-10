import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURRICULUM_LEVELS, isLessonSectionAvailable, lessonSectionHref } from '../lib/curriculum.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const vocabulary = readJson('data/level3/source/vocabulary.source.json');
const practice = readJson('data/level3/source/practice.source.json');
const manifest = readJson('data/level3/audio-manifest.json');
const items = vocabulary.items;
const questions = practice.stages.flatMap((stage) => stage.questions);
const audioDir = join(root, 'public/audio/level-03/vocabulary/lesson-01');

assert.equal(items.length, 40, 'The lesson must contain 40 vocabulary items.');
assert.equal(items.filter((item) => item.band === 'active').length, 24, 'Expected 24 active items.');
assert.equal(items.filter((item) => item.band === 'receptive').length, 16, 'Expected 16 receptive items.');
assert.equal(new Set(items.map((item) => item.id)).size, 40, 'Vocabulary IDs must be unique.');
assert.equal(vocabulary.prediction.questions.length, 4, 'Prediction must contain four ungraded prompts.');

assert.equal(questions.length, 20, 'Practice must contain 20 questions.');
assert.equal(practice.stages.length, 5, 'Practice must contain five stages.');
assert.equal(practice.assessment.totalPoints, 20, 'Practice must total 20 points.');
assert.equal(practice.assessment.passPoints, 16, 'Pass score must be 16/20.');
const ids = new Set(items.map((item) => item.id));
for (const question of questions) {
  assert.ok(Array.isArray(question.choices) && question.choices.length >= 2, `${question.id} needs choices.`);
  assert.ok(question.choices.includes(question.answer), `${question.id} answer must be one of its choices.`);
  assert.ok(question.vocabularyIds.every((id) => ids.has(id)), `${question.id} references an unknown vocabulary ID.`);
  assert.ok(!/writing|essay|record|speaking|oral/i.test(`${question.type} ${question.promptAr}`), `${question.id} must not require open production.`);
}

const clips = Object.values(manifest.clips);
assert.equal(manifest.clipCount, 80, 'Manifest clipCount must be 80.');
assert.equal(clips.length, 80, 'Manifest must contain 80 clips.');
const mp3Files = readdirSync(audioDir).filter((name) => name.endsWith('.mp3'));
assert.equal(mp3Files.length, 80, 'Public lesson audio directory must contain 80 MP3 files.');

for (const item of items) {
  const wordClip = clips.find((clip) => clip.vocabularyId === item.id && clip.usage === 'vocabulary-word');
  const exampleClip = clips.find((clip) => clip.vocabularyId === item.id && clip.usage === 'vocabulary-example');
  assert.ok(wordClip, `Missing word clip for ${item.id}.`);
  assert.ok(exampleClip, `Missing example clip for ${item.id}.`);
  assert.equal(wordClip.text, item.word, `Word audio text mismatch for ${item.id}.`);
  assert.equal(exampleClip.text, item.example, `Example audio text mismatch for ${item.id}.`);
  for (const clip of [wordClip, exampleClip]) {
    const file = join(audioDir, clip.file.split('/').pop());
    assert.ok(existsSync(file), `Missing audio file ${file}.`);
    const header = readFileSync(file).subarray(0, 3).toString('latin1');
    assert.ok(header === 'ID3' || header.charCodeAt(0) === 0xff, `${file} is not recognized as MP3.`);
  }
}

assert.ok(existsSync(join(root, 'public/images/level-03/vocabulary/lesson-01-prediction.webp')), 'Prediction image is missing.');
assert.ok(existsSync(join(root, 'app/levels/B1/lessons/1/vocabulary/page.tsx')), 'Advanced lesson route is missing.');
for (const [code, nameAr, nameEn] of [
  ['A1', 'المستوى المبتدئ', 'Beginner'],
  ['A2', 'المستوى المتوسط', 'Intermediate'],
  ['B1', 'المستوى المتقدم', 'Advanced'],
]) {
  assert.equal(CURRICULUM_LEVELS[code].nameAr, nameAr, `Missing Arabic level label for ${code}.`);
  assert.equal(CURRICULUM_LEVELS[code].nameEn, nameEn, `Missing English level label for ${code}.`);
}
assert.equal(CURRICULUM_LEVELS.A1.lessons.length, 2, 'Beginner must retain exactly its two existing lessons.');
assert.equal(CURRICULUM_LEVELS.B1.lessons.length, 1, 'Advanced must expose lesson one.');
assert.ok(isLessonSectionAvailable('B1', 1, 'vocabulary'), 'Advanced vocabulary is not available in the curriculum registry.');
assert.equal(lessonSectionHref('B1', 1, 'vocabulary'), '/levels/B1/lessons/1/vocabulary', 'Advanced vocabulary route is not connected.');

console.log(JSON.stringify({
  status: 'passed',
  vocabulary: { total: items.length, active: 24, receptive: 16 },
  practice: { stages: practice.stages.length, questions: questions.length, pass: '16/20' },
  audio: { manifestClips: clips.length, mp3Files: mp3Files.length },
  levels: ['المستوى المبتدئ · Beginner', 'المستوى المتوسط · Intermediate', 'المستوى المتقدم · Advanced'],
}, null, 2));
