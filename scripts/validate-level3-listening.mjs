import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const source = JSON.parse(readFileSync(join(root, 'data/level3/source/listening.source.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(join(root, 'data/level3/listening-audio-manifest.json'), 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(source.sections.length === 4, 'Expected four listening sections.');
assert(source.sections.flatMap((section) => section.turns).length === 12, 'Expected twelve dialogue turns.');
assert(source.questions.length === 20, 'Expected twenty graded questions.');
assert(source.questions.reduce((sum, question) => sum + question.points, 0) === 20, 'Expected a total score of 20.');
assert(source.lesson.masteryScore === 16, 'Expected mastery at 16/20.');
assert(source.phraseNoticing.length === 10, 'Expected ten phrase-noticing activities.');
assert(source.preListening.keywords.length === 3, 'Only three pre-listening keywords should be shown.');
assert(manifest.items.length === 15, 'Expected fifteen official audio references.');
assert(source.revealPolicy.showTranscriptAfter === 'gradedCompletion', 'Transcript must remain locked until graded completion.');
assert(source.revealPolicy.showEnglishTranslation === false, 'A full English translation must not be shown.');

for (const item of manifest.items) {
  const filename = item.path.split('/').pop();
  const audioPath = join(root, 'public/audio/level-03/listening/lesson-01', filename);
  assert(existsSync(audioPath), `Missing audio file: ${filename}`);
  assert(statSync(audioPath).size > 1000, `Audio file is unexpectedly small: ${filename}`);
}

const component = readFileSync(join(root, 'components/level3/LevelThreeListening.tsx'), 'utf8');
assert(component.includes("progressState[2] = true"), 'Listening completion is not connected to the level progress array.');
assert(component.includes("phase === 'review'"), 'Review phase is missing.');
assert(component.includes('transcript-panel'), 'Post-assessment transcript is missing.');
assert(!component.includes('MediaRecorder'), 'Student recording is forbidden in this listening lesson.');

const route = join(root, 'app/levels/B1/lessons/1/listening/page.tsx');
assert(existsSync(route), 'Advanced listening route is missing.');
assert(existsSync(join(root, 'public/images/level-03/listening/lesson-01-decision.png')), 'Opening image is missing.');

console.log('VALID: 4 sections, 12 turns, 20/20 points, mastery 16, 10 phrase items, 15 audio files, transcript locked until completion, no pronunciation recording.');
