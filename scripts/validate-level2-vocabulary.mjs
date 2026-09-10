import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { CURRICULUM_LEVELS, isLessonSectionAvailable, lessonSectionHref } from '../lib/curriculum.mjs';

const root = process.cwd();
const sourceRoot = resolve(root, 'data/level2/lesson-01-vocabulary-source');
const audioRoot = resolve(root, 'public/audio/level-02/lesson-01/vocabulary');

function readJson(name) {
  return JSON.parse(readFileSync(resolve(sourceRoot, name), 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const lesson = readJson('lesson.json');
const vocabulary = readJson('vocabulary.json');
const exercises = readJson('exercises.json');
const manifest = readJson('audio-manifest.json');

assert(lesson.id === 'level-02-lesson-01-vocabulary' && lesson.lesson === 1, 'The package must target level 2, lesson 1.');
assert(Array.isArray(vocabulary) && vocabulary.length === 16, 'Expected exactly 16 vocabulary families.');
assert(new Set(vocabulary.map((item) => item.id)).size === 16, 'Vocabulary ids must be unique.');

const stageCounts = Object.fromEntries(exercises.stages.map((stage) => [stage.id, stage.items.length]));
assert(stageCounts.recall === 10, 'Recall must contain 10 exercises.');
assert(stageCounts.understand === 10, 'Understand must contain 10 exercises.');
assert(stageCounts.activate === 8, 'Activate must contain 8 exercises.');
assert(exercises.stages.flatMap((stage) => stage.items).length === 28, 'Expected exactly 28 exercises.');

assert(manifest.files.length === 32, 'Expected exactly 32 manifest entries.');
for (const entry of manifest.files) {
  const fileName = entry.path.split('/').pop();
  const destination = resolve(audioRoot, fileName);
  assert(existsSync(destination), `Missing audio file: ${fileName}`);
  assert(statSync(destination).size > 1000, `Audio file is unexpectedly small: ${fileName}`);
}

for (const item of vocabulary) {
  assert(item.familyAudio && item.exampleAudio, `Vocabulary ${item.id} is missing an audio mapping.`);
  assert(manifest.files.some((entry) => entry.path === item.familyAudio), `Family audio is not in manifest: ${item.id}`);
  assert(manifest.files.some((entry) => entry.path === item.exampleAudio), `Example audio is not in manifest: ${item.id}`);
}

const componentPath = resolve(root, 'components/level2/LevelTwoLessonOneVocabulary.tsx');
const privatePath = resolve(root, 'data/level2/vocabulary-private.ts');
const routePath = resolve(root, 'app/api/level2-vocabulary/route.ts');
const pagePath = resolve(root, 'app/levels/A2/lessons/1/vocabulary/page.tsx');
const cssPath = resolve(root, 'app/level2-vocabulary.css');

for (const path of [componentPath, privatePath, routePath, pagePath, cssPath]) {
  assert(existsSync(path), `Required implementation file is missing: ${path}`);
}

const component = readFileSync(componentPath, 'utf8');
const privateModule = readFileSync(privatePath, 'utf8');
const route = readFileSync(routePath, 'utf8');

assert(!component.includes('exercises.json'), 'The client component must not import private exercise answers.');
assert(!component.includes('vocabulary-private'), 'The client component must not import the server-only answer module.');
assert(privateModule.trimStart().startsWith("import 'server-only';"), 'Private exercise data must be server-only.');
assert(route.includes('publicItem') && route.includes('export async function POST'), 'The protected grading route is incomplete.');
assert(CURRICULUM_LEVELS.A2.lessons.length === 10, 'Intermediate level must contain 10 lessons.');
assert(isLessonSectionAvailable('A2', 1, 'vocabulary'), 'A2 lesson one must expose vocabulary.');
assert(lessonSectionHref('A2', 1, 'vocabulary') === '/levels/A2/lessons/1/vocabulary', 'The A2 vocabulary route is not registered correctly.');

console.log('VALID: A2 lesson 1 vocabulary contains 16 families, 28 exercises, 32 audio files, protected answer keys, and a 10-lesson intermediate track.');
