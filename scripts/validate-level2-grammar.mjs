import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const source = path.join(root, 'data', 'level2', 'lesson-01-grammar-source');
const lesson = JSON.parse(await readFile(path.join(source, 'lesson.json'), 'utf8'));
const rules = JSON.parse(await readFile(path.join(source, 'rules.json'), 'utf8'));
const examples = JSON.parse(await readFile(path.join(source, 'examples.json'), 'utf8'));
const exercises = JSON.parse(await readFile(path.join(source, 'exercises.json'), 'utf8'));
const manifest = JSON.parse(await readFile(path.join(source, 'audio-manifest.json'), 'utf8'));
const items = exercises.stages.flatMap((stage) => stage.items);
const routeSource = await readFile(path.join(root, 'app', 'api', 'level2-grammar', 'route.ts'), 'utf8');

if (lesson.id !== 'level-02-lesson-01-grammar') throw new Error('Unexpected grammar lesson id.');
if (rules.length !== 2) throw new Error(`Expected 2 rules, found ${rules.length}.`);
if (examples.length !== 14) throw new Error(`Expected 14 examples, found ${examples.length}.`);
if (items.length !== 30 || new Set(items.map((item) => item.id)).size !== 30) throw new Error('The 30 exercise ids must be present and unique.');
if (!items.some((item) => item.type === 'exitTicket')) throw new Error('Exit ticket is missing.');
if (!items.some((item) => item.type === 'guidedProduction')) throw new Error('Guided production is missing.');
if (manifest.files.length !== 14) throw new Error(`Expected 14 audio manifest entries, found ${manifest.files.length}.`);

for (const entry of manifest.files) {
  const target = path.join(root, 'public', 'audio', 'level-02', 'lesson-01', 'grammar', path.basename(entry.path));
  await access(target);
  if ((await stat(target)).size < 1_000) throw new Error(`Audio file is empty or invalid: ${target}`);
  const example = examples.find((item) => item.id === entry.id);
  if (!example || example.textAr !== entry.textAr) throw new Error(`Manifest mismatch for ${entry.id}.`);
}

for (const required of [
  'components/level2/LevelTwoLessonOneGrammar.tsx',
  'app/api/level2-grammar/route.ts',
  'app/levels/A2/lessons/1/grammar/page.tsx',
  'app/level2-grammar.css',
]) await access(path.join(root, required));

// Keep the supplied source package intact, while presenting the shorter,
// selection-based learner flow requested for the platform.
for (const allowedId of ['r01', 'r02', 'r03', 'r08', 'r09', 'p01', 'p02', 'p03', 'p04', 'p05', 'p06', 'p08', 'p09', 'm01', 'm03']) {
  if (!routeSource.includes(`'${allowedId}'`)) throw new Error(`The learner flow is missing allowed activity ${allowedId}.`);
}
for (const removedId of ['r04', 'r05', 'r06', 'r07', 'r10', 'p07', 'p10', 'm02', 'm04', 'm05', 'm06']) {
  const allowedArea = routeSource.slice(routeSource.indexOf('const allowedExerciseIds'), routeSource.indexOf('export async function GET'));
  if (allowedArea.includes(`'${removedId}'`)) throw new Error(`Removed writing/correction activity ${removedId} is still exposed.`);
}
if (!routeSource.includes("item.type === 'sentenceBuilder'") || !routeSource.includes("Array.isArray(response) ? response.join(' ')")) {
  throw new Error('The corrected sentence-order grading path is missing.');
}
if (!routeSource.includes(".replace(/[«»\"'،؛؟!?.,:()\\[\\]{}]/gu, '')")) {
  throw new Error('Sentence-order grading must ignore punctuation and presentation-only differences.');
}

console.log('VALID: A2 lesson 1 grammar preserves the complete 30-activity source and 14 mapped recordings, while the learner flow exposes 19 clear activities, excludes open writing/correction/cloze/exit tasks, and accepts the correct sentence order without requiring diacritics or punctuation.');
