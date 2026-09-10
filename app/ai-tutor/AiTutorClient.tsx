'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatConversationTime, readRealtimeEvent } from '../../lib/conversation-realtime.mjs';
import { upsertReviewItem, type LearningLevel } from '../../lib/learning-progress';
import type { TutorActivity, TutorPageContext, TutorPreferences, TutorSessionSummary, TutorTranscriptEntry } from '../../lib/ai-tutor/types';

type Phase = 'loading' | 'idle' | 'permission' | 'connecting' | 'listening' | 'learner-speaking' | 'thinking' | 'tutor-speaking' | 'paused' | 'disconnected' | 'ending' | 'ended' | 'error';
type StartMode = 'voice' | 'text';

const activityCards: Array<{ id: TutorActivity; icon: string; ar: string; en: string; description: string }> = [
  { id: 'lesson_review', icon: '▤', ar: 'مراجعة درس', en: 'Lesson review', description: 'أسئلة قصيرة من آخر درس مكتمل أو من درس تختاره.' },
  { id: 'vocabulary', icon: 'أ', ar: 'مراجعة المفردات', en: 'Vocabulary', description: 'تذكّر المعنى واستعمل الكلمات ومشتقاتها في سياق.' },
  { id: 'free_conversation', icon: '◌', ar: 'محادثة حرة', en: 'Free conversation', description: 'حديث طبيعي مبني على مستواك واهتماماتك.' },
  { id: 'role_play', icon: '◈', ar: 'لعب الأدوار', en: 'Role play', description: 'تدرّب داخل موقف واقعي بهدف لغوي واضح.' },
  { id: 'grammar', icon: '∴', ar: 'شرح قاعدة', en: 'Grammar', description: 'شرح قصير من دروسك ثم تطبيق مباشر.' },
  { id: 'pronunciation', icon: '◖', ar: 'تصحيح النطق', en: 'Pronunciation', description: 'انطق كلمة من الدرس وأعد المحاولة بعد الملاحظة.' },
];

const rolePlayScenarios = ['في المقهى', 'في السوق', 'في المطار', 'في الفندق', 'سؤال شخص عن الطريق', 'زيارة مدينة مغربية', 'مقابلة عمل', 'التعارف مع شخص جديد', 'التحدث مع أستاذ', 'زيارة الطبيب'];
const quickHelp = [
  ['لم أفهم', 'لم أفهم. أعد كلامك بطريقة أسهل وببطء.'],
  ['قلها بطريقة أسهل', 'قل الجملة السابقة بطريقة أسهل تناسب مستواي.'],
  ['أعطني مثالًا', 'أعطني مثالًا قصيرًا من محتوى الدرس المتاح.'],
  ['ماذا تعني هذه الكلمة؟', 'اشرح لي معنى الكلمة المهمة في جملتك السابقة.'],
  ['كيف أقول هذا بالعربية؟', 'ساعدني على قول فكرتي بالعربية بسؤال قصير عن المعنى المقصود.'],
  ['صحح نطقي', 'اختر كلمة مناسبة من الدرس وابدأ تدريب نطق قصيرًا دون درجة وهمية.'],
  ['اسألني سؤالًا آخر', 'انتقل إلى سؤال آخر مناسب للموضوع نفسه.'],
];

const phaseLabel: Record<Phase, { ar: string; en: string }> = {
  loading: { ar: 'نحمّل رحلتك التعليمية', en: 'Loading your learning journey' },
  idle: { ar: 'جاهز للبدء', en: 'Ready' },
  permission: { ar: 'ننتظر إذن الميكروفون', en: 'Waiting for microphone permission' },
  connecting: { ar: 'ننشئ اتصالًا آمنًا', en: 'Connecting securely' },
  listening: { ar: 'جاهز للاستماع', en: 'Ready to listen' },
  'learner-speaking': { ar: 'يستمع إليك', en: 'Listening to you' },
  thinking: { ar: 'يفكر في إجابتك', en: 'Thinking' },
  'tutor-speaking': { ar: 'الأستاذ يتحدث', en: 'Tutor is speaking' },
  paused: { ar: 'الميكروفون متوقف', en: 'Microphone paused' },
  disconnected: { ar: 'الاتصال منقطع', en: 'Connection lost' },
  ending: { ar: 'نُعدّ ملخص الجلسة', en: 'Preparing your summary' },
  ended: { ar: 'اكتملت الجلسة', en: 'Session complete' },
  error: { ar: 'تعذر إكمال الاتصال', en: 'Connection error' },
};

const publicErrors: Record<string, string> = {
  AUTH_REQUIRED: 'يجب تسجيل الدخول أولًا. · Please sign in first.',
  TUTOR_MIGRATION_REQUIRED: 'جداول الأستاذ الآلي غير مثبتة بعد. شغّل ملف migration رقم 013 في Supabase ثم أعد المحاولة.',
  ACTIVE_SESSION_EXISTS: 'توجد جلسة نشطة لهذا الحساب. انتظر انتهاء مدتها أو أعد تحميل الصفحة بعد قليل.',
  DAILY_LIMIT_REACHED: 'وصلت إلى الحد اليومي للجلسات. يمكنك العودة غدًا.',
  VOICE_SERVICE_NOT_CONFIGURED: 'مفتاح OpenAI غير موجود في الخادم. أضف OPENAI_API_KEY إلى متغيرات البيئة.',
  VOICE_KEY_INVALID: 'مفتاح OpenAI غير صحيح أو غير صالح.',
  VOICE_LIMIT_REACHED: 'تم بلوغ حد OpenAI أو لا يوجد رصيد كافٍ.',
  VOICE_SESSION_FAILED: 'تعذر إنشاء الاتصال الصوتي. يمكنك متابعة الجلسة بالكتابة.',
  OPENAI_LIMIT_REACHED: 'تم بلوغ حد خدمة الذكاء الاصطناعي. حاول لاحقًا.',
  SESSION_NOT_ACTIVE: 'انتهت صلاحية هذه الجلسة. ابدأ جلسة جديدة.',
};

function messageFor(code: unknown) {
  return publicErrors[String(code || '')] || 'حدث خطأ غير متوقع. حاول مرة أخرى. · Something went wrong.';
}

function makeEntry(role: TutorTranscriptEntry['role'], text: string): TutorTranscriptEntry {
  return { id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, role, text: text.trim(), createdAt: new Date().toISOString() };
}

export default function AiTutorClient() {
  const router = useRouter();
  const [context, setContext] = useState<TutorPageContext | null>(null);
  const [activity, setActivity] = useState<TutorActivity>('free_conversation');
  const [lessonId, setLessonId] = useState('');
  const [scenario, setScenario] = useState(rolePlayScenarios[0]);
  const [phase, setPhase] = useState<Phase>('loading');
  const [startMode, setStartMode] = useState<StartMode>('voice');
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [transcriptVisible, setTranscriptVisible] = useState(true);
  const [transcript, setTranscript] = useState<TutorTranscriptEntry[]>([]);
  const [partialCaption, setPartialCaption] = useState('');
  const [textInput, setTextInput] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<TutorSessionSummary | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const [notice, setNotice] = useState('');
  const [preferences, setPreferences] = useState<TutorPreferences | null>(null);
  const [contextReloadToken, setContextReloadToken] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState('');

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef = useRef('');
  const transcriptRef = useRef<TutorTranscriptEntry[]>([]);
  const endingRef = useRef(false);
  const phaseRef = useRef<Phase>('loading');
  const activityRef = useRef<TutorActivity>('free_conversation');
  const lessonRef = useRef('');

  const activeCard = activityCards.find((card) => card.id === activity)!;
  const canStart = Boolean(context && preferences && phase !== 'loading' && !connected && phase !== 'ending');

  function setActivityChoice(value: TutorActivity) {
    setActivity(value);
    activityRef.current = value;
  }

  function setLessonChoice(value: string) {
    setLessonId(value);
    lessonRef.current = value;
  }

  function addTranscript(entry?: TutorTranscriptEntry) {
    if (!entry?.text.trim()) return;
    const last = transcriptRef.current.at(-1);
    if (last?.role === entry.role && last.text === entry.text) return;
    transcriptRef.current = [...transcriptRef.current, entry];
    setTranscript(transcriptRef.current);
  }

  function patchTranscript(id: string, change: Partial<TutorTranscriptEntry>) {
    transcriptRef.current = transcriptRef.current.map((entry) => entry.id === id ? { ...entry, ...change } : entry);
    setTranscript(transcriptRef.current);
  }

  function cleanupConnection() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    channelRef.current?.close();
    peerRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.srcObject = null; }
    channelRef.current = null;
    peerRef.current = null;
    streamRef.current = null;
    setConnected(false);
    setAudioBlocked(false);
  }

  function sendRealtime(event: Record<string, unknown>) {
    if (channelRef.current?.readyState !== 'open') return false;
    channelRef.current.send(JSON.stringify(event));
    return true;
  }

  function requestResponse(instructions: string) {
    if (audioRef.current) void audioRef.current.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true));
    sendRealtime({ type: 'response.create', response: { output_modalities: ['audio'], instructions } });
    setPhase('thinking');
  }

  async function resumeTutorAudio() {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      await audio.play();
      setAudioBlocked(false);
      setNotice('تم تشغيل صوت الأستاذ. · Tutor audio is enabled.');
    } catch {
      setAudioBlocked(true);
      setNotice('تعذر تشغيل الصوت. تحقق من أن صوت الجهاز غير مكتوم ثم حاول مرة أخرى. · Audio is still blocked; check your device sound and retry.');
    }
  }

  function stopTutorVoice() {
    sendRealtime({ type: 'response.cancel' });
    audioRef.current?.pause();
    setPhase(muted ? 'paused' : 'listening');
  }

  async function createSession() {
    const response = await fetch('/api/ai-tutor/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity, lessonId: lessonId || undefined }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'SESSION_START_FAILED');
    sessionRef.current = data.session.id;
    setActiveSessionId(data.session.id);
    return String(data.session.id);
  }

  async function startSession(mode: StartMode) {
    if (!context || !preferences || !canStart) return;
    cleanupConnection();
    endingRef.current = false;
    setError(''); setNotice(''); setSummary(null); setElapsed(0); setStartMode(mode); setMuted(false);
    transcriptRef.current = []; setTranscript([]); setPartialCaption('');
    try {
      const sessionId = await createSession();
      if (mode === 'voice') await connectVoice(sessionId, true);
      else {
        setConnected(true);
        setPhase('thinking');
        timerRef.current = setInterval(() => setElapsed((value) => value + 1), 1000);
        await sendText('ابدأ الجلسة الآن بتحية شخصية قصيرة ثم اسألني سؤالًا واحدًا مناسبًا.', false);
      }
    } catch (caught) {
      cleanupConnection();
      const code = caught instanceof DOMException && caught.name === 'NotAllowedError' ? 'MIC_DENIED' : caught instanceof Error ? caught.message : '';
      setError(code === 'MIC_DENIED' ? 'لم تسمح باستعمال الميكروفون. يمكنك السماح به من إعدادات المتصفح أو متابعة الجلسة بالكتابة.' : messageFor(code));
      setPhase('error');
      if (sessionRef.current && code !== 'ACTIVE_SESSION_EXISTS') await abandonCurrentSession();
    }
  }

  async function connectVoice(sessionId: string, askPermission: boolean) {
    setPhase(askPermission ? 'permission' : 'connecting');
    const stream = askPermission ? await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }) : streamRef.current || new MediaStream();
    streamRef.current = stream;
    setPhase('connecting');
    const peer = new RTCPeerConnection();
    peerRef.current = peer;
    if (stream.getAudioTracks().length) stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    else peer.addTransceiver('audio', { direction: 'recvonly' });
    const audio = new Audio();
    audio.autoplay = true;
    audio.volume = volume;
    audio.setAttribute('playsinline', '');
    audio.onplay = () => setAudioBlocked(false);
    audioRef.current = audio;
    peer.ontrack = (event) => {
      audio.srcObject = event.streams[0] || new MediaStream([event.track]);
      void audio.play().then(() => setAudioBlocked(false)).catch(() => {
        setAudioBlocked(true);
        setNotice('منع المتصفح التشغيل التلقائي. اضغط «تشغيل صوت الأستاذ» مرة واحدة. · Your browser blocked autoplay; press Play tutor audio once.');
      });
    };
    const channel = peer.createDataChannel('oai-events');
    channelRef.current = channel;
    channel.onmessage = ({ data }) => handleRealtimeEvent(data);
    channel.onopen = () => {
      setConnected(true);
      setPhase('tutor-speaking');
      timerRef.current = setInterval(() => setElapsed((value) => value + 1), 1000);
      requestResponse(`ابدأ الجلسة الآن بتحية صوتية شخصية مستخدمًا اسم الطالب. اذكر فقط تقدّمًا موجودًا في سياقك، ثم قدم خيارًا مرتبطًا بوضع ${activityRef.current} واسأل سؤالًا واحدًا.`);
    };
    channel.onclose = () => {
      if (!endingRef.current) { setConnected(false); setPhase('disconnected'); }
    };
    peer.onconnectionstatechange = () => {
      if ((peer.connectionState === 'failed' || peer.connectionState === 'disconnected') && !endingRef.current) {
        setConnected(false); setPhase('disconnected'); setError('ضعف أو انقطع الاتصال. يمكنك إعادة الاتصال أو متابعة الجلسة بالكتابة.');
      }
    };
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    const response = await fetch('/api/ai-tutor/realtime', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
        'X-Tutor-Session': sessionId,
        'X-Tutor-Activity': activityRef.current,
        'X-Tutor-Lesson': lessonRef.current,
        'X-Tutor-Scenario': activityRef.current === 'role_play' ? scenario : '',
      },
      body: offer.sdp || '',
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'VOICE_SESSION_FAILED');
    }
    await peer.setRemoteDescription({ type: 'answer', sdp: await response.text() });
  }

  function handleRealtimeEvent(raw: string) {
    try {
      const event = JSON.parse(raw);
      const change = readRealtimeEvent(event);
      if (event.type === 'response.output_audio_transcript.delta' || event.type === 'response.audio_transcript.delta') setPartialCaption((value) => value + String(event.delta || ''));
      if (event.type === 'conversation.item.input_audio_transcription.delta') setPartialCaption((value) => value + String(event.delta || ''));
      if (event.type === 'input_audio_buffer.speech_started') {
        if (phaseRef.current === 'tutor-speaking') stopTutorVoice();
        setPartialCaption(''); setPhase('learner-speaking');
      }
      if (event.type === 'input_audio_buffer.speech_stopped') setPhase('thinking');
      if (event.type === 'response.created' || event.type === 'response.output_audio.delta' || event.type === 'response.audio.delta') {
        setPhase('tutor-speaking');
        if (audioRef.current?.paused) void audioRef.current.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true));
      }
      if (change.transcript) {
        addTranscript(makeEntry(change.transcript.role, change.transcript.text));
        setPartialCaption('');
      }
      if (event.type === 'response.done') { setPhase(muted ? 'paused' : 'listening'); setPartialCaption(''); }
      if (change.error) { setError(change.error); setPhase('error'); }
    } catch {
      // Ignore non-critical transport events that do not contain JSON.
    }
  }

  async function sendText(text: string, visible = true) {
    const clean = text.trim();
    if (!clean || !sessionRef.current) return;
    if (visible) addTranscript(makeEntry('learner', clean));
    setTextInput(''); setPhase('thinking'); setError('');
    const history = transcriptRef.current.map((turn) => ({ role: turn.role === 'learner' ? 'user' : 'assistant', content: turn.text }));
    const response = await fetch('/api/ai-tutor', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionRef.current, activity, lessonId, scenario: activity === 'role_play' ? scenario : undefined, message: clean, history }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'TUTOR_TEXT_FAILED');
    addTranscript(makeEntry('facilitator', data.reply));
    setPhase('listening');
  }

  async function submitText(event: FormEvent) {
    event.preventDefault();
    try {
      if (startMode === 'voice' && channelRef.current?.readyState === 'open') {
        const text = textInput.trim();
        if (!text) return;
        addTranscript(makeEntry('learner', text));
        sendRealtime({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] } });
        setTextInput(''); requestResponse('تفاعل مع رسالة الطالب، ثم واصل وفق هدف الجلسة بسؤال واحد.');
      } else await sendText(textInput);
    } catch (caught) {
      setError(messageFor(caught instanceof Error ? caught.message : 'TUTOR_TEXT_FAILED')); setPhase('error');
    }
  }

  async function sendCommand(command: string) {
    if (!sessionRef.current) return;
    if (channelRef.current?.readyState === 'open') {
      sendRealtime({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: command }] } });
      requestResponse('نفّذ طلب المساعدة المختصر ثم واصل الجلسة بسؤال واحد.');
    } else {
      try { await sendText(command, false); } catch (caught) { setError(messageFor(caught instanceof Error ? caught.message : 'TUTOR_TEXT_FAILED')); }
    }
  }

  function toggleMicrophone() {
    const next = !muted;
    setMuted(next);
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setPhase(next ? 'paused' : 'listening');
  }

  function changeVolume(value: number) {
    setVolume(value);
    if (audioRef.current) audioRef.current.volume = value;
  }

  async function assistMessage(action: 'translate' | 'correct', entry: TutorTranscriptEntry) {
    setNotice(action === 'translate' ? 'جارٍ إعداد الترجمة…' : 'جارٍ فحص الجملة…');
    try {
      const response = await fetch('/api/ai-tutor/assist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, text: entry.text, language: preferences?.explanationLanguage || 'both' }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      patchTranscript(entry.id, action === 'translate' ? { translation: data.translation } : { correction: data.correction });
      setNotice('');
    } catch { setNotice('تعذر تنفيذ الطلب الآن.'); }
  }

  async function abandonCurrentSession() {
    const sessionId = sessionRef.current;
    if (!sessionId) return;
    sessionRef.current = '';
    setActiveSessionId('');
    await fetch('/api/ai-tutor/session', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'abandon', sessionId }) }).catch(() => undefined);
  }

  async function endSession() {
    if (!sessionRef.current || endingRef.current) return;
    endingRef.current = true;
    setPhase('ending'); setError('');
    const sessionId = sessionRef.current;
    cleanupConnection();
    try {
      const response = await fetch('/api/ai-tutor/session', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'finish', sessionId, durationSeconds: elapsed, transcript: transcriptRef.current }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'SESSION_SAVE_FAILED');
      setSummary(data.summary); setPhase('ended'); sessionRef.current = ''; setActiveSessionId('');
      setContext((current) => current ? { ...current, previousTutorSummaries: [data.summary, ...current.previousTutorSummaries].slice(0, 5) } : current);
    } catch (caught) {
      setError(messageFor(caught instanceof Error ? caught.message : 'SESSION_SAVE_FAILED')); setPhase('error');
    } finally { endingRef.current = false; }
  }

  async function reconnect() {
    if (!sessionRef.current) return void startSession(startMode);
    cleanupConnection(); setError('');
    try { await connectVoice(sessionRef.current, true); } catch (caught) { setError(messageFor(caught instanceof Error ? caught.message : 'VOICE_SESSION_FAILED')); setPhase('disconnected'); }
  }

  async function switchToText() {
    cleanupConnection(); setStartMode('text'); setConnected(true); setPhase('listening'); setError('');
    if (!timerRef.current) timerRef.current = setInterval(() => setElapsed((value) => value + 1), 1000);
  }

  async function savePreferences(next: TutorPreferences) {
    try {
      const response = await fetch('/api/ai-tutor/preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPreferences(data.preferences); setTranscriptVisible(data.preferences.transcriptAuto); setSettingsOpen(false); setNotice('حُفظت الإعدادات.');
    } catch (caught) { setError(messageFor(caught instanceof Error ? caught.message : 'PREFERENCES_SAVE_FAILED')); }
  }

  async function submitReport() {
    if (!reportText.trim()) return;
    const response = await fetch('/api/ai-tutor/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: sessionRef.current || undefined, message: reportText }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return setError(messageFor(data.error));
    setReportText(''); setReportOpen(false); setNotice('شكرًا، تم إرسال البلاغ.');
  }

  function saveSummaryWords() {
    if (!summary) return;
    const [rawLevel, rawLesson] = (summary.lessonIds[0] || `${summary.levelId}-1`).split('-');
    const level = (rawLevel === 'A2' || rawLevel === 'B1' ? rawLevel : 'A1') as LearningLevel;
    const lesson = Number(rawLesson || 1);
    summary.practicedVocabulary.forEach((arabic, index) => upsertReviewItem({ id: summary.practicedVocabularyIds[index] || `tutor-${summary.sessionId}-${index}`, level, lesson, section: 'vocabulary', arabic }));
    setNotice('أضيفت كلمات الجلسة إلى المراجعة.');
  }

  useEffect(() => {
    let cancelled = false;
    fetch('/api/ai-tutor', { cache: 'no-store' }).then(async (response) => {
      if (response.status === 401) return router.replace('/login');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'LOAD_FAILED');
      if (cancelled) return;
      setContext(data);
      setPreferences(data.preferences);
      setTranscriptVisible(data.preferences.transcriptAuto);
      const preferredLesson = data.currentLesson || data.completedLessons?.at(-1) || data.availableLessons?.[0]?.id || '';
      setLessonId(preferredLesson);
      lessonRef.current = preferredLesson;
      setPhase('idle');
    }).catch((caught) => {
      if (!cancelled) { setError(messageFor(caught instanceof Error ? caught.message : 'LOAD_FAILED')); setPhase('error'); }
    });
    return () => {
      cancelled = true;
      const activeSession = sessionRef.current;
      cleanupConnection();
      if (activeSession && !endingRef.current) void fetch('/api/ai-tutor/session', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'abandon', sessionId: activeSession }), keepalive: true });
    };
  }, [router, contextReloadToken]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (!context || !connected || elapsed < context.limits.maxDurationMinutes * 60) return;
    void endSession();
    // endSession reads the current session refs; adding its render-time identity would retrigger this limit guard unnecessarily.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, context, connected]);

  if (phase === 'loading') return <main className="ai-tutor-shell"><div className="ai-tutor-loading" role="status"><span className="ai-spinner" /><h1>نُحضّر أستاذك الآلي</h1><p dir="ltr">Preparing your personal AI tutor…</p></div></main>;

  return <main className="ai-tutor-shell">
    <header className="ai-tutor-topbar">
      <a className="brand" href="/dashboard"><span className="brand-mark">ع</span><span>Dar<span>Lugha</span></span></a>
      <div className="ai-top-actions">
        <span className={`ai-connection-pill ${connected ? 'online' : ''}`}><i />{connected ? 'متصل · Live' : 'غير متصل · Offline'}</span>
        {context && <><span className="ai-level-pill">{context.level}</span><span className="ai-track-pill">{context.trackLabel}</span></>}
        <button type="button" onClick={() => setHistoryOpen(true)}>السجل <span dir="ltr">History</span></button>
        <button type="button" onClick={() => setSettingsOpen(true)}>الإعدادات ⚙</button>
      </div>
    </header>

    <section className="ai-tutor-heading">
      <div><div className="eyebrow">PERSONAL AI TUTOR · أستاذك الشخصي</div><h1>الأستاذ الآلي</h1><p>محادثة صوتية مباشرة تتكيف مع مستواك ودروسك الحقيقية.</p></div>
      {context && <div className="ai-student-chip"><span>{context.name.charAt(0)}</span><div><strong>{context.name}</strong><small>{context.currentLesson ? `تتابع الآن ${context.currentLesson}` : 'ابدأ أول جلسة قصيرة'}</small></div></div>}
    </section>

    {!connected && !summary && <section className="ai-mode-section" aria-labelledby="mode-title">
      <div className="ai-section-title"><div><span>1</span><h2 id="mode-title">اختر طريقة التدرّب</h2></div><p dir="ltr">Choose one activity. You can change it before starting.</p></div>
      <div className="ai-mode-grid">{activityCards.map((card) => <button type="button" key={card.id} className={`ai-mode-card ${activity === card.id ? 'selected' : ''}`} onClick={() => setActivityChoice(card.id)} aria-pressed={activity === card.id}><span>{card.icon}</span><strong>{card.ar}</strong><b dir="ltr">{card.en}</b><small>{card.description}</small></button>)}</div>
      <div className="ai-session-options">
        <label>الدرس المرتبط · Related lesson<select value={lessonId} onChange={(event) => setLessonChoice(event.target.value)}><option value="">اختيار تلقائي · Automatic</option>{context?.availableLessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.id} — {lesson.titleAr}</option>)}</select></label>
        {activity === 'role_play' && <label>الموقف · Scenario<select value={scenario} onChange={(event) => setScenario(event.target.value)}>{rolePlayScenarios.map((item) => <option key={item}>{item}</option>)}</select></label>}
        <div className="ai-start-buttons"><button type="button" className="ai-primary-start" disabled={!canStart || context?.limits.sessionsRemainingToday === 0} onClick={() => void startSession('voice')}>🎙 ابدأ بالصوت <small>Start voice session</small></button><button type="button" disabled={!canStart} onClick={() => void startSession('text')}>⌨ ابدأ بالكتابة <small>Start with text</small></button></div>
      </div>
    </section>}

    <section className="ai-tutor-workspace">
      <aside className="ai-context-card">
        <h2>سياق الجلسة</h2>
        <dl><dt>النشاط</dt><dd>{activeCard.ar}</dd><dt>المستوى</dt><dd>{context?.level || '—'}</dd><dt>المسار</dt><dd>{context?.trackLabel || '—'}</dd><dt>الدرس</dt><dd>{lessonId || 'اختيار تلقائي'}</dd></dl>
        {context?.lastActivity && <div className="ai-context-note"><strong>آخر نشاط</strong><span>{context.lastActivity.label}</span></div>}
        {context && context.completedLessons.length === 0 && <div className="ai-empty-note">لا يوجد درس مكتمل مسجل بعد؛ سيبدأ الأستاذ بسؤال قصير ولا يدّعي أنك أكملت درسًا.</div>}
        {context?.suggestions.slice(0, 2).map((suggestion) => <div className="ai-context-note" key={suggestion.activity}><strong>{suggestion.titleAr}</strong><span>{suggestion.reasonAr}</span></div>)}
      </aside>

      <section className={`ai-live-stage ${phase}`} aria-live="polite">
        <header><div className="ai-phase"><i /><div><strong>{phaseLabel[phase].ar}</strong><small dir="ltr">{phaseLabel[phase].en}</small></div></div><time>{formatConversationTime(elapsed)}</time></header>
        {summary ? <SessionSummaryCard summary={summary} onSaveWords={saveSummaryWords} onRestart={() => { setSummary(null); setPhase('idle'); }} /> : <>
          <div className="ai-stage-center">
            <div className={`ai-voice-orb ${phase}`} aria-hidden="true"><span>ع</span>{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div>
            <h2>{phaseLabel[phase].ar}</h2><p dir="ltr">{phaseLabel[phase].en}</p>
            {partialCaption && <div className="ai-live-caption">{partialCaption}</div>}
            {!connected && phase === 'idle' && <div className="ai-welcome"><strong>مرحبًا {context?.name}!</strong><p>{context?.currentLesson ? `سأستخدم ما هو متاح من ${context.currentLesson} وما أكملتَه فعلًا.` : 'سأبدأ بسؤال قصير لأعرف ما تريد ممارسته اليوم.'}</p></div>}
            {(phase === 'disconnected' || phase === 'error') && activeSessionId && <div className="ai-recovery"><button type="button" onClick={() => void reconnect()}>إعادة الاتصال · Reconnect</button><button type="button" onClick={() => void switchToText()}>المتابعة بالكتابة · Continue with text</button></div>}
            {audioBlocked && connected && <div className="ai-recovery"><button type="button" className="ai-audio-unlock" onClick={() => void resumeTutorAudio()}>▶ تشغيل صوت الأستاذ · Play tutor audio</button></div>}
            {phase === 'error' && !activeSessionId && <div className="ai-recovery"><button type="button" onClick={() => { setError(''); setPhase('loading'); setContextReloadToken((value) => value + 1); }}>إعادة تحميل بياناتي · Try again</button><a href="/dashboard">العودة إلى لوحة الطالب</a></div>}
          </div>

          {transcriptVisible && <div className="ai-transcript" aria-label="نص المحادثة">{transcript.length === 0 ? <p className="ai-transcript-empty">سيظهر نص الحديث هنا بعد اكتمال كل دور. · The transcript will appear here.</p> : transcript.map((entry) => <article key={entry.id} className={entry.role}><header><strong>{entry.role === 'learner' ? 'أنت · You' : 'الأستاذ · Tutor'}</strong><time>{new Date(entry.createdAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}</time></header><p>{entry.text}</p>{entry.translation && <p className="translation" dir="ltr">{entry.translation}</p>}{entry.correction && <div className="correction"><span>التصحيح</span><del>{entry.correction.original}</del><ins>{entry.correction.corrected}</ins>{entry.correction.explanation && <small>{entry.correction.explanation}</small>}</div>}<footer><button type="button" onClick={() => void assistMessage('translate', entry)}>ترجم</button>{entry.role === 'learner' && <button type="button" onClick={() => void assistMessage('correct', entry)}>صحح جملتي</button>}{entry.role === 'facilitator' && <button type="button" onClick={() => void sendCommand('أعد جملتك السابقة نفسها بوضوح.')}>↻ أعد</button>}</footer></article>)}</div>}

          {connected && <><div className="ai-quick-help" aria-label="مساعدة سريعة">{quickHelp.map(([label, command]) => <button type="button" key={label} onClick={() => void sendCommand(command)}>{label}</button>)}</div>
          <form className="ai-text-input" onSubmit={submitText}><input value={textInput} onChange={(event) => setTextInput(event.target.value)} placeholder="اكتب بالعربية أو اطلب مساعدة…" aria-label="رسالتك إلى الأستاذ الآلي" maxLength={2000} /><button type="submit" disabled={!textInput.trim()}>إرسال</button></form></>}

          <footer className="ai-control-dock">
            <button type="button" className={`ai-mic ${!muted && connected ? 'active' : ''}`} onClick={toggleMicrophone} disabled={!connected || startMode === 'text'} aria-label={muted ? 'تشغيل الميكروفون' : 'إيقاف الميكروفون'}><span>{muted ? '🔇' : '🎙'}</span><small>{muted ? 'تشغيل' : 'الميكروفون'}</small></button>
            <div className="ai-control-group"><button type="button" onClick={() => void sendCommand('أعد جملتك السابقة بوضوح.') } disabled={!connected}>↻ أعد الجملة</button><button type="button" onClick={() => void sendCommand('تكلم ببطء أكثر في الأدوار التالية.') } disabled={!connected}>🐢 تحدث ببطء</button><button type="button" onClick={() => { const last = transcriptRef.current.filter((entry) => entry.role === 'facilitator').at(-1); if (last) void assistMessage('translate', last); }} disabled={!connected}>ترجم</button><button type="button" onClick={() => void sendCommand('أعطني تلميحًا قصيرًا من دون إعطاء الجواب كاملًا.') } disabled={!connected}>تلميح</button></div>
            <div className="ai-control-group">{audioBlocked && <button type="button" className="ai-audio-unlock" onClick={() => void resumeTutorAudio()}>▶ تشغيل الصوت · Play audio</button>}<button type="button" onClick={() => setTranscriptVisible((value) => !value)}>{transcriptVisible ? 'إخفاء النص' : 'إظهار النص'}</button><button type="button" onClick={stopTutorVoice} disabled={!connected}>■ أوقف الأستاذ</button><label className="ai-volume">الصوت<input type="range" min="0" max="1" step="0.1" value={volume} onChange={(event) => changeVolume(Number(event.target.value))} /></label><button type="button" onClick={() => setReportOpen(true)}>⚑ مشكلة</button></div>
            <button type="button" className="ai-end" onClick={() => void endSession()} disabled={!activeSessionId || phase === 'ending'}>إنهاء الجلسة</button>
          </footer>
        </>}
        {notice && <div className="ai-notice" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="إغلاق">×</button></div>}
        {error && <div className="ai-error" role="alert">{error}</div>}
      </section>
    </section>

    {settingsOpen && preferences && <SettingsModal preferences={preferences} track={context?.trackLabel || ''} onClose={() => setSettingsOpen(false)} onSave={(next) => void savePreferences(next)} />}
    {historyOpen && <HistoryDrawer summaries={context?.previousTutorSummaries || []} onClose={() => setHistoryOpen(false)} />}
    {reportOpen && <div className="ai-modal-backdrop"><section className="ai-modal" role="dialog" aria-modal="true" aria-labelledby="report-title"><button className="ai-modal-close" onClick={() => setReportOpen(false)} aria-label="إغلاق">×</button><h2 id="report-title">الإبلاغ عن مشكلة</h2><p>لا ترسل معلومات شخصية. صف المشكلة في الإجابة أو الصوت بإيجاز.</p><textarea value={reportText} onChange={(event) => setReportText(event.target.value)} maxLength={1000} /><button className="ai-save" type="button" onClick={() => void submitReport()}>إرسال البلاغ</button></section></div>}
  </main>;
}

function SettingsModal({ preferences, track, onClose, onSave }: { preferences: TutorPreferences; track: string; onClose: () => void; onSave: (value: TutorPreferences) => void }) {
  const [value, setValue] = useState(preferences);
  return <div className="ai-modal-backdrop"><section className="ai-modal ai-settings" role="dialog" aria-modal="true" aria-labelledby="settings-title"><button className="ai-modal-close" onClick={onClose} aria-label="إغلاق">×</button><h2 id="settings-title">إعدادات الأستاذ الآلي</h2><div className="ai-settings-grid"><label>صوت الأستاذ<select value={value.voice} onChange={(event) => setValue({ ...value, voice: event.target.value })}><option value="marin">Marin</option><option value="cedar">Cedar</option><option value="coral">Coral</option><option value="alloy">Alloy</option></select></label><label>سرعة الصوت<select value={value.speed} onChange={(event) => setValue({ ...value, speed: event.target.value as TutorPreferences['speed'] })}><option value="normal">طبيعية</option><option value="slow">بطيئة</option></select></label><label>لغة شرح الأخطاء<select value={value.explanationLanguage} onChange={(event) => setValue({ ...value, explanationLanguage: event.target.value as TutorPreferences['explanationLanguage'] })}><option value="both">العربية والإنجليزية</option><option value="ar">العربية</option><option value="en">الإنجليزية</option></select></label><label>مستوى التصحيح<select value={value.correctionLevel} onChange={(event) => setValue({ ...value, correctionLevel: event.target.value as TutorPreferences['correctionLevel'] })}><option value="important">الأخطاء المهمة فقط</option><option value="balanced">متوازن</option><option value="detailed">دقيق</option></select></label></div><div className="ai-track-setting"><span>المسار الحالي</span><strong>{track}</strong><a href="/profile">تغيير المسار من حسابي</a></div><label className="ai-check"><input type="checkbox" checked={value.transcriptAuto} onChange={(event) => setValue({ ...value, transcriptAuto: event.target.checked })} />إظهار النص تلقائيًا</label><label className="ai-check"><input type="checkbox" checked={value.saveSummaries} onChange={(event) => setValue({ ...value, saveSummaries: event.target.checked })} />حفظ الملخصات التعليمية</label><div className="ai-privacy-note"><strong>خصوصية الصوت</strong><p>لا تحفظ المنصة التسجيل الصوتي الخام. تُحفظ الملخصات والنص فقط عندما يكون حفظ الملخصات مفعّلًا.</p></div><button className="ai-save" type="button" onClick={() => onSave({ ...value, allowAudioStorage: false })}>حفظ الإعدادات</button></section></div>;
}

function HistoryDrawer({ summaries, onClose }: { summaries: TutorSessionSummary[]; onClose: () => void }) {
  return <div className="ai-modal-backdrop"><aside className="ai-history" role="dialog" aria-modal="true" aria-labelledby="history-title"><header><h2 id="history-title">سجل الجلسات</h2><button onClick={onClose} aria-label="إغلاق">×</button></header>{summaries.length === 0 ? <div className="ai-history-empty"><span>◷</span><p>لا توجد جلسات محفوظة بعد.</p></div> : summaries.map((item) => <article key={item.sessionId}><header><strong>{activityCards.find((card) => card.id === item.activityType)?.ar || item.activityType}</strong><time>{new Date(item.createdAt).toLocaleDateString('ar')}</time></header><p>{item.nextRecommendation || 'جلسة مكتملة'}</p><small>{formatConversationTime(item.durationSeconds)} · {item.levelId}</small></article>)}</aside></div>;
}

function SessionSummaryCard({ summary, onSaveWords, onRestart }: { summary: TutorSessionSummary; onSaveWords: () => void; onRestart: () => void }) {
  return <div className="ai-summary"><div className="ai-summary-mark">✓</div><div className="eyebrow">SESSION SUMMARY · ملخص الجلسة</div><h2>أحسنت! اكتملت جلستك</h2><div className="ai-summary-stats"><span><b>{formatConversationTime(summary.durationSeconds)}</b>المدة</span><span><b>{summary.practicedVocabulary.length}</b>مفردات مارسْتها</span><span><b>{summary.importantCorrections.length}</b>تصحيحات مهمة</span></div><div className="ai-summary-grid"><section><h3>نقاط القوة</h3>{summary.strengths.length ? <ul>{summary.strengths.map((item) => <li key={item}>{item}</li>)}</ul> : <p>لا توجد بيانات كافية لتحديد نقطة قوة دقيقة.</p>}</section><section><h3>تحتاج إلى مراجعة</h3>{summary.reviewNeeds.length ? <ul>{summary.reviewNeeds.map((item) => <li key={item}>{item}</li>)}</ul> : <p>لم يحدد التحليل حاجة مؤكدة للمراجعة.</p>}</section>{summary.importantCorrections.length > 0 && <section className="wide"><h3>أهم التصحيحات</h3>{summary.importantCorrections.map((item, index) => <div className="ai-summary-correction" key={`${item.original}-${index}`}><del>{item.original}</del><ins>{item.corrected}</ins>{item.explanation && <small>{item.explanation}</small>}</div>)}</section>}<section className="wide"><h3>الاقتراح التالي</h3><p>{summary.nextRecommendation || 'ابدأ جلسة قصيرة أخرى من الدرس نفسه.'}</p></section></div><div className="ai-summary-actions"><button className="ai-save" type="button" onClick={onRestart}>تدرب مرة أخرى</button><button type="button" onClick={onSaveWords} disabled={summary.practicedVocabulary.length === 0}>حفظ الكلمات للمراجعة</button><a href="/dashboard">العودة إلى لوحة الطالب</a></div></div>;
}
