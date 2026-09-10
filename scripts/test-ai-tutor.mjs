import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { formatConversationTime, readRealtimeEvent } from '../lib/conversation-realtime.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFile(path.join(root, relative), 'utf8');

assert.equal(formatConversationTime(0), '00:00');
assert.equal(formatConversationTime(125), '02:05');
assert.deepEqual(readRealtimeEvent({ type: 'input_audio_buffer.speech_started' }), { status: 'learner-speaking' });
assert.deepEqual(readRealtimeEvent({ type: 'response.cancelled' }), { status: 'learner-turn' });
assert.deepEqual(readRealtimeEvent({ type: 'conversation.item.input_audio_transcription.completed', transcript: 'مَرْحَبًا' }), { transcript: { role: 'learner', text: 'مَرْحَبًا' } });
assert.deepEqual(readRealtimeEvent({ type: 'response.output_audio_transcript.done', transcript: 'أَهْلًا' }), { transcript: { role: 'facilitator', text: 'أَهْلًا' } });

const [ui, realtime, curriculum, migration, prompt] = await Promise.all([
  read('app/ai-tutor/AiTutorClient.tsx'),
  read('app/api/ai-tutor/realtime/route.ts'),
  read('lib/ai-tutor/curriculum-service.ts'),
  read('supabase/migrations/013_ai_tutor_sessions.sql'),
  read('lib/ai-tutor/prompts.ts'),
]);

for (const mode of ['lesson_review', 'vocabulary', 'free_conversation', 'role_play', 'grammar', 'pronunciation']) {
  assert.ok(ui.includes(mode), `UI is missing ${mode}`);
  assert.ok(prompt.includes(`${mode}:`), `Prompt is missing ${mode}`);
}
for (const source of ['data/lesson1/vocabulary.ts', 'data/lesson2/vocabulary.ts', 'data/level2/lesson-01-vocabulary-source/vocabulary.json', 'data/level3/vocabulary.ts']) {
  assert.ok(curriculum.includes(source), `Curriculum index is missing ${source}`);
}
assert.ok(realtime.includes("'OpenAI-Safety-Identifier'"), 'Realtime requests need a stable safety identifier');
assert.ok(realtime.includes('interrupt_response: true'), 'Realtime session must allow natural interruption');
assert.ok(!ui.includes('process.env.OPENAI_API_KEY'), 'The client UI must never read the OpenAI API key');
assert.ok(ui.includes('تشغيل صوت الأستاذ · Play tutor audio'), 'The UI needs an explicit audio-unlock action when autoplay is blocked');
assert.ok(ui.includes("setAttribute('playsinline', '')"), 'Remote tutor audio should opt into inline playback on mobile');
assert.ok(migration.includes('where status = \'active\''), 'The database must enforce one active session per account');
assert.ok(migration.includes('enable row level security'), 'Tutor tables must enable RLS');
assert.ok(!/audio_(blob|file|recording)/i.test(migration), 'The tutor schema must not store raw audio');

console.log('AI Tutor checks passed: realtime events, six modes, curriculum sources, interruption, RLS, concurrency, and no raw-audio storage.');
