import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  audioFileExtension,
  isSpeakingResponseComplete,
  selectSupportedAudioMime,
} from '../lib/placement-recording.mjs';
import { resolveStudentDisplayName } from '../lib/student-display-name.mjs';

assert.equal(
  selectSupportedAudioMime((mimeType) => mimeType === 'audio/webm;codecs=opus'),
  'audio/webm;codecs=opus',
  'Chromium-compatible WebM/Opus should be selected when supported.',
);
assert.equal(
  selectSupportedAudioMime((mimeType) => mimeType === 'audio/mp4'),
  'audio/mp4',
  'Safari-compatible MP4 should be selected when WebM is unavailable.',
);
assert.equal(selectSupportedAudioMime(() => false), '', 'The browser default should be used as the final fallback.');
assert.equal(audioFileExtension('audio/mp4;codecs=mp4a.40.2'), 'm4a');
assert.equal(audioFileExtension('audio/webm;codecs=opus'), 'webm');
assert.equal(audioFileExtension('audio/ogg;codecs=opus'), 'ogg');

assert.equal(isSpeakingResponseComplete({ recordingPath: 'user/speaking-20.webm' }), true);
assert.equal(isSpeakingResponseComplete({ value: 'أنا أعيش في الرباط.' }), true);
assert.equal(isSpeakingResponseComplete({ answerMode: 'text', value: 'أنا أعيش في الرباط.' }), true);
assert.equal(isSpeakingResponseComplete({ answerMode: 'audio', value: 'إجابة قديمة' }), false);
assert.equal(isSpeakingResponseComplete({ answerMode: 'text', recordingPath: 'user/old-recording.m4a' }), false);
assert.equal(isSpeakingResponseComplete({ value: '   ', recordingPath: 'pending-upload' }), false);
assert.equal(isSpeakingResponseComplete(undefined), false);

assert.equal(
  resolveStudentDisplayName({ profileName: '  Amina  ', metadataName: 'Ben', email: 'student@example.com' }),
  'Amina',
  'The saved profile name must take priority over metadata or a placeholder.',
);
assert.equal(resolveStudentDisplayName({ metadataName: 'Youssef', email: 'student@example.com' }), 'Youssef');
assert.equal(resolveStudentDisplayName({ email: 'meryem@example.com' }), 'meryem');
assert.equal(resolveStudentDisplayName({}), 'طالب DarLugha');

const [component, submitRoute, dashboard, nextConfig] = await Promise.all([
  readFile(new URL('../components/placement/PlacementTest.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../app/api/placement/submit/route.ts', import.meta.url), 'utf8'),
  readFile(new URL('../app/dashboard/page.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../next.config.ts', import.meta.url), 'utf8'),
]);

assert.match(component, /mediaRecorder\.start\(1000\)/, 'Recording should emit mobile-friendly timed chunks.');
assert.match(component, /Type instead/, 'Speaking questions need a written fallback.');
assert.match(component, /Site settings/, 'English microphone permission help must be present.');
assert.match(component, /maximumSeconds \* 1000/, 'Recordings must stop at the question limit.');
assert.match(submitRoute, /isSpeakingResponseComplete/, 'The API must accept either audio or written speaking answers.');
assert.match(nextConfig, /microphone=\(self\)/, 'The placement page must allow its own microphone permission.');
assert.match(dashboard, /from\('profiles'\)/, 'The dashboard should read the saved student profile.');
assert.match(dashboard, /resolveStudentDisplayName/, 'The dashboard should use the deterministic name resolver.');

console.log('Placement mobile recording, written fallback, and student-name checks passed.');
