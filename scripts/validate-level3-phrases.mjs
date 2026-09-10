import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isLessonSectionAvailable, lessonSectionHref } from '../lib/curriculum.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const phrasesData = readJson('data/level3/source/phrases.source.json');
const practice = readJson('data/level3/source/phrase-practice.source.json');
const manifest = readJson('data/level3/phrase-audio-manifest.json');
const phrases = phrasesData.phrases;
const questions = practice.questions;
const audioDir = join(root, 'public/audio/level-03/phrases/lesson-01');

assert.equal(phrases.length, 10, 'Expected exactly 10 phrases.');
assert.equal(phrasesData.categories.length, 5, 'Expected exactly five functional groups.');
for (const category of phrasesData.categories) {
  assert.equal(phrases.filter((phrase) => phrase.category === category.id).length, 2, `${category.id} must contain exactly two phrases.`);
}
assert.equal(phrases.flatMap((phrase) => phrase.examples).length, 20, 'Expected 20 phrase examples.');
assert.equal(practice.guidedProduction.length, 2, 'Expected two guided-production tasks.');
assert.equal(questions.length, 20, 'Expected 20 scored questions.');
assert.equal(questions.filter((question) => question.type === 'reorder').length, 2, 'Expected two reorder questions.');
assert.equal(questions.filter((question) => question.stage === 'listening').length, 2, 'Expected two listening questions.');
const phraseIds = new Set(phrases.map((phrase) => phrase.id));
for (const question of questions) {
  assert.ok(question.phraseIds.every((id) => phraseIds.has(id)), `${question.id} references an unknown phrase.`);
  if (question.type === 'singleChoice') assert.ok(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < question.options.length, `${question.id} has an invalid answer index.`);
  if (question.type === 'reorder') assert.equal(question.tokens.length, question.answer.length, `${question.id} reorder token count mismatch.`);
  if (question.stage === 'listening') {
    assert.ok(question.audio, `${question.id} needs audio.`);
    assert.ok(question.transcriptAr, `${question.id} needs a hidden transcript.`);
  }
}

assert.equal(manifest.items.length, 33, 'Manifest must contain 33 audio items.');
const publicAudio = readdirSync(audioDir).filter((file) => file.endsWith('.mp3'));
assert.equal(publicAudio.length, 33, 'Public audio directory must contain 33 MP3 files.');
for (const item of manifest.items) {
  const fileName = item.file.replace(/^audio\//, '');
  const file = join(audioDir, fileName);
  assert.ok(existsSync(file), `Missing audio file: ${fileName}`);
  assert.ok(readFileSync(file).length > 1000, `Audio file is empty or too small: ${fileName}`);
}
for (const phrase of phrases) {
  const phraseClip = manifest.items.find((item) => item.type === 'phrase' && item.phraseId === phrase.id);
  assert.equal(phraseClip?.text, phrase.phraseAr, `Phrase audio text mismatch for ${phrase.id}.`);
  for (const example of phrase.examples) {
    const clip = manifest.items.find((item) => item.file === example.audio);
    assert.equal(clip?.text, example.ar, `Example audio text mismatch for ${example.id}.`);
  }
}
assert.equal(manifest.items.find((item) => item.type === 'context')?.text, phrasesData.openingContext.textAr, 'Opening audio text mismatch.');

const checksumLines = readFileSync(join(root, 'data/level3/source/phrase-audio-sha256.txt'), 'utf8').trim().split(/\r?\n/);
assert.equal(checksumLines.length, 33, 'Expected 33 SHA-256 checksums.');
for (const line of checksumLines) {
  const [expected, sourcePath] = line.trim().split(/\s{2,}/);
  const file = join(audioDir, sourcePath.replace(/^audio\//, ''));
  const actual = createHash('sha256').update(readFileSync(file)).digest('hex');
  assert.equal(actual, expected, `Checksum mismatch for ${sourcePath}.`);
}

const component = readFileSync(join(root, 'components/level3/LevelThreePhrases.tsx'), 'utf8');
assert.ok(existsSync(join(root, 'app/levels/B1/lessons/1/phrases/page.tsx')), 'Phrases route is missing.');
for (const phase of ['اكتشف', 'افهم', 'قارن', 'تدرّب', 'استعمل', 'اختبر نفسك']) assert.ok(component.includes(phase), `Missing phase: ${phase}`);
assert.ok(component.includes('audio.preload = \'none\''), 'Audio preload must be none.');
assert.ok(component.includes('audioRef.current.pause()'), 'New playback must stop the previous audio.');
assert.ok(isLessonSectionAvailable('B1', 1, 'phrases'), 'Advanced level does not expose the phrases section.');
assert.equal(lessonSectionHref('B1', 1, 'phrases'), '/levels/B1/lessons/1/phrases', 'Phrases route is not connected.');

console.log(JSON.stringify({
  status: 'passed',
  content: { phrases: 10, groups: 5, examples: 20, guidedProduction: 2 },
  practice: { questions: 20, mastery: '16/20', reorder: 2, listening: 2 },
  audio: { files: 33, manifestItems: 33, checksumsVerified: 33 },
  route: '/levels/B1/lessons/1/phrases',
}, null, 2));
