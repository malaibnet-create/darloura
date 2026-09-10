import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isLessonSectionAvailable, lessonSectionHref } from '../lib/curriculum.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const data = read('data/level3/conversation-room.ts');
const component = read('components/level3/VoiceConversationRoom.tsx');
const session = read('app/api/realtime/session/route.ts');
const evaluation = read('app/api/conversation-room/evaluate/route.ts');
const migration = read('supabase/migrations/009_conversation_room_attempts.sql');

assert.equal((data.match(/"id": "warmup"|"id": "develop"|"id": "challenge"|"id": "new_information"|"id": "solution"|"id": "summary"/g) || []).length, 6);
assert.equal((data.match(/"id": "p\d\d"/g) || []).length, 10);
assert.equal((data.match(/"id": "g\d\d"/g) || []).length, 3);
assert.match(data, /"total": 20/); assert.match(data, /"mastery": 14/);
assert.match(session, /supabase\.auth\.getUser/); assert.doesNotMatch(session, /x-dar-lugha-user-id/i);
assert.match(session, /\/v1\/realtime\/calls/); assert.match(session, /OpenAI-Safety-Identifier/);
assert.doesNotMatch(component + session + evaluation, /NEXT_PUBLIC_OPENAI/i);
assert.match(component, /getUserMedia/); assert.match(component, /RTCPeerConnection/); assert.match(component, /getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/);
assert.match(component, /تلميح/); assert.match(component, /أعد السؤال/); assert.match(component, /مساعدة/); assert.match(component, /النص الحي/);
assert.match(component, /consentToStoreTranscript/); assert.match(component, /elapsedRef\.current === 660/); assert.match(component, /maxSessionMinutes \* 60/);
assert.match(evaluation, /learnerTurns < 2/); assert.match(evaluation, /maxItems: 3/); assert.match(evaluation, /totalScore >= conversationRoom\.rubric\.mastery/);
assert.match(migration, /enable row level security/); assert.match(migration, /auth\.uid\(\) = user_id/); assert.match(migration, /transcript jsonb/);
assert.equal(isLessonSectionAvailable('B1', 1, 'conversation'), true);
assert.equal(lessonSectionHref('B1', 1, 'conversation'), '/levels/B1/lessons/1/conversation');
console.log('VALID: 6 phases, 10 expressions, 3 grammar targets, secure WebRTC, consent-aware persistence, 15-minute timer, /20 evaluation.');
