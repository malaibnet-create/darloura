import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const grammar = JSON.parse(readFileSync(join(root, 'data/level3/source/grammar.source.json'), 'utf8'));
const practice = JSON.parse(readFileSync(join(root, 'data/level3/source/grammar-practice.source.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(join(root, 'data/level3/grammar-audio-manifest.json'), 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(grammar.modules.length === 3, 'Expected three complete grammar modules.');
assert(grammar.modules.every((module) => module.explanationAr && module.explanationEn), 'Every module needs Arabic and English explanations.');
assert(grammar.modules.reduce((sum, module) => sum + module.rules.length, 0) === 15, 'Expected fifteen complete grammar rules/examples.');
assert(grammar.modules.every((module) => module.commonErrors.length === 2), 'Expected two common-error explanations per module.');
assert(practice.questions.length === 30, 'Expected thirty graded questions.');
assert(practice.questions.reduce((sum, question) => sum + question.points, 0) === 30, 'Expected a total score of 30.');
assert(practice.questions.every((question) => question.feedbackAr && question.feedbackEn), 'Every question needs bilingual feedback.');
assert(grammar.lesson.masteryScore === 24 && grammar.completion.requiredScore === 24, 'Mastery must be 24/30.');
assert(practice.productionTasks.length === 3, 'Expected three ungraded production tasks.');
assert(manifest.items.length === 16, 'Expected sixteen official audio items.');

for (const item of manifest.items) {
  const filename = item.path.split('/').pop();
  const file = join(root, 'public/audio/level-03/grammar/lesson-01', filename);
  assert(existsSync(file), `Missing audio file: ${filename}`);
  assert(statSync(file).size > 1000, `Audio file is unexpectedly small: ${filename}`);
}

const component = readFileSync(join(root, 'components/level3/LevelThreeGrammar.tsx'), 'utf8');
for (const marker of ['demonstrative-lab', 'hollow-lab', 'maa-lab']) assert(component.includes(marker), `Missing interactive lab: ${marker}`);
assert(component.includes('progressState[3] = true'), 'Grammar mastery is not connected to section progress.');
assert(component.includes("currentQuestion.type === 'transformation'"), 'Transformation normalization is missing.');
assert(component.includes('draggable'), 'Ordering drag support is missing.');
assert(component.includes('handleOrderKey'), 'Ordering keyboard support is missing.');
assert(existsSync(join(root, 'app/levels/B1/lessons/1/grammar/page.tsx')), 'Advanced grammar route is missing.');

console.log('VALID: 3 bilingual modules, 15 rules/examples, 30/30 points, mastery 24, 3 labs, 3 production tasks, 16 audio files, progress and accessibility hooks present.');
