import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { scopedStorageKey } from '../lib/user-scoped-storage.mjs';

const root = process.cwd();
const failures = [];
const checks = [];
const check = (condition, name, details = '') => { checks.push({ name, passed: Boolean(condition), details }); if (!condition) failures.push(`${name}${details ? `: ${details}` : ''}`); };

const reportDirectory = path.join(root, 'lesson-02-review');
fs.mkdirSync(reportDirectory, { recursive: true });
const examPath = path.join(root, 'data/lesson2/exam.ts');
const exam = await import(pathToFileURL(examPath).href);
const scoringAuditPath = path.join(reportDirectory, '.audit-scoring.ts');
const scoringSource = fs.readFileSync(path.join(root, 'data/lesson2/scoring.ts'), 'utf8').replace("from './exam'", `from '${pathToFileURL(examPath).href}'`);
fs.writeFileSync(scoringAuditPath, scoringSource, 'utf8');
const scoring = await import(`${pathToFileURL(scoringAuditPath).href}?v=${Date.now()}`);
const allExamQuestions = [...exam.lesson02Exam.choiceQuestions, exam.lesson02Exam.writingQuestion, exam.lesson02Exam.speakingQuestion];
check(allExamQuestions.length === exam.lesson02Exam.totalQuestions, 'exam question count', `${allExamQuestions.length}/${exam.lesson02Exam.totalQuestions}`);
check(new Set(allExamQuestions.map((question) => question.id)).size === allExamQuestions.length, 'exam question IDs are unique');
check(exam.lesson02Exam.choiceQuestions.every((question) => Number.isInteger(question.answer) && question.answer >= 0 && question.answer < question.options.length), 'exam answer indexes are valid');

const blankSkillPoints = { vocabulary: 0, reading: 0, grammar: 0, listening: 0, conversation: 0, writing: 0, speaking: 0 };
const passed = scoring.calculateExamResult({ ...blankSkillPoints, vocabulary: 4, reading: 4, grammar: 5, listening: 3 }, true);
const failed = scoring.calculateExamResult({ ...blankSkillPoints, vocabulary: 4, reading: 4, grammar: 5, listening: 2 }, true);
check(passed.total === 16 && passed.passed && passed.unlockLessonId === exam.lesson02Exam.unlockOnPass, '16/20 passes and honors the configured unlock target');
check(failed.total === 15 && !failed.passed && failed.unlockLessonId === null, '15/20 fails and does not unlock lesson 3');
check(scoring.retainHighestScore(16, 15) === 16 && scoring.retainHighestScore(15, 16) === 16, 'highest score is retained');
const unvocalizedWriting = scoring.scoreWriting({ name: 'سارة', country: 'المغرب', languages: ['العربية'], study: 'الفصحى', place: '' });
check(unvocalizedWriting.point === 1 && unvocalizedWriting.met >= 3, 'unvocalized writing is accepted');

const localStorageData = new Map();
const sessionStorageData = new Map();
const storageMock = (values) => ({
  getItem: (key) => values.has(key) ? values.get(key) : null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
});
const localStorageMock = storageMock(localStorageData);
globalThis.window = {
  localStorage: localStorageMock,
  sessionStorage: storageMock(sessionStorageData),
  location: { pathname: '/audit/lesson-2', search: '' },
  dispatchEvent: () => true,
};
if (typeof globalThis.CustomEvent === 'undefined') {
  globalThis.CustomEvent = class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };
}
const progressPath = path.join(root, 'lib/lesson2-progress.ts');
const progressAuditPath = path.join(reportDirectory, '.audit-progress.ts');
const progressSource = fs.readFileSync(progressPath, 'utf8')
  .replace("from './learning-progress'", `from '${pathToFileURL(path.join(root, 'lib/learning-progress.ts')).href}'`)
  .replace("from './user-scoped-storage.mjs'", `from '${pathToFileURL(path.join(root, 'lib/user-scoped-storage.mjs')).href}'`);
fs.writeFileSync(progressAuditPath, progressSource, 'utf8');
const progress = await import(`${pathToFileURL(progressAuditPath).href}?v=${Date.now()}`);
for (const section of progress.lesson2SectionOrder) { progress.markLesson2SectionStarted(section); progress.markLesson2SectionComplete(section); }
check(progress.lesson2SectionOrder.length === 5 && progress.isLesson2Complete(), 'all five required sections unlock the exam');
const legacyProgress = JSON.parse(localStorageMock.getItem(scopedStorageKey('darlugha-a1-lesson-2-sections')) || '[]');
check(legacyProgress.length >= 5 && legacyProgress.slice(0, 5).every(Boolean), 'legacy section array is merged without erasing progress');

const manifestSpecs = [
  ['vocabulary', 'public/audio/lesson-02/vocabulary/audio-manifest.json', 'public/audio/lesson-02/vocabulary'],
  ['reading', 'public/audio/lesson-02/reading/audio-manifest.json', 'public/audio/lesson-02/reading'],
  ['listening', 'public/audio/lesson-02/listening/audio-manifest.json', 'public/audio/lesson-02/listening'],
  ['grammar', 'data/lesson2/grammar-manifest.json', 'public/audio/lesson-02/grammar'],
  ['conversation', 'data/lesson2/conversation-manifest.json', 'public/audio/lesson-02/conversation'],
  ['writing', 'data/lesson2/writing-manifest.json', 'public/audio/lesson-02/writing'],
  ['exam', 'data/lesson2/exam-audio-manifest.json', 'public/audio/lesson-02/exam'],
];
const audioRows = [];
const allAudioIds = [];
for (const [section, manifestPath, audioDirectory] of manifestSpecs) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, manifestPath), 'utf8'));
  const clips = Array.isArray(manifest.clips) ? manifest.clips : Object.entries(manifest.clips).map(([id, value]) => ({ id, ...value }));
  const sectionIds = clips.map((clip) => clip.id);
  check(new Set(sectionIds).size === sectionIds.length, `${section} audio IDs are unique`);
  allAudioIds.push(...sectionIds);
  const fileTexts = new Map();
  for (const clip of clips) {
    const filename = path.basename(clip.file);
    const absolute = path.join(root, audioDirectory, filename);
    const exists = fs.existsSync(absolute);
    const size = exists ? fs.statSync(absolute).size : 0;
    let headerValid = false;
    if (exists && size > 3) { const bytes = fs.readFileSync(absolute).subarray(0, 3); headerValid = bytes.toString('ascii') === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0); }
    const previousText = fileTexts.get(filename);
    const sameText = !previousText || previousText === clip.text;
    fileTexts.set(filename, clip.text);
    audioRows.push({ section, activity: clip.usage || clip.category || 'lesson-audio', audioId: clip.id, arabicText: clip.text || '', filename, status: exists && size > 0 && headerValid && sameText ? 'Verified file and mapping metadata' : 'Problem', problem: !exists ? 'Missing file' : !size ? 'Empty file' : !headerValid ? 'Invalid MP3 header' : !sameText ? 'One filename mapped to different texts' : '' });
    check(exists && size > 0, `${section}/${clip.id} file exists and is non-empty`);
    check(headerValid, `${section}/${clip.id} has an MP3-compatible header`);
    check(sameText, `${section}/${clip.id} filename is not mapped to conflicting text`);
  }
}
check(new Set(allAudioIds).size === allAudioIds.length, 'audio IDs are globally unique across lesson 2');

const csvEscape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const csv = ['Section,Activity,Audio ID,Arabic text,Filename,Status,Problem', ...audioRows.map((row) => [row.section, row.activity, row.audioId, row.arabicText, row.filename, row.status, row.problem].map(csvEscape).join(','))].join('\r\n');
fs.writeFileSync(path.join(reportDirectory, 'LESSON-02-AUDIO-AUDIT.csv'), `\uFEFF${csv}`, 'utf8');
fs.writeFileSync(path.join(reportDirectory, 'lesson-02-test-results.json'), JSON.stringify({ checks, summary: { total: checks.length, passed: checks.filter((item) => item.passed).length, failed: failures.length, audioRows: audioRows.length } }, null, 2), 'utf8');
fs.rmSync(scoringAuditPath, { force: true });
fs.rmSync(progressAuditPath, { force: true });

console.log(JSON.stringify({ totalChecks: checks.length, failed: failures.length, audioRows: audioRows.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
