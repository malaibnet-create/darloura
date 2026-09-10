import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { isLessonSectionAvailable, lessonSectionHref } from '../lib/curriculum.mjs';

const root = resolve(import.meta.dirname, '..');
const sourceRoot = join(root, 'data', 'level2', 'lesson-01-listening-source');
const readJson = (name) => JSON.parse(readFileSync(join(sourceRoot, name), 'utf8'));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const lesson = readJson('lesson.json');
const listening = readJson('listening.json');
const exercises = readJson('exercises.json');
const manifest = readJson('audio-manifest.json');

assert(lesson.id === 'level-02-lesson-01-listening', 'Unexpected lesson id.');
assert(listening.turns.length === 12, 'Expected 12 dialogue turns.');
assert(listening.segments.length === 4, 'Expected four pedagogical segments.');
assert(listening.targetVocabulary.length === 16 && new Set(listening.targetVocabulary).size === 16, 'Expected 16 unique target vocabulary families.');
assert(manifest.files.length === 5, 'Expected five deployable audio files.');
assert(lesson.policy.fullAudioMaxPlays === 2 && lesson.policy.segmentMaxPlays === 2, 'Playback limit must remain two.');
assert(lesson.policy.allowSeeking === false, 'Seeking must remain disabled.');
assert(lesson.policy.transcriptVisibleBeforeCompletion === false, 'Transcript must remain locked before completion.');
assert(lesson.policy.pronunciationTraining === false, 'Pronunciation training must remain disabled.');

const expectedStages = { before: 4, gist: 4, details: 10, language: 8, inference: 4, after: 3 };
const allActivities = exercises.stages.flatMap((stage) => stage.items);
for (const [id, expected] of Object.entries(expectedStages)) {
  assert(exercises.stages.find((stage) => stage.id === id)?.items.length === expected, `${id} must contain ${expected} activities.`);
}
assert(allActivities.length === 33, `Expected 33 activities; received ${allActivities.length}.`);
assert(new Set(allActivities.map((item) => item.id)).size === 33, 'Activity ids must be unique.');

const coveredTurns = new Set(listening.segments.flatMap((segment) => segment.turnIds));
assert(listening.turns.every((turn) => coveredTurns.has(turn.id)), 'Every dialogue turn must belong to a segment.');

for (const entry of manifest.files) {
  const filename = entry.path.split('/').at(-1);
  const path = join(root, 'public', 'audio', 'level-02', 'lesson-01', 'listening', filename);
  assert(existsSync(path), `Missing audio file: ${filename}`);
  assert(statSync(path).size > 1_000, `Audio file is unexpectedly small: ${filename}`);
}
const imagePath = join(root, 'public', 'images', 'level-02', 'lesson-01', 'listening', 'listening-opening-workshop.png');
assert(existsSync(imagePath) && statSync(imagePath).size > 100_000, 'Opening image is missing or unexpectedly small.');

const privateSource = readFileSync(join(root, 'data', 'level2', 'listening-private.ts'), 'utf8');
const routeSource = readFileSync(join(root, 'app', 'api', 'level2-listening', 'route.ts'), 'utf8');
const componentSource = readFileSync(join(root, 'components', 'level2', 'LevelTwoLessonOneListening.tsx'), 'utf8');

assert(privateSource.includes("import 'server-only'"), 'Answer and transcript data must be server-only.');
assert(!componentSource.includes('lesson-01-listening-source/listening.json'), 'The client must not import the transcript source.');
assert(!componentSource.includes('lesson-01-listening-source/exercises.json'), 'The client must not import answer keys.');
assert(componentSource.includes("audio.preload = 'metadata'"), 'Audio must preload metadata only.');
assert(componentSource.includes('used >= 2'), 'The two-play limit is not enforced.');
assert(componentSource.includes('localStorage') && componentSource.includes('indexedDB'), 'Progress and recorded response persistence are required.');
assert(routeSource.includes("body.mode === 'transcript'"), 'The protected transcript response is missing.');
assert(isLessonSectionAvailable('A2', 1, 'vocabulary'), 'A2 lesson one must expose vocabulary.');
assert(isLessonSectionAvailable('A2', 1, 'reading'), 'A2 lesson one must expose reading.');
assert(isLessonSectionAvailable('A2', 1, 'listening'), 'A2 lesson one must expose listening.');
assert(lessonSectionHref('A2', 1, 'listening') === '/levels/A2/lessons/1/listening', 'The A2 listening route is not registered correctly.');

console.log('VALID level-02 lesson-01 listening: 12 turns, 4 segments, 33 activities, 5 audio files, 16 targets, locked transcript, and two-play policy.');
