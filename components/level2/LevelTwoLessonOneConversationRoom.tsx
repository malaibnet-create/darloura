'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatConversationTime, readRealtimeEvent } from '../../lib/conversation-realtime.mjs';
import { markSectionComplete } from '../../lib/learning-progress';
import { userStorage as localStorage } from '../../lib/user-scoped-storage.mjs';
import LessonCompletion from '../learning/LessonCompletion';

type RoomStatus = 'idle' | 'connecting' | 'facilitator-speaking' | 'learner-turn' | 'learner-speaking' | 'understanding' | 'paused' | 'ended' | 'error';
type TranscriptEntry = { role: 'learner' | 'facilitator'; text: string };
type HelpKind = 'hint' | 'rephrase' | 'bilingual';
export type RoomConfig = {
  lessonId: string;
  titleAr: string;
  titleEn: string;
  estimatedMinutes: { minimum: number; maximum: number };
  scenario: { settingAr: string; settingEn: string; learnerRoleAr: string };
  learningObjectives: readonly { id: string; ar: string; en: string }[];
  targetVocabulary: readonly { id: string; family: string; meaningEn: string }[];
  grammarTargets: readonly { id: string; labelAr: string; labelEn: string; minimumCorrectUses: number; examples: readonly string[] }[];
  phases: readonly { id: string; order: number; titleAr: string; goalAr: string; minimumLearnerTurns: number }[];
  activationRules: {
    minimumLearnerTurns: number; minimumUniqueVocabularyFamilies: number;
    minimumGrammarUses: { g01: number; g02: number }; requireChallengeResponse: boolean; requireFinalSummary: boolean;
  };
  helpLevels: readonly { id: HelpKind; labelAr: string; limit: number }[];
  rubric: { total: number; mastery: number; dimensions: readonly { id: string; labelAr: string; max: number; note?: string }[] };
  ui: { primaryActionAr: string; captionsDefault: boolean; allowTextFallback: boolean };
  maxSessionMinutes: number;
};
type Evaluation = {
  evaluationStatus: 'complete' | 'incomplete'; total: number; mastery: boolean;
  dimensions: { id: string; score: number; max: number; evidenceAr: string }[];
  usedVocabulary: { id: string; heardForm: string; evidence: string; correct: boolean }[];
  vocabularyTargetMet?: boolean;
  grammarEvidence: { anSubjunctive: string[]; prepositionMasdar: string[] };
  strengthsAr: string[]; nextStepsAr: string[];
  corrections: { original: string; corrected: string; explanationAr: string; explanationEn: string }[];
  bestScore?: number; persistence?: 'database' | 'local' | 'none';
};

const DEFAULT_CONFIG: RoomConfig = {
  lessonId: 'level-02-lesson-01-conversation-room',
  titleAr: 'غرفة المحادثة: نُخَطِّطُ لِوَرْشَةٍ ثَقَافِيَّةٍ',
  titleEn: 'Conversation Room: Planning a Cultural Workshop',
  estimatedMinutes: { minimum: 6, maximum: 8 },
  scenario: {
    settingAr: 'اجتماع قصير بين عضوين في فريق طلابي لتخطيط ورشة ثقافية للطلاب الجدد.',
    settingEn: 'A short meeting between two student-team members planning a cultural workshop for new students.',
    learnerRoleAr: 'عضو في فريق التنظيم يختار موضوع الورشة، يوزع العمل، ويعالج مشكلة مفاجئة.',
  },
  learningObjectives: [], targetVocabulary: [], grammarTargets: [], phases: [],
  activationRules: {
    minimumLearnerTurns: 8, minimumUniqueVocabularyFamilies: 8,
    minimumGrammarUses: { g01: 2, g02: 2 }, requireChallengeResponse: true, requireFinalSummary: true,
  },
  helpLevels: [
    { id: 'hint', labelAr: 'كلمات مساعدة', limit: 2 },
    { id: 'rephrase', labelAr: 'أعد السؤال', limit: 3 },
    { id: 'bilingual', labelAr: 'شرح إنجليزي', limit: 2 },
  ],
  rubric: { total: 20, mastery: 14, dimensions: [] },
  ui: { primaryActionAr: 'ابدأ المحادثة الصوتية', captionsDefault: false, allowTextFallback: true },
  maxSessionMinutes: 10,
};

const STORAGE_KEY = 'darlugha-a2-lesson-1-conversation';
const LEVEL_PROGRESS_KEY = 'darlugha-a2-lesson-1-sections';
const SESSION_ENDPOINT = '/api/level2-conversation/session';
const EVALUATION_ENDPOINT = '/api/level2-conversation/evaluate';

const statusLabels: Record<RoomStatus, string> = {
  idle: 'جاهز للبدء · Ready', connecting: 'جاري الاتصال · Connecting', 'facilitator-speaking': 'المحاور يتحدث · Facilitator speaking',
  'learner-turn': 'دورك في الكلام · Your turn', 'learner-speaking': 'أنت تتحدث الآن · You are speaking', understanding: 'جاري فهم إجابتك · Understanding',
  paused: 'متوقف مؤقتًا · Paused', ended: 'انتهت المحادثة · Ended', error: 'تعذر الاتصال · Connection failed',
};

function getErrorMessage(code: string) {
  const messages: Record<string, string> = {
    AUTH_REQUIRED: 'يجب تسجيل الدخول أولًا لبدء غرفة المحادثة.',
    VOICE_SERVICE_NOT_CONFIGURED: 'خدمة المحادثة الصوتية غير مهيأة في الخادم. أضف إعدادات OpenAI ثم أعد المحاولة.',
    VOICE_RATE_LIMITED: 'بدأتَ محاولات كثيرة خلال وقت قصير. انتظر قليلًا ثم أعد المحاولة.',
    VOICE_LIMIT_REACHED: 'تم بلوغ حد OpenAI أو لا يوجد رصيد كافٍ مؤقتًا.',
    VOICE_SESSION_FAILED: 'تعذر إنشاء الجلسة الصوتية. تحقق من الاتصال وإعدادات OpenAI.',
    EVALUATION_NOT_CONFIGURED: 'خدمة التقييم غير مهيأة في الخادم.',
    EVALUATION_LIMIT_REACHED: 'تم بلوغ حد التقييم مؤقتًا. حاول لاحقًا.',
    EVALUATION_FAILED: 'تعذر إعداد التقرير الآن. يمكنك إعادة المحاولة.',
  };
  return messages[code] || 'حدث خطأ غير متوقع. حاول مرة أخرى.';
}

function normalizeArabic(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ـ/g, '')
    .toLowerCase();
}

function ControlIcon({ name }: { name: 'mic' | 'pause' | 'captions' | 'keyboard' | 'volume' | 'end' | 'help' }) {
  const paths: Record<typeof name, React.ReactNode> = {
    mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></>,
    pause: <><path d="M8 5v14M16 5v14" /></>,
    captions: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10 10H8a2 2 0 0 0 0 4h2M18 10h-2a2 2 0 0 0 0 4h2" /></>,
    keyboard: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10h.01M11 10h.01M15 10h.01M18 10h.01M8 14h8" /></>,
    volume: <><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" /></>,
    end: <><path d="M6 6l12 12M18 6 6 18" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.8 9a2.3 2.3 0 1 1 3.6 1.9c-1 .7-1.4 1.2-1.4 2.1M12 17h.01" /></>,
  };
  return <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function LevelTwoLessonOneConversationRoom({ initialConfig }: { initialConfig?: RoomConfig }) {
  const [config, setConfig] = useState<RoomConfig>(initialConfig || DEFAULT_CONFIG);
  const [screen, setScreen] = useState<'intro' | 'live' | 'evaluating' | 'report'>('intro');
  const [status, setStatus] = useState<RoomStatus>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [volume, setVolume] = useState(0.9);
  const [captions, setCaptions] = useState(false);
  const [textFallback, setTextFallback] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState('');
  const [helpUsage, setHelpUsage] = useState<Record<HelpKind, number>>({ hint: 0, rephrase: 0, bilingual: 0 });
  const [consentToStoreResults, setConsentToStoreResults] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [connected, setConnected] = useState(false);
  const [microphoneAvailable, setMicrophoneAvailable] = useState(false);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const helpUsageRef = useRef<Record<HelpKind, number>>({ hint: 0, rephrase: 0, bilingual: 0 });
  const elapsedRef = useRef(0);
  const startedAtRef = useRef<string | null>(null);
  const endingRef = useRef(false);

  useEffect(() => {
    if (initialConfig) return;
    fetch('/api/level2-conversation/config', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((value: RoomConfig) => setConfig(value))
      .catch(() => setError('تعذر تحميل تفاصيل الحزمة كاملة، لكن يمكنك إعادة فتح الصفحة والمحاولة.'));
  }, [initialConfig]);
  const learnerTurns = transcript.filter((entry) => entry.role === 'learner');
  const approximateVocabulary = useMemo(() => {
    const text = normalizeArabic(learnerTurns.map((entry) => entry.text).join(' '));
    return config.targetVocabulary.filter((item) => item.family.split('/').some((form) => {
      const normalized = normalizeArabic(form.trim());
      return normalized.length > 2 && text.includes(normalized);
    }));
  }, [config.targetVocabulary, learnerTurns]);

  function addTranscript(entry?: TranscriptEntry) {
    if (!entry?.text) return;
    const last = transcriptRef.current.at(-1);
    if (last?.role === entry.role && last.text === entry.text) return;
    const next = [...transcriptRef.current, entry];
    transcriptRef.current = next;
    setTranscript(next);
  }

  const cleanupMedia = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    channelRef.current?.close();
    peerRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
    }
    channelRef.current = null;
    peerRef.current = null;
    streamRef.current = null;
  }, []);

  useEffect(() => () => cleanupMedia(), [cleanupMedia]);
  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  function sendEvent(event: Record<string, unknown>) {
    if (channelRef.current?.readyState === 'open') {
      channelRef.current.send(JSON.stringify(event));
      return true;
    }
    return false;
  }

  function requestVoiceResponse(instructions: string) {
    return sendEvent({ type: 'response.create', response: { output_modalities: ['audio'], instructions } });
  }

  function startClock() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
      if (elapsedRef.current === 480) {
        requestVoiceResponse('اقتربت المدة المستهدفة من نهايتها. انتقل بلطف إلى مرحلة القرار والخلاصة، واطلب من الطالب تلخيص الخطة في ثلاث جمل.');
      }
      if (elapsedRef.current >= config.maxSessionMinutes * 60) void finishConversation(true);
    }, 1000);
  }

  async function startConversation(withMicrophone = true) {
    cleanupMedia();
    setConnected(false); setMicrophoneAvailable(false);
    setError(''); setEvaluation(null); setStatus('connecting'); setScreen('live'); setTextFallback(!withMicrophone);
    transcriptRef.current = []; setTranscript([]);
    helpUsageRef.current = { hint: 0, rephrase: 0, bilingual: 0 };
    setHelpUsage({ hint: 0, rephrase: 0, bilingual: 0 });
    elapsedRef.current = 0; setElapsed(0); endingRef.current = false;
    setMuted(false); setPaused(false);

    try {
      const stream = withMicrophone
        ? await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
        : new MediaStream();
      streamRef.current = stream;
      setMicrophoneAvailable(stream.getAudioTracks().length > 0);
      const peer = new RTCPeerConnection();
      peerRef.current = peer;
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      const audio = new Audio();
      audio.autoplay = true;
      audio.volume = volume;
      audioRef.current = audio;
      peer.ontrack = (event) => {
        audio.srcObject = event.streams[0];
        void audio.play().catch(() => setError('اضغط على الصفحة مرة واحدة للسماح بتشغيل صوت المحاور.'));
      };

      const channel = peer.createDataChannel('oai-events');
      channelRef.current = channel;
      channel.onmessage = ({ data }) => {
        try {
          const change = readRealtimeEvent(JSON.parse(data));
          if (change.status) setStatus(change.status as RoomStatus);
          if (change.transcript) addTranscript(change.transcript);
          if (change.error) setError(change.error);
        } catch { /* Ignore malformed, non-critical realtime events. */ }
      };
      channel.onopen = () => {
        setConnected(true);
        startedAtRef.current = new Date().toISOString();
        setStatus('facilitator-speaking');
        startClock();
        requestVoiceResponse('ابدأ الآن بنص افتتاح المرحلة الأولى الموجود في تعليماتك. اجعل دورك قصيرًا، واسأل سؤالًا واحدًا ثم انتظر.');
      };
      channel.onclose = () => {
        setConnected(false);
        if (!endingRef.current) {
          setStatus('error');
          setError('انقطع الاتصال الصوتي. أعد الاتصال أو استعمل البديل الكتابي.');
        }
      };
      peer.onconnectionstatechange = () => {
        if ((peer.connectionState === 'failed' || peer.connectionState === 'disconnected') && !endingRef.current) {
          setConnected(false);
          setStatus('error');
          setError('انقطع الاتصال. تحقق من الشبكة ثم أعد المحاولة.');
        }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const response = await fetch(SESSION_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/sdp' }, body: offer.sdp || '',
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'VOICE_SESSION_FAILED' }));
        throw new Error(payload.error || 'VOICE_SESSION_FAILED');
      }
      await peer.setRemoteDescription({ type: 'answer', sdp: await response.text() });
    } catch (caught) {
      cleanupMedia(); setConnected(false); setMicrophoneAvailable(false); setStatus('error'); setTextFallback(true);
      const message = caught instanceof DOMException && caught.name === 'NotAllowedError'
        ? 'لم تسمح للمتصفح باستعمال الميكروفون. اسمح به من شريط العنوان، أو ابدأ بالبديل الكتابي.'
        : getErrorMessage(caught instanceof Error ? caught.message : '');
      setError(message);
    }
  }

  function toggleMute() {
    const next = !muted; setMuted(next);
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next && !paused; });
  }

  function togglePause() {
    const next = !paused; setPaused(next); setStatus(next ? 'paused' : 'learner-turn');
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next && !muted; });
  }

  function askForHelp(kind: HelpKind) {
    const definition = config.helpLevels.find((item) => item.id === kind);
    const limit = definition?.limit ?? (kind === 'hint' ? 2 : kind === 'rephrase' ? 3 : 2);
    if (helpUsageRef.current[kind] >= limit) {
      setError(`استعملتَ الحد الأقصى لخيار «${definition?.labelAr || 'المساعدة'}». حاول متابعة الفكرة بكلماتك.`);
      return;
    }
    if (!channelRef.current || channelRef.current.readyState !== 'open') {
      setError('يجب الاتصال بالمحاور أولًا قبل طلب المساعدة.');
      return;
    }
    const next = { ...helpUsageRef.current, [kind]: helpUsageRef.current[kind] + 1 };
    helpUsageRef.current = next; setHelpUsage(next); setError('');
    const instructions = kind === 'hint'
      ? 'أعط الطالب ثلاث كلمات عربية مفردة فقط، من غير جملة كاملة ومن غير حل جاهز.'
      : kind === 'rephrase'
        ? 'أعد السؤال السابق بعربية فصحى أبسط وبسرعة أبطأ قليلًا، من غير تغيير هدف السؤال.'
        : 'اشرح المطلوب في جملة إنجليزية قصيرة واحدة، ثم عُد مباشرة إلى العربية الفصحى.';
    requestVoiceResponse(instructions);
  }

  function submitTextFallback(event: FormEvent) {
    event.preventDefault();
    const text = textInput.trim();
    if (!text) return;
    if (channelRef.current?.readyState !== 'open') {
      setError('البديل الكتابي يحتاج إلى اتصال بالمحاور. اضغط «الاتصال بالبديل الكتابي» أولًا.');
      return;
    }
    addTranscript({ role: 'learner', text });
    sendEvent({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] } });
    requestVoiceResponse('أجب صوتيًا بالعربية الفصحى، وواصل المرحلة الحالية، ولا تسأل أكثر من سؤال واحد.');
    setTextInput(''); setStatus('understanding'); setError('');
  }

  async function finishConversation(automatic = false) {
    if (endingRef.current) return;
    endingRef.current = true; setStatus('ended'); setScreen('evaluating');
    if (!automatic) requestVoiceResponse('اشكر الطالب باختصار وقل إن التقرير سيظهر الآن. لا تذكر درجة.');
    await new Promise((resolve) => setTimeout(resolve, automatic ? 200 : 650));
    cleanupMedia();

    try {
      const totalHelp = Object.values(helpUsageRef.current).reduce((sum, count) => sum + count, 0);
      const response = await fetch(EVALUATION_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcriptRef.current, startedAt: startedAtRef.current,
          durationSeconds: elapsedRef.current, helpCount: totalHelp, consentToStoreResults,
        }),
      });
      const payload = await response.json().catch(() => ({ error: 'EVALUATION_FAILED' }));
      if (!response.ok) throw new Error(payload.error || 'EVALUATION_FAILED');
      const report = payload as Evaluation;
      setEvaluation(report); setScreen('report');

      if (consentToStoreResults) {
        let previous: { bestScore?: number; attempts?: number } = {};
        try { previous = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { /* Ignore invalid old local data. */ }
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          lessonId: config.lessonId,
          startedAt: startedAtRef.current,
          endedAt: new Date().toISOString(),
          durationSeconds: elapsedRef.current,
          completed: report.evaluationStatus === 'complete',
          score: report.total,
          dimensions: report.dimensions,
          usedVocabulary: report.usedVocabulary,
          grammarEvidence: report.grammarEvidence,
          transcript: transcriptRef.current,
          bestScore: Math.max(Number(previous.bestScore || 0), report.total || 0),
          attempts: Number(previous.attempts || 0) + 1,
        }));
      }

      if (report.mastery) {
        let sections = Array(7).fill(false);
        try {
          const value = JSON.parse(localStorage.getItem(LEVEL_PROGRESS_KEY) || '[]');
          if (Array.isArray(value)) sections = sections.map((_, index) => Boolean(value[index]));
        } catch { /* Ignore invalid old progress. */ }
        sections[4] = true;
        localStorage.setItem(LEVEL_PROGRESS_KEY, JSON.stringify(sections));
        markSectionComplete('A2', 1, 'conversation');
      }
    } catch (caught) {
      setScreen('live'); setStatus('error'); endingRef.current = false;
      setError(getErrorMessage(caught instanceof Error ? caught.message : 'EVALUATION_FAILED'));
    }
  }

  function restart() {
    cleanupMedia(); endingRef.current = false; startedAtRef.current = null;
    transcriptRef.current = []; setTranscript([]); setEvaluation(null); setError('');
    setElapsed(0); setStatus('idle'); setMuted(false); setPaused(false); setTextFallback(false); setScreen('intro');
  }

  if (screen === 'intro') return <main className="a2c-page">
    <header className="a2c-hero">
      <Link className="a2c-back" href="/levels/A2">العودة إلى المستوى المتوسط · Back to Intermediate</Link>
      <div className="a2c-kicker">المستوى المتوسط · الدرس الأول · محادثة صوتية مباشرة · Live voice conversation</div>
      <h1>{config.titleAr}</h1>
      <p className="a2c-english" dir="ltr">{config.titleEn}</p>
      <div className="a2c-scenario">
        <span className="a2c-scenario-mark" aria-hidden="true" />
        <div><strong>المشهد · Scenario</strong><p>{config.scenario.settingAr}</p><small dir="ltr">{config.scenario.settingEn}</small></div>
      </div>
    </header>

    <section className="a2c-preflight">
      <article>
        <h2>ما الذي ستتدرّب عليه؟ · What will you practise?</h2>
        <ul>{config.learningObjectives.map((item) => <li key={item.id}><span aria-hidden="true">✓</span><div>{item.ar}<small dir="ltr">{item.en}</small></div></li>)}</ul>
      </article>
      <article>
        <h2>شروط الإتقان · Mastery requirements</h2>
        <div className="a2c-requirements">
          <div><strong>{config.activationRules.minimumLearnerTurns}</strong><span>أدوار للطالب · Learner turns</span></div>
          <div><strong>{config.activationRules.minimumUniqueVocabularyFamilies}</strong><span>عائلات لفظية · Word families</span></div>
          <div><strong>2 + 2</strong><span>استعمالان لكل قاعدة · Grammar uses</span></div>
          <div><strong>{config.rubric.mastery} / {config.rubric.total}</strong><span>درجة الإتقان · Mastery score</span></div>
        </div>
        <p className="a2c-hidden-note">ستظهر مشكلة مفاجئة واحدة أثناء المحادثة؛ لن تُكشف لك قبل مرحلتها.</p>
      </article>
    </section>

    <details className="a2c-language-bank">
      <summary>عرض عائلات المفردات والقاعدتين · Show vocabulary and grammar targets</summary>
      <div className="a2c-language-grid">
        <div><h3>عائلات المفردات</h3><div className="a2c-word-list">{config.targetVocabulary.map((item) => <span key={item.id}>{item.family}</span>)}</div></div>
        <div><h3>القواعد</h3>{config.grammarTargets.map((item) => <article key={item.id}><strong>{item.labelAr}</strong><small dir="ltr">{item.labelEn}</small><p>{item.examples.join(' · ')}</p></article>)}</div>
      </div>
    </details>

    <section className="a2c-start-card">
      <div className="a2c-time-notice"><strong>{config.estimatedMinutes.minimum}–{config.estimatedMinutes.maximum} دقائق · minutes</strong><span>ستحتاج إلى ميكروفون وسماعات. · You need a microphone and headphones. الحد الأقصى {config.maxSessionMinutes} دقائق.</span></div>
      <label className="a2c-consent"><input type="checkbox" checked={consentToStoreResults} onChange={(event) => setConsentToStoreResults(event.target.checked)} /><span><strong>اختياري · Optional:</strong> أوافق على حفظ نص المحادثة والتقرير والنتيجة. · Save my transcript, report, and result. لن يُحفظ التسجيل الصوتي الخام.</span></label>
      <div className="a2c-start-actions">
        <button type="button" className="a2c-primary" onClick={() => void startConversation(true)}><ControlIcon name="mic" />{config.ui.primaryActionAr} · Start voice conversation</button>
        <button type="button" className="a2c-secondary" onClick={() => void startConversation(false)}><ControlIcon name="keyboard" />ابدأ بالبديل الكتابي · Start with typing</button>
      </div>
      <p className="a2c-privacy">لا يبدأ الميكروفون إلا بعد ضغط زر البدء. · The microphone starts only after you press Start. الصوت المباشر لا يُخزّن داخل المنصة.</p>
      {error && <div className="a2c-error" role="alert">{error}</div>}
    </section>
  </main>;

  if (screen === 'evaluating') return <main className="a2c-page"><section className="a2c-evaluating" aria-live="polite"><div className="a2c-orb active" aria-hidden="true"><span /></div><h1>نُعِدّ تقرير محادثتك… · Preparing your report…</h1><p>نراجع إنجاز المهمة، والمفردات، والقاعدتين، والتفاعل، ووضوح الكلام. · We are evaluating the task, vocabulary, grammar, interaction, and clarity.</p></section></main>;

  if (screen === 'report' && evaluation) return <main className="a2c-page">
    <header className="a2c-report-hero">
      <div><div className="a2c-kicker">تقرير غرفة المحادثة · Conversation report</div><h1>{evaluation.evaluationStatus === 'complete' ? 'اكتملت المحادثة · Conversation complete' : 'نحتاج إلى محادثة أطول · A longer conversation is needed'}</h1><p>{evaluation.mastery ? 'أحسنت! حققتَ درجة الإتقان. · You reached mastery.' : evaluation.evaluationStatus === 'incomplete' ? 'المحادثة أقصر من أن تُنتج تقريرًا موثوقًا. · The conversation is too short for a reliable report.' : 'اقتربتَ من الإتقان. راجع الخطوات التالية ثم أعد المحاولة. · Review the next steps and try again.'}</p></div>
      <div className={`a2c-score ${evaluation.mastery ? 'passed' : ''}`}><strong>{evaluation.total}</strong><span>/ 20</span><small>الإتقان {config.rubric.mastery}</small></div>
    </header>
    <section className="a2c-dimensions">{evaluation.dimensions.map((item) => {
      const definition = config.rubric.dimensions.find((entry) => entry.id === item.id);
      return <article key={item.id}><div><strong>{definition?.labelAr || item.id}</strong><p>{item.evidenceAr}</p></div><b>{item.score} / {item.max}</b></article>;
    })}</section>
    <section className="a2c-report-grid">
      <article><h2>نقاط القوة · Strengths</h2><ul>{evaluation.strengthsAr.map((item, index) => <li key={index}>{item}</li>)}</ul></article>
      <article><h2>الخطوات التالية · Next steps</h2><ul>{evaluation.nextStepsAr.map((item, index) => <li key={index}>{item}</li>)}</ul></article>
    </section>
    <section className="a2c-evidence-grid">
      <article><h2>المفردات المرصودة · Vocabulary evidence</h2><p>{evaluation.usedVocabulary.filter((item) => item.correct).length} / {config.activationRules.minimumUniqueVocabularyFamilies} عائلات مستهدفة</p><div className="a2c-word-list">{evaluation.usedVocabulary.filter((item) => item.correct).map((item) => <span key={item.id}>{item.heardForm}</span>)}</div></article>
      <article><h2>أدلة القواعد · Grammar evidence</h2><strong>أنْ + المضارع</strong><ul>{evaluation.grammarEvidence.anSubjunctive.map((item, index) => <li key={index}>{item}</li>)}</ul><strong>حرف الجر + المصدر</strong><ul>{evaluation.grammarEvidence.prepositionMasdar.map((item, index) => <li key={index}>{item}</li>)}</ul></article>
    </section>
    {evaluation.corrections.length > 0 && <section className="a2c-corrections"><h2>تصحيحات ذات أولوية · Priority corrections</h2>{evaluation.corrections.map((item, index) => <article key={index}><p className="original">{item.original}</p><p className="corrected">{item.corrected}</p><small>{item.explanationAr}</small><small dir="ltr">{item.explanationEn}</small></article>)}</section>}
    <details className="a2c-transcript"><summary>عرض نص المحادثة · Show transcript</summary>{transcript.map((entry, index) => <p key={index} className={entry.role}><strong>{entry.role === 'learner' ? 'أنت · You' : 'المحاور · Facilitator'}:</strong> {entry.text}</p>)}</details>
    <div className="a2c-storage-note">{consentToStoreResults ? evaluation.persistence === 'database' ? 'حُفظ التقرير والنص في حسابك.' : 'تعذر الحفظ في قاعدة البيانات؛ بقي التقرير ظاهرًا في هذه الجلسة.' : 'لم يُحفظ النص أو التقرير لأنك لم تمنح موافقة الحفظ.'}</div>
    <LessonCompletion level="A2" lesson={1} section="conversation" passed={evaluation.mastery} score={`${evaluation.total}/20`} onRetry={restart} />
  </main>;

  return <main className="a2c-page a2c-live">
    <header className="a2c-live-head"><div><div className="a2c-kicker">نُخَطِّطُ لِوَرْشَةٍ ثَقَافِيَّةٍ</div><h1>غرفة المحادثة الصوتية · Live conversation</h1></div><div className="a2c-timer" aria-label="مدة المحادثة">{formatConversationTime(elapsed)}<small>من · of {formatConversationTime(config.maxSessionMinutes * 60)}</small></div></header>
    <div className="a2c-live-layout">
      <section className="a2c-stage">
        <div className={`a2c-status ${status}`} role="status" aria-live="polite"><span />{statusLabels[status]}</div>
        <div className={`a2c-orb ${status === 'facilitator-speaking' || status === 'learner-speaking' ? 'active' : ''}`} aria-hidden="true"><span /><i /></div>
        <h2>{status === 'learner-turn' || status === 'learner-speaking' ? 'تكلّم الآن بالعربية الفصحى · Speak now in Modern Standard Arabic' : statusLabels[status]}</h2>
        <p>اقترح، تفاوض، ووزّع العمل بكلماتك. · Suggest, negotiate, and divide the work in your own words.</p>
        <div className="a2c-progress-row"><div><strong>{learnerTurns.length}</strong><span>أدوار الطالب</span></div><div><strong>{approximateVocabulary.length}</strong><span>عائلات مرصودة تقريبًا</span></div><div><strong>{Object.values(helpUsage).reduce((sum, count) => sum + count, 0)}</strong><span>طلبات مساعدة</span></div></div>
        {error && <div className="a2c-error" role="alert">{error}{!connected && <button type="button" onClick={() => void startConversation(false)}>الاتصال بالبديل الكتابي</button>}</div>}
        {captions && <div className="a2c-caption" aria-live="polite">{transcript.at(-1)?.text || 'سيظهر النص هنا بعد اكتمال كل دور.'}</div>}
        <div className="a2c-help" aria-label="المساعدة الصوتية">{config.helpLevels.map((item) => {
          const used = helpUsage[item.id];
          return <button key={item.id} type="button" onClick={() => askForHelp(item.id)} disabled={used >= item.limit || !connected}><ControlIcon name="help" /><span>{item.labelAr}</span><small>{used} / {item.limit}</small></button>;
        })}</div>
        {textFallback && <form className="a2c-text-fallback" onSubmit={submitTextFallback}><label htmlFor="a2c-answer">بديل كتابي عند تعذر الميكروفون · Typing fallback</label><div><input id="a2c-answer" value={textInput} onChange={(event) => setTextInput(event.target.value)} placeholder="اكتب إجابتك بالعربية…" autoComplete="off" /><button type="submit" disabled={!connected}>إرسال · Send</button></div><small>سيظل ردّ المحاور صوتيًا. · The facilitator will still answer by voice.</small></form>}
      </section>
      <aside className="a2c-phases"><h2>مراحل المحادثة · Conversation stages</h2><ol>{config.phases.map((phase) => <li key={phase.id}><b>{phase.order}</b><div><strong>{phase.titleAr}</strong><small>{phase.goalAr}</small></div></li>)}</ol><p>المشكلة المختارة مخفية حتى المرحلة الرابعة. · The challenge stays hidden until stage four.</p></aside>
    </div>
    <footer className="a2c-controls">
      <button type="button" className={muted ? 'active' : ''} onClick={toggleMute} aria-pressed={muted} disabled={!microphoneAvailable}><ControlIcon name="mic" /><span>{muted ? 'إلغاء الكتم · Unmute' : 'كتم الميكروفون · Mute'}</span></button>
      <button type="button" className={paused ? 'active' : ''} onClick={togglePause} aria-pressed={paused} disabled={!connected}><ControlIcon name="pause" /><span>{paused ? 'متابعة · Resume' : 'إيقاف مؤقت · Pause'}</span></button>
      <button type="button" onClick={() => setCaptions((value) => !value)} aria-pressed={captions}><ControlIcon name="captions" /><span>{captions ? 'إخفاء النص · Hide captions' : 'النص الحي · Live captions'}</span></button>
      <button type="button" onClick={() => setTextFallback((value) => !value)} aria-pressed={textFallback}><ControlIcon name="keyboard" /><span>البديل الكتابي · Typing</span></button>
      <label className="a2c-volume"><ControlIcon name="volume" /><span>الصوت</span><input aria-label="مستوى صوت المحاور" type="range" min="0" max="1" step="0.1" value={volume} onChange={(event) => setVolume(Number(event.target.value))} /></label>
      <button type="button" className="a2c-end" onClick={() => void finishConversation(false)} disabled={!connected && transcript.length === 0}><ControlIcon name="end" /><span>إنهاء وإظهار التقرير · End and show report</span></button>
    </footer>
  </main>;
}
