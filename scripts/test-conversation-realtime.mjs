import assert from 'node:assert/strict';
import { formatConversationTime, readRealtimeEvent } from '../lib/conversation-realtime.mjs';

assert.deepEqual(readRealtimeEvent({ type: 'input_audio_buffer.speech_started' }), { status: 'learner-speaking' });
assert.deepEqual(readRealtimeEvent({ type: 'input_audio_buffer.speech_stopped' }), { status: 'understanding' });
assert.deepEqual(readRealtimeEvent({ type: 'response.created' }), { status: 'facilitator-speaking' });
assert.deepEqual(readRealtimeEvent({ type: 'response.done' }), { status: 'learner-turn' });
assert.deepEqual(
  readRealtimeEvent({ type: 'conversation.item.input_audio_transcription.completed', transcript: '  أوافق على القرار  ' }),
  { transcript: { role: 'learner', text: 'أوافق على القرار' } },
);
assert.deepEqual(
  readRealtimeEvent({ type: 'response.output_audio_transcript.done', transcript: 'ما السبب؟' }),
  { transcript: { role: 'facilitator', text: 'ما السبب؟' } },
);
assert.equal(formatConversationTime(0), '00:00');
assert.equal(formatConversationTime(659), '10:59');
assert.equal(formatConversationTime(900), '15:00');
console.log('PASS: realtime events update state/transcript and timer formatting is correct.');
