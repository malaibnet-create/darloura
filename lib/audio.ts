export const AUDIO_ERROR_EVENT = 'darlugha-audio-error';

type AudioErrorDetail = {
  text: string;
  audioUrl?: string;
  reason: 'file-playback' | 'arabic-voice-unavailable' | 'audio-unavailable';
};

let recordedPlayer: HTMLAudioElement | null = null;
let playbackGeneration = 0;

function reportAudioError(detail: AudioErrorDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<AudioErrorDetail>(AUDIO_ERROR_EVENT, { detail }));
}

export function stopArabicAudio() {
  playbackGeneration += 1;
  if (recordedPlayer) {
    recordedPlayer.pause();
    recordedPlayer.currentTime = 0;
  }
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
}

function playWithArabicVoice(text: string, rate: number, generation: number) {
  const synth = window.speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
    reportAudioError({ text, reason: 'audio-unavailable' });
    return;
  }

  const speak = () => {
    if (generation !== playbackGeneration) return;
    const voice = synth.getVoices().find((item) => item.lang.toLowerCase().startsWith('ar'));
    if (!voice) {
      reportAudioError({ text, reason: 'arabic-voice-unavailable' });
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voice.lang || 'ar-SA';
    utterance.voice = voice;
    utterance.rate = rate;
    synth.cancel();
    synth.resume();
    synth.speak(utterance);
  };

  if (synth.getVoices().length > 0) {
    speak();
    return;
  }

  let resolved = false;
  const onVoicesChanged = () => {
    if (resolved) return;
    resolved = true;
    synth.removeEventListener('voiceschanged', onVoicesChanged);
    speak();
  };
  synth.addEventListener('voiceschanged', onVoicesChanged, { once: true });
  window.setTimeout(() => {
    if (resolved) return;
    resolved = true;
    synth.removeEventListener('voiceschanged', onVoicesChanged);
    speak();
  }, 500);
}

/**
 * Plays one supplied recording, or uses an installed Arabic system voice when
 * no recording exists. A failed recording never falls back to a non-Arabic
 * voice, because that produces misleading pronunciation.
 */
export function playArabic(text: string, audioUrl?: string, rate = 0.82): boolean {
  if (typeof window === 'undefined') return false;

  stopArabicAudio();
  const generation = playbackGeneration;

  if (audioUrl) {
    if (!recordedPlayer) {
      recordedPlayer = new Audio();
      recordedPlayer.preload = 'none';
    }
    const player = recordedPlayer;
    player.src = audioUrl;
    player.currentTime = 0;
    player.playbackRate = rate;
    player.onerror = () => {
      if (generation !== playbackGeneration) return;
      reportAudioError({ text, audioUrl, reason: 'file-playback' });
    };
    void player.play().catch(() => {
      if (generation !== playbackGeneration) return;
      reportAudioError({ text, audioUrl, reason: 'file-playback' });
    });
    return true;
  }

  playWithArabicVoice(text, rate, generation);
  return true;
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', stopArabicAudio);
}
