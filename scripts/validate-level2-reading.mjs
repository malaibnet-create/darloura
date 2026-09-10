import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { isLessonSectionAvailable, lessonSectionHref } from '../lib/curriculum.mjs';

const root = resolve(import.meta.dirname, '..');
const sourceRoot = join(root, 'data', 'level2', 'lesson-01-reading-source');
const readJson = (name) => JSON.parse(readFileSync(join(sourceRoot, name), 'utf8'));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const lesson = readJson('lesson.json');
const reading = readJson('reading.json');
const exercises = readJson('exercises.json');
const manifest = readJson('audio-manifest.json');

assert(lesson.id === 'level-02-lesson-01-reading', 'Unexpected lesson id.');
assert(reading.paragraphs?.length === 5, 'The reading must contain exactly five paragraphs.');

const wordCount = reading.paragraphs
  .map((paragraph) => paragraph.textAr)
  .join(' ')
  .trim()
  .split(/\s+/u).length;
assert(wordCount === 353, `Expected 353 reading words; received ${wordCount}.`);

assert(reading.targetVocabulary?.length === 16, 'Expected 16 target vocabulary families.');
assert(new Set(reading.targetVocabulary).size === 16, 'Target vocabulary entries must be unique.');

const allActivities = exercises.stages.flatMap((stage) => stage.items);
const expectedStages = { before: 4, gist: 4, details: 9, language: 8, inference: 4, after: 3 };
for (const [stage, expected] of Object.entries(expectedStages)) {
  assert(exercises.stages.find((entry) => entry.id === stage)?.items.length === expected, `${stage} must contain ${expected} activities.`);
}
assert(allActivities.length === 32, `Expected 32 activities; received ${allActivities.length}.`);
assert(new Set(allActivities.map((item) => item.id)).size === 32, 'Activity ids must be unique.');

assert(manifest.files?.length === 6, 'The audio manifest must contain six files.');
for (const entry of manifest.files) {
  const publicPath = `/audio/level-02/lesson-01/reading/${entry.path.split('/').at(-1)}`;
  const asset = join(root, 'public', publicPath.replace(/^\//u, ''));
  assert(existsSync(asset), `Missing audio asset: ${publicPath}`);
  assert(statSync(asset).size > 1_000, `Audio asset is unexpectedly small: ${publicPath}`);
}

const imagePath = join(root, 'public', 'images', 'level-02', 'lesson-01', 'reading', 'reading-opening-volubilis.png');
assert(existsSync(imagePath), 'Missing the opening Volubilis image.');
assert(statSync(imagePath).size > 100_000, 'The opening image is unexpectedly small.');

const privateSource = readFileSync(join(root, 'data', 'level2', 'reading-private.ts'), 'utf8');
const routeSource = readFileSync(join(root, 'app', 'api', 'level2-reading', 'route.ts'), 'utf8');
const componentSource = readFileSync(join(root, 'components', 'level2', 'LevelTwoLessonOneReading.tsx'), 'utf8');

assert(privateSource.includes("import 'server-only'"), 'Private answer data must be server-only.');
assert(routeSource.includes('export async function GET') && routeSource.includes('export async function POST'), 'Reading API must expose safe GET and grading POST handlers.');
assert(!componentSource.includes('lesson-01-reading-source/exercises.json'), 'The client component must not import the answer key.');
assert(componentSource.includes("audio.preload = 'metadata'"), 'Audio elements must use metadata preloading.');
assert(componentSource.includes('localStorage'), 'Reading progress must be persisted locally.');
assert(componentSource.includes('bestObjectiveCorrect'), 'The best objective score must be preserved.');
assert(isLessonSectionAvailable('A2', 1, 'vocabulary'), 'A2 lesson one must expose vocabulary.');
assert(isLessonSectionAvailable('A2', 1, 'reading'), 'A2 lesson one must expose reading.');
assert(lessonSectionHref('A2', 1, 'reading') === '/levels/A2/lessons/1/reading', 'The A2 reading route is not registered correctly.');

console.log(`VALID level-02 lesson-01 reading: ${wordCount} words, 5 paragraphs, 16 targets, 32 activities, 6 audio files, and opening image.`);
