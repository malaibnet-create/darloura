export const recorderMimeCandidates: readonly string[];

export function selectSupportedAudioMime(
  isTypeSupported: ((mimeType: string) => boolean) | undefined,
): string;

export function audioFileExtension(mimeType?: string): 'm4a' | 'ogg' | 'wav' | 'webm';

export function hasUsableRecordingPath(recordingPath?: unknown): boolean;

export function isSpeakingResponseComplete(response?: {
  value?: number | string;
  recordingPath?: string;
  answerMode?: 'audio' | 'text';
} | null): boolean;
