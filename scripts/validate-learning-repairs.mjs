import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CURRICULUM_LEVELS, isLessonSectionAvailable, lessonSectionHref } from '../lib/curriculum.mjs';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const progress = read('lib/learning-progress.ts');
assert(progress.includes("A1: ['vocabulary', 'reading', 'listening', 'grammar', 'conversation']"), 'A1 must contain exactly five required sections.');
assert(progress.includes("lastLocationKey = 'darlugha-last-learning-location'"), 'Last learning location is not persisted.');
assert(progress.includes('hydrateLearningDataFromCloud'), 'Cross-device cloud hydration is missing.');
assert(progress.includes("from('learning_section_progress').upsert"), 'Section progress is not synchronized to Supabase.');
assert(progress.includes("from('learning_review_items').upsert"), 'Review items are not synchronized to Supabase.');
const syncMigration = read('supabase/migrations/012_learning_progress_and_review_sync.sql');
assert(syncMigration.includes('enable row level security'), 'Cloud learning tables must have RLS enabled.');
assert(syncMigration.includes('auth.uid() = user_id'), 'Cloud learning policies must isolate each student.');

const level = read('app/levels/[levelCode]/page.tsx');
const expectedA1Sections = ['vocabulary', 'reading', 'listening', 'grammar', 'conversation'];
assert(CURRICULUM_LEVELS.A1.lessons.length === 2, 'A1 must retain exactly two lessons.');
assert(CURRICULUM_LEVELS.A1.lessons.every((lesson) => JSON.stringify(lesson.sections) === JSON.stringify(expectedA1Sections)), 'A1 lesson sections do not match the unified five-section structure.');
for (const lesson of CURRICULUM_LEVELS.A1.lessons) {
  assert(!isLessonSectionAvailable('A1', lesson.number, 'writing'), `A1 lesson ${lesson.number} still exposes Writing.`);
  assert(!isLessonSectionAvailable('A1', lesson.number, 'phrases'), `A1 lesson ${lesson.number} still exposes Phrases.`);
  assert(lessonSectionHref('A1', lesson.number, 'writing') === null, `A1 lesson ${lesson.number} still resolves a Writing route.`);
}
assert(level.includes('visibleSections') && level.includes('isLessonSectionAvailable'), 'The level page is not driven by the curriculum section registry.');
assert(level.includes("'Completed ✓'"), 'A1 completion label is not English.');

const lessonRedirect = read('app/lessons/[lessonId]/page.tsx');
assert(lessonRedirect.includes('redirect(`/levels/A1?lesson=${lessonId}`)'), 'Legacy lesson hub does not redirect to the canonical level page.');

const vocabulary = read('components/lesson1/VocabularyPractice.tsx');
assert(vocabulary.includes("if (normalized === 'عمر') return false"), 'The incorrect age audio was not disabled.');
assert(vocabulary.includes('LessonCompletion'), 'Vocabulary does not use the shared completion view.');

const listening = read('components/lesson1/ListeningLesson.tsx');
assert(listening.includes('useMemo(() => question ? shuffle(question.choices)'), 'Listening choices are not shuffled per question.');
assert(listening.includes('LessonCompletion'), 'Listening does not use the shared completion view.');

for (const path of ['components/lesson1/ReadingLesson.tsx', 'components/lesson1/GrammarLesson.tsx', 'components/lesson1/SpeakingLesson.tsx']) {
  assert(read(path).includes('LessonCompletion'), `${path} does not use the shared completion view.`);
}

assert(read('app/review/page.tsx').includes('getReviewItems'), 'Review page is not connected to saved review items.');
const signup = read('app/signup/page.tsx');
assert(signup.includes("window.sessionStorage.setItem('darlugha-pending-signup'") && signup.includes("router.push('/verify')"), 'Signup does not hand off safely to numeric verification.');
assert(read('app/reset-password/page.tsx').includes("type: 'recovery'"), 'Password recovery does not verify the numeric recovery token.');
const otpSetup = read('supabase/EMAIL-OTP-SETUP.md');
assert(otpSetup.includes('confirm-signup.html') && otpSetup.includes('reset-password.html'), 'Supabase OTP template instructions are missing.');
for (const template of ['supabase/email-templates/confirm-signup.html', 'supabase/email-templates/reset-password.html']) {
  const markup = read(template);
  assert(markup.includes('{{ .Token }}') && !markup.includes('{{ .ConfirmationURL }}'), `${template} must send a numeric token without a confirmation link.`);
}

console.log('PASS: A1 section removal, canonical navigation, shared completion, language policy, listening shuffle, age-audio guard, review hub, local/cloud progress persistence with RLS, and numeric email OTP flows.');
