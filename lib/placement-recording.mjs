export const recorderMimeCandidates = [
  'audio/webm;codecs=opus',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/webm',
  'audio/ogg;codecs=opus',
];

export function selectSupportedAudioMime(isTypeSupported) {
  if (typeof isTypeSupported !== 'function') return '';

  for (const mimeType of recorderMimeCandidates) {
    try {
      if (isTypeSupported(mimeType)) return mimeType;
    } catch {
      // Some older browsers throw instead of returning false.
    }
  }

  return '';
}

export function audioFileExtension(mimeType = '') {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes('mp4') || normalized.includes('m4a')) return 'm4a';
  if (normalized.includes('ogg')) return 'ogg';
  if (normalized.includes('wav')) return 'wav';
  return 'webm';
}

export function hasUsableRecordingPath(recordingPath) {
  return typeof recordingPath === 'string'
    && recordingPath.trim().length > 0
    && recordingPath !== 'pending-upload';
}

export function isSpeakingResponseComplete(response) {
  if (!response || typeof response !== 'object') return false;
  const hasRecording = hasUsableRecordingPath(response.recordingPath);
  const hasWrittenAnswer = typeof response.value === 'string' && response.value.trim().length > 0;
  if (response.answerMode === 'audio') return hasRecording;
  if (response.answerMode === 'text') return hasWrittenAnswer;
  return hasRecording || hasWrittenAnswer;
}
