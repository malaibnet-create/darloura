import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stableShuffle } from '../lib/stable-shuffle.ts';
import { isLessonSectionAvailable } from '../lib/curriculum.mjs';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

function readExportedJson(path) {
  const source = read(path);
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  assert(start >= 0 && end > start, `${path} does not contain an exported object.`);
  return JSON.parse(source.slice(start, end + 1));
}

const vocabularyUi = read('components/lesson2/LessonTwoVocabulary.tsx');
assert.match(vocabularyUi, /lessonTwoVocabulary\.map\(/, 'All lesson-two vocabulary cards must render in one list.');
assert.match(vocabularyUi, /PRACTICE_PROGRESS_KEY/, 'Vocabulary practice position must be persisted.');
assert.doesNotMatch(vocabularyUi, /className="practice-start"[^>]*disabled=!\{?allViewed/, 'Practice must remain accessible without an unreliable scroll gate.');

const readingUi = read('components/lesson2/LessonTwoReading.tsx');
const listeningUi = read('components/lesson2/LessonTwoListening.tsx');
assert.match(readingUi, /stableShuffle/, 'Reading choices must be shuffled.');
assert.match(listeningUi, /stableShuffle/, 'Listening choices must be shuffled.');

const reading = readExportedJson('data/lesson2/reading-practice.ts');
const readingQuestions = [
  ...reading.prediction,
  ...reading.gist,
  ...reading.details,
  ...reading.trueFalse.map((question) => ({
    ...question,
    choices: ['صحيح', 'خطأ'],
    answer: question.answer ? 'صحيح' : 'خطأ',
  })),
];
const readingPositions = readingQuestions.map((question) => stableShuffle(question.choices, question.id).indexOf(question.answer));
assert(new Set(readingPositions).size > 1, 'Reading correct answers must not remain in one visual position.');
assert(readingPositions.some((position) => position > 0), 'At least one reading correct answer must move away from the first position.');

const listening = readExportedJson('data/lesson2/listening-practice.ts');
const listeningQuestions = [
  ...listening.prediction,
  listening.gist,
  ...listening.details,
].map((question) => ({ ...question, answerText: question.options[question.answer] }));
const listeningPositions = listeningQuestions.map((question) => stableShuffle(question.options, question.id).indexOf(question.answerText));
assert(new Set(listeningPositions).size > 1, 'Listening correct answers must not remain in one visual position.');
assert(listeningPositions.some((position) => position > 0), 'At least one listening correct answer must move away from the first position.');

const grammarUi = read('components/lesson2/LessonTwoGrammar.tsx');
assert.match(grammarUi, /grammar-pronoun-grid/, 'Plural pronouns must use the responsive card grid.');
assert.match(grammarUi, /disabledAudioIds = new Set\(\['g2-verb-yatakalluna'\]\)/, 'The known incorrect هُمْ يَتَكَلَّمُونَ recording must remain disabled.');
assert.match(grammarUi, /Match each pronoun with its verb/, 'The pronoun matching activity needs an explicit learner-facing purpose.');

for (const removedSection of ['writing', 'phrases']) {
  assert.equal(isLessonSectionAvailable('A1', 2, removedSection), false, `A1 lesson two must not expose ${removedSection}.`);
}

console.log(`VALID A1 lesson 2: all-card vocabulary flow, resumable practice, shuffled reading/listening answers, clear grammar matching, and incorrect audio disabled. Reading positions: ${readingPositions.join(',')}; listening positions: ${listeningPositions.join(',')}.`);
