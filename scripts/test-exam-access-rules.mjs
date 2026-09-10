import assert from 'node:assert/strict';
import { EXAM_REQUIRED_SECTIONS, missingExamSections } from '../lib/exam-access-rules.mjs';

const completeRows = (level) => EXAM_REQUIRED_SECTIONS[level].map((section) => ({ section, status: 'completed' }));

assert.deepEqual(missingExamSections('A1', completeRows('A1')), []);
assert.deepEqual(missingExamSections('A2', completeRows('A2')), []);
assert.deepEqual(missingExamSections('B1', completeRows('B1')), []);
assert.deepEqual(missingExamSections('A1', []), EXAM_REQUIRED_SECTIONS.A1);
assert.deepEqual(missingExamSections('A2', [{ section: 'vocabulary', status: 'in-progress' }]), EXAM_REQUIRED_SECTIONS.A2);
assert.deepEqual(missingExamSections('B1', completeRows('B1').filter((row) => row.section !== 'phrases')), ['phrases']);
assert.deepEqual(missingExamSections('A1', [...completeRows('A1'), { section: 'phrases', status: 'completed' }]), []);

console.log('Server exam prerequisite rules passed.');

