import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isLessonSectionAvailable, lessonSectionHref } from '../lib/curriculum.mjs';

const root = process.cwd();
const requiredFiles = [
  'data/level2/lesson-01-conversation-source/conversation-room.source.json',
  'data/level2/lesson-01-conversation-source/facilitator.prompt.md',
  'data/level2/lesson-01-conversation-source/evaluator.prompt.md',
  'data/level2/conversation-room-private.ts',
  'data/level2/conversation-room-safe.ts',
  'components/level2/LevelTwoLessonOneConversationRoom.tsx',
  'app/levels/A2/lessons/1/conversation/page.tsx',
  'app/api/level2-conversation/config/route.ts',
  'app/api/level2-conversation/session/route.ts',
  'app/api/level2-conversation/evaluate/route.ts',
  'app/level2-conversation.css',
];

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) throw new Error(`Missing required file: ${file}`);
}

const source = JSON.parse(readFileSync(resolve(root, requiredFiles[0]), 'utf8'));
const component = readFileSync(resolve(root, 'components/level2/LevelTwoLessonOneConversationRoom.tsx'), 'utf8');
const configRoute = readFileSync(resolve(root, 'app/api/level2-conversation/config/route.ts'), 'utf8');
const sessionRoute = readFileSync(resolve(root, 'app/api/level2-conversation/session/route.ts'), 'utf8');
const evaluateRoute = readFileSync(resolve(root, 'app/api/level2-conversation/evaluate/route.ts'), 'utf8');

const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(source.lessonId === 'level-02-lesson-01-conversation-room', 'Wrong lesson id.');
assert(source.phases.length === 5, 'Expected exactly five phases.');
assert(source.challengeBank.length === 4, 'Expected exactly four hidden challenges.');
assert(source.targetVocabulary.length === 16, 'Expected exactly sixteen vocabulary families.');
assert(source.grammarTargets.length === 2, 'Expected exactly two grammar targets.');
assert(source.rubric.total === 20 && source.rubric.mastery === 14, 'Rubric must be 20 points with mastery at 14.');
assert(source.activationRules.minimumLearnerTurns === 8, 'Minimum learner turns must remain eight.');
assert(source.technical.maxSessionMinutes === 10, 'Maximum session length must remain ten minutes.');

assert(configRoute.includes('getSafeConversationRoomConfig'), 'Public config route must expose an allow-listed object.');
assert(!configRoute.includes('challengeBank:'), 'Public config must not expose the challenge bank.');
assert(!configRoute.includes('facilitatorPrompt'), 'Public config must not expose the facilitator prompt.');
assert(sessionRoute.includes("createServerSupabaseClient"), 'Session route must authenticate through Supabase.');
assert(sessionRoute.includes("/v1/realtime/calls"), 'Session route must use the Realtime WebRTC call endpoint.');
assert(sessionRoute.includes('100_000'), 'Session route must enforce the SDP size limit.');
assert(sessionRoute.includes('randomInt'), 'A hidden challenge must be selected on the server.');
assert(sessionRoute.includes('OpenAI-Safety-Identifier'), 'Session route must send a safety identifier.');
assert(evaluateRoute.includes("conversation_room_attempts"), 'Evaluation route must persist consented attempts.');
assert(evaluateRoute.includes('consentToStoreResults'), 'Evaluation persistence must require explicit consent.');
assert(evaluateRoute.includes("learnerTurns < 2"), 'Short transcripts must produce an incomplete report.');
assert(component.includes('new MediaStream()'), 'The text accessibility fallback must work without microphone capture.');
assert(component.includes('captionsDefault: false'), 'Captions must default to off.');
assert(component.includes('sections[4] = true'), 'Mastery must update the A2 conversation progress index.');
assert(component.includes('consentToStoreResults'), 'The UI must request storage consent.');
assert(isLessonSectionAvailable('A2', 1, 'conversation'), 'A2 lesson one must expose the conversation room.');
assert(lessonSectionHref('A2', 1, 'conversation') === '/levels/A2/lessons/1/conversation', 'The A2 conversation route is not registered correctly.');

console.log('VALID: A2 lesson 1 conversation room; exact package data; hidden challenge; secure WebRTC; consented persistence; 20-point report.');
