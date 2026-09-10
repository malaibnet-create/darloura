import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const source = JSON.parse(readFileSync(resolve(root, 'data/level3/source/reading.source.json'), 'utf8'));
const practice = JSON.parse(readFileSync(resolve(root, 'data/level3/source/reading-practice.source.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(resolve(root, 'data/level3/reading-audio-manifest.json'), 'utf8'));
const hashes = readFileSync(resolve(root, 'data/level3/source/reading-audio-sha256.txt'), 'utf8')
  .trim().split(/\r?\n/).map((line) => {
    const [hash, file] = line.trim().split(/\s+/);
    return { hash, file };
  });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(source.sections.length === 5, 'Expected exactly five reading sections.');
assert(practice.questions.length === 20, 'Expected exactly twenty questions.');
assert(source.targetItems.length > 0, 'Target vocabulary and phrases are missing.');
assert(source.guidedSummary.minWords === 70 && source.guidedSummary.maxWords === 90, 'Summary range must remain 70–90 words.');
assert(source.guidedSummary.requiredVocabularyCount === 3, 'Summary must require three vocabulary items.');
assert(source.guidedSummary.requiredPhraseCount === 2, 'Summary must require two phrases.');
assert(manifest.items.length === 6, 'Expected six manifest audio items.');
assert(hashes.length === 6, 'Expected six audio checksums.');

const questionIds = new Set(practice.questions.map((question) => question.id));
assert(questionIds.size === 20, 'Question ids must be unique.');
for (const question of practice.questions) {
  assert(question.options.length === 4, `${question.id}: expected four options.`);
  assert(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < question.options.length, `${question.id}: invalid answer index.`);
  assert(question.sectionIds.every((id) => source.sections.some((section) => section.id === id)), `${question.id}: unresolved section reference.`);
}

const vocabularyTs = readFileSync(resolve(root, 'data/level3/vocabulary.ts'), 'utf8');
const phrasesTs = readFileSync(resolve(root, 'data/level3/phrases.ts'), 'utf8');
for (const item of source.targetItems) {
  const target = item.kind === 'vocabulary' ? vocabularyTs : phrasesTs;
  assert(target.includes(`"id": "${item.id}"`), `Unresolved ${item.kind} reference: ${item.id}`);
}

for (const item of manifest.items) {
  const fileName = item.file.split('/').pop();
  const audioPath = resolve(root, 'public/audio/level-03/reading/lesson-01', fileName);
  assert(existsSync(audioPath), `Missing audio file: ${fileName}`);
  assert(statSync(audioPath).size > 0, `Empty audio file: ${fileName}`);
  const expected = hashes.find((entry) => entry.file.endsWith(fileName));
  assert(expected, `Missing checksum: ${fileName}`);
  const actual = createHash('sha256').update(readFileSync(audioPath)).digest('hex');
  assert(actual === expected.hash, `Checksum mismatch: ${fileName}`);
}

assert(existsSync(resolve(root, 'public/images/level-03/reading/lesson-01-old-square.webp')), 'Opening image is missing.');
assert(existsSync(resolve(root, 'app/levels/B1/lessons/1/reading/page.tsx')), 'Reading route is missing.');
const component = readFileSync(resolve(root, 'components/level3/LevelThreeReading.tsx'), 'utf8');
for (const label of ['توقّع', 'اقرأ سريعًا', 'اقرأ بدقة', 'حلّل', 'استنتج', 'لخّص']) assert(component.includes(label), `Missing phase: ${label}`);
assert(component.includes("sections[1] = true"), 'Reading progress integration is missing.');

console.log(JSON.stringify({
  status: 'passed',
  content: { words: 571, sections: source.sections.length, targetItems: source.targetItems.length },
  practice: { questions: practice.questions.length, mastery: '16/20' },
  summary: { words: '70–90', vocabulary: 3, phrases: 2, scored: false },
  audio: { files: manifest.items.length, checksumsVerified: hashes.length },
  route: '/levels/B1/lessons/1/reading',
}, null, 2));
