'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { conversationRoom } from '../../data/level3/conversation-room';
import { formatConversationTime, readRealtimeEvent } from '../../lib/conversation-realtime.mjs';
import { markSectionComplete } from '../../lib/learning-progress';
import { userStorage as localStorage } from '../../lib/user-scoped-storage.mjs';
import LessonCompletion from '../learning/LessonCompletion';

type RoomStatus = 'idle' | 'connecting' | 'facilitator-speaking' | 'learner-turn' | 'learner-speaking' | 'understanding' | 'paused' | 'ended' | 'error';
type TranscriptEntry = { role: 'learner' | 'facilitator'; text: string };
type Evaluation = {
  evaluationStatus: 'complete' | 'incomplete'; totalScore: number; passed: boolean; bestScore: number;
  dimensions: Record<'task' | 'coherence' | 'expressions' | 'grammar' | 'vocabulary' | 'fluency', number>;
  usedExpressions: string[]; strengths: string[]; nextSteps: string[];
  corrections: { original: string; corrected: string; explanationAr: string; explanationEn: string }[];
  summaryAr: string; summaryEn: string; persistence?: 'local' | 'database';
};

const STORAGE_KEY = 'darlugha-level-03-conversation-room-lesson-01';
const LEVEL_PROGRESS_KEY = 'darlugha-b1-lesson-1-sections';
const dimensionLabels: Record<string, { ar: string; en: string; max: number }> = {
  task: { ar: 'إنجاز المهمة', en: 'Task achievement', max: 5 },
  coherence: { ar: 'وضوح الأفكار وترابطها', en: 'Coherence', max: 4 },
  expressions: { ar: 'عبارات الدرس', en: 'Target expressions', max: 4 },
  grammar: { ar: 'القواعد', en: 'Grammar', max: 3 },
  vocabulary: { ar: 'المفردات', en: 'Vocabulary', max: 2 },
  fluency: { ar: 'الطلاقة والوضوح', en: 'Fluency & clarity', max: 2 },
};
const statusLabels: Record<RoomStatus, string> = {
  idle: 'جاهز للبدء · Ready', connecting: 'جاري الاتصال · Connecting', 'facilitator-speaking': 'المحاور يتحدث · Facilitator speaking',
  'learner-turn': 'دورك في الكلام · Your turn', 'learner-speaking': 'أنت تتحدث الآن · You are speaking', understanding: 'جاري فهم إجابتك · Understanding your answer',
  paused: 'متوقف مؤقتًا · Paused', ended: 'انتهت المحادثة · Conversation ended', error: 'تعذر الاتصال · Connection failed',
};

const phaseEnglish: Record<string, { title: string; goal: string }> = {
  warmup: { title: 'Warm-up', goal: 'State an initial position and one reason.' },
  develop: { title: 'Build the argument', goal: 'Give two reasons and evidence or an example.' },
  challenge: { title: 'Opposing view', goal: 'Disagree or respond politely.' },
  new_information: { title: 'New information', goal: 'Reconsider the position and connect cause to result.' },
  solution: { title: 'Propose a solution', goal: 'Suggest a practical action and defend it.' },
  summary: { title: 'Summary', goal: 'Summarize the position using at least two target phrases.' },
};

function getErrorMessage(code: string) {
  const messages: Record<string, string> = {
    AUTH_REQUIRED: 'يجب تسجيل الدخول أولًا لبدء غرفة المحادثة. · Sign in before starting the conversation room.',
    VOICE_SERVICE_NOT_CONFIGURED: 'لم تتم إضافة إعدادات خدمة المحادثة الصوتية في الخادم. · The server voice service is not configured.',
    VOICE_LIMIT_REACHED: 'تم بلوغ حد خدمة الصوت مؤقتًا. حاول بعد قليل. · The voice-service limit was reached. Please try again later.',
    VOICE_SESSION_FAILED: 'تعذر إنشاء الجلسة الصوتية. تحقق من الاتصال وإعدادات OpenAI. · The voice session could not be created. Check the connection and OpenAI settings.',
    EVALUATION_NOT_CONFIGURED: 'خدمة التقييم غير مهيأة في الخادم. · The evaluation service is not configured.',
    EVALUATION_LIMIT_REACHED: 'تم بلوغ حد التقييم مؤقتًا. احتفظنا بمحاولتك على هذا الجهاز. · The evaluation limit was reached; your attempt remains on this device.',
  };
  return messages[code] || 'حدث خطأ غير متوقع. حاول مرة أخرى. · An unexpected error occurred. Please try again.';
}

export default function VoiceConversationRoom() {
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
  const [helpCount, setHelpCount] = useState(0);
  const [consentToStoreTranscript, setConsentToStoreTranscript] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const helpCountRef = useRef(0);
  const elapsedRef = useRef(0);
  const startedAtRef = useRef<string | null>(null);
  const endingRef = useRef(false);

  useEffect(() => () => cleanupMedia(), []);
  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  function addTranscript(entry?: TranscriptEntry) {
    if (!entry?.text) return;
    const next = [...transcriptRef.current, entry];
    transcriptRef.current = next;
    setTranscript(next);
  }

  function cleanupMedia() {
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
  }

  function sendEvent(event: Record<string, unknown>) {
    if (channelRef.current?.readyState === 'open') channelRef.current.send(JSON.stringify(event));
  }

  function requestVoiceResponse(instructions: string) {
    sendEvent({ type: 'response.create', response: { output_modalities: ['audio'], instructions } });
  }

  function startClock() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
      if (elapsedRef.current === 660) {
        requestVoiceResponse('انتقل بلطف إلى مرحلة الخلاصة. اطلب من الطالب تلخيص موقفه في ثلاث جمل واستعمال عبارتين مستهدفتين.');
      }
      if (elapsedRef.current >= conversationRoom.technical.maxSessionMinutes * 60) void finishConversation(true);
    }, 1000);
  }

  async function startConversation() {
    if (screen !== 'intro') return;
    setError(''); setEvaluation(null); setAudioBlocked(false); setStatus('connecting'); setScreen('live');
    transcriptRef.current = []; setTranscript([]); helpCountRef.current = 0; setHelpCount(0);
    elapsedRef.current = 0; setElapsed(0); endingRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      streamRef.current = stream;
      const peer = new RTCPeerConnection();
      peerRef.current = peer;
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      const audio = new Audio();
      audio.autoplay = true; audio.volume = volume; audio.setAttribute('playsinline', '');
      audioRef.current = audio;
      peer.ontrack = (event) => {
        audio.srcObject = event.streams[0] || new MediaStream([event.track]);
        void audio.play().then(() => setAudioBlocked(false)).catch(() => {
          setAudioBlocked(true);
          setError('منع المتصفح تشغيل صوت المحاور تلقائيًا. اضغط «تشغيل صوت المحاور». · The browser blocked autoplay. Press “Play facilitator audio”.');
        });
      };

      const channel = peer.createDataChannel('oai-events');
      channelRef.current = channel;
      channel.onmessage = ({ data }) => {
        try {
          const change = readRealtimeEvent(JSON.parse(data));
          if (change.status) setStatus(change.status as RoomStatus);
          if (change.transcript) addTranscript(change.transcript);
          if (change.error) setError(change.error);
        } catch { /* Ignore malformed non-critical events. */ }
      };
      channel.onopen = () => {
        startedAtRef.current = new Date().toISOString();
        setStatus('facilitator-speaking'); startClock();
        requestVoiceResponse('ابدأ الآن بالترحيب القصير وسؤال التهيئة الأول، ولا تسأل أكثر من سؤال واحد.');
      };
      channel.onclose = () => { if (!endingRef.current) { setStatus('error'); setError('انقطع الاتصال الصوتي. يمكنك إعادة المحاولة أو استعمال الكتابة. · The voice connection ended. Retry or use text input.'); setTextFallback(true); } };
      peer.onconnectionstatechange = () => {
        if ((peer.connectionState === 'failed' || peer.connectionState === 'disconnected') && !endingRef.current) {
          setStatus('error'); setError('انقطع الاتصال الصوتي. تحقق من الشبكة ثم أعد المحاولة. · The voice connection was interrupted. Check your network and retry.');
        }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const response = await fetch('/api/realtime/session', { method: 'POST', headers: { 'Content-Type': 'application/sdp' }, body: offer.sdp || '' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'VOICE_SESSION_FAILED' }));
        throw new Error(payload.error || 'VOICE_SESSION_FAILED');
      }
      await peer.setRemoteDescription({ type: 'answer', sdp: await response.text() });
    } catch (caught) {
      cleanupMedia(); setStatus('error'); setTextFallback(true);
      const name = caught instanceof DOMException && caught.name === 'NotAllowedError' ? 'لم تسمح للمتصفح باستعمال الميكروفون. اسمح به من شريط العنوان ثم أعد المحاولة. · Microphone permission was denied. Allow it from the address bar and retry.' : getErrorMessage(caught instanceof Error ? caught.message : '');
      setError(name);
    }
  }

  async function resumeFacilitatorAudio() {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      await audio.play();
      setAudioBlocked(false);
      setError('');
    } catch {
      setAudioBlocked(true);
      setError('تعذّر تشغيل صوت المحاور. تحقق من إخراج الصوت في المتصفح ثم حاول مرة أخرى. · Facilitator audio could not play. Check browser audio output and try again.');
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

  function askForHelp(kind: 'hint' | 'rephrase' | 'bilingual') {
    helpCountRef.current += 1; setHelpCount(helpCountRef.current);
    const instructions = kind === 'hint'
      ? 'أعط الطالب تلميحًا صوتيًا: ثلاث كلمات عربية أو بداية جملة فقط، من غير جواب كامل.'
      : kind === 'rephrase'
        ? 'أعد السؤال السابق بعربية أبسط وبسرعة أبطأ قليلًا، ولا تغيّر هدف السؤال.'
        : 'اشرح المطلوب باختصار شديد بالإنجليزية، ثم عُد مباشرة إلى العربية.';
    requestVoiceResponse(instructions);
  }

  function submitTextFallback(event: FormEvent) {
    event.preventDefault();
    const text = textInput.trim();
    if (!text || channelRef.current?.readyState !== 'open') return setError('الاتصال الصوتي غير متاح حاليًا. أعد المحاولة لفتح قناة المحادثة. · The conversation channel is unavailable. Reconnect and try again.');
    addTranscript({ role: 'learner', text });
    sendEvent({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] } });
    requestVoiceResponse('أجب صوتيًا بالعربية الفصحى، تابع المرحلة الحالية، واسأل سؤالًا واحدًا فقط.');
    setTextInput(''); setStatus('understanding');
  }

  async function finishConversation(automatic = false) {
    if (endingRef.current) return;
    endingRef.current = true; setStatus('ended'); setScreen('evaluating');
    if (!automatic) requestVoiceResponse('اشكر الطالب بإيجاز وقل إن التقرير سيظهر الآن. لا تذكر درجة.');
    await new Promise((resolve) => setTimeout(resolve, automatic ? 250 : 700));
    cleanupMedia();
    try {
      const response = await fetch('/api/conversation-room/evaluate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcriptRef.current, startedAt: startedAtRef.current, durationSeconds: elapsedRef.current, helpCount: helpCountRef.current, consentToStoreTranscript }),
      });
      const payload = await response.json().catch(() => ({ error: 'EVALUATION_FAILED' }));
      if (!response.ok) throw new Error(payload.error || 'EVALUATION_FAILED');
      const report = payload as Evaluation;
      setEvaluation(report); setScreen('report');
      let saved: Record<string, unknown> = {}; try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch {}
      const bestScore = Math.max(Number(saved.bestScore || 0), report.totalScore || 0);
      const localRecord: Record<string, unknown> = {
        lessonId: conversationRoom.lessonId, startedAt: startedAtRef.current, endedAt: new Date().toISOString(),
        durationSeconds: elapsedRef.current, completed: report.evaluationStatus === 'complete', score: report.totalScore,
        dimensions: report.dimensions, usedExpressions: report.usedExpressions, helpCount: helpCountRef.current,
        bestScore, attempts: Number(saved.attempts || 0) + 1,
      };
      if (consentToStoreTranscript) localRecord.transcript = transcriptRef.current;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localRecord));
      if (report.passed) {
        let sections = Array(7).fill(false); try { const value = JSON.parse(localStorage.getItem(LEVEL_PROGRESS_KEY) || '[]'); if (Array.isArray(value)) sections = sections.map((_, index) => Boolean(value[index])); } catch {}
        sections[4] = true; localStorage.setItem(LEVEL_PROGRESS_KEY, JSON.stringify(sections));
        markSectionComplete('B1', 1, 'conversation');
      }
    } catch (caught) {
      setScreen('live'); setStatus('error'); endingRef.current = false;
      setError(getErrorMessage(caught instanceof Error ? caught.message : 'EVALUATION_FAILED'));
    }
  }

  function restart() {
    cleanupMedia(); endingRef.current = false; startedAtRef.current = null; transcriptRef.current = [];
    setTranscript([]); setEvaluation(null); setError(''); setAudioBlocked(false); setElapsed(0); setStatus('idle'); setMuted(false); setPaused(false); setScreen('intro');
  }

  if (screen === 'intro') return <main className="conversation-room-page">
    <header className="conversation-hero">
      <Link className="back-link" href="/levels/B1">← المستوى المتقدم · Advanced</Link>
      <div className="conversation-kicker">المستوى المتقدم · Advanced · الدرس الأول · Lesson 1 · Voice-to-voice</div>
      <h1>{conversationRoom.titleAr}</h1><p dir="ltr">{conversationRoom.titleEn}</p>
      <div className="scenario-card"><span>🏛️</span><div><strong>المشهد · Scenario</strong><p>{conversationRoom.scenario.settingAr}</p><small dir="ltr">{conversationRoom.scenario.settingEn}</small></div></div>
    </header>
    <section className="conversation-preflight">
      <article><h2>ما الذي ستتدرّب عليه؟ · What will you practise?</h2><ul>{conversationRoom.learningObjectives.map((item) => <li key={item.id}><span>✓</span><div>{item.ar}<small dir="ltr">{item.en}</small></div></li>)}</ul></article>
      <article><h2>تحديات اللغة · Language challenges</h2><div className="challenge-list">{conversationRoom.secretChallenges.map((item, index) => <div key={item.id}><b>{index + 1}</b><span>{item.ar}<small dir="ltr">{index === 0 ? 'Use بِالأَخَصِّ or بِالذَّاتِ.' : index === 1 ? 'Use a hollow verb such as قَالَ، يَقُولُ، رَأَى، or سَارَ.' : 'Use قَرَارُنَا هَذَا or خُطَّةُ الجَامِعَةِ هَذِهِ.'}</small></span></div>)}</div></article>
    </section>
    <section className="conversation-start-card">
      <div className="time-notice"><strong>8–12 دقيقة · minutes</strong><span>المحادثة صوتية مباشرة، والحد الأقصى 15 دقيقة. ستحتاج إلى ميكروفون وسماعات. · This is a live voice conversation with a 15-minute limit. You need a microphone and speakers.</span></div>
      <label className="consent-row"><input type="checkbox" checked={consentToStoreTranscript} onChange={(event) => setConsentToStoreTranscript(event.target.checked)} /><span>أوافق على حفظ نص المحادثة مع نتيجتي. لن يُحفظ التسجيل الصوتي. · I agree to save the transcript with my result. Audio is never stored.</span></label>
      <button type="button" className="conversation-start-button" onClick={startConversation}>🎙️ {conversationRoom.ui.primaryActionAr} · Start conversation</button>
      <p className="privacy-note">لن يطلب المتحدث معلومات شخصية، ولن يبدأ الميكروفون إلا بعد ضغط زر البدء. · The facilitator will not request personal information, and the microphone starts only after you press the button.</p>
    </section>
  </main>;

  if (screen === 'evaluating') return <main className="conversation-room-page"><section className="evaluation-loading" aria-live="polite"><div className="voice-orb active"><span /></div><h1>نُعِدّ تقرير محادثتك… · Preparing your conversation report…</h1><p>نراجع وضوح أفكارك، والعبارات المستهدفة، والقواعد والطلاقة. · We are reviewing clarity, target phrases, grammar, and fluency.</p></section></main>;

  if (screen === 'report' && evaluation) return <main className="conversation-room-page">
    <header className="report-hero"><div><div className="conversation-kicker">تقرير غرفة المحادثة · Conversation report</div><h1>{evaluation.evaluationStatus === 'complete' ? 'أحسنت، اكتملت المحادثة · Well done, conversation complete' : 'نحتاج إلى محادثة أطول · A longer conversation is needed'}</h1><p>{evaluation.summaryAr}</p><small dir="ltr">{evaluation.summaryEn}</small></div><div className={`score-ring ${evaluation.passed ? 'passed' : ''}`}><strong>{evaluation.totalScore}</strong><span>/ 20</span><small>{evaluation.passed ? 'متقن · Mastered' : 'درجة الإتقان · Mastery: 14'}</small></div></header>
    <section className="dimension-grid">{Object.entries(dimensionLabels).map(([key, label]) => <article key={key}><div><strong>{label.ar} · {label.en}</strong></div><b>{evaluation.dimensions[key as keyof Evaluation['dimensions']]} / {label.max}</b></article>)}</section>
    <section className="report-grid"><article><h2>نقاط القوة · Strengths</h2><ul>{evaluation.strengths.map((item, index) => <li key={index}>{item}</li>)}</ul></article><article><h2>الخطوات التالية · Next steps</h2><ul>{evaluation.nextSteps.map((item, index) => <li key={index}>{item}</li>)}</ul></article></section>
    <section className="used-expressions"><h2>عبارات استعملتها · Phrases you used</h2>{evaluation.usedExpressions.length ? <div>{evaluation.usedExpressions.map((item) => <span key={item}>{item}</span>)}</div> : <p>لم يُرصد استعمال واضح للعبارات المستهدفة بعد. · No clear use of target phrases was detected yet.</p>}</section>
    {evaluation.corrections.length > 0 && <section className="corrections"><h2>ثلاثة تصحيحات ذات أولوية كحد أقصى · Up to three priority corrections</h2>{evaluation.corrections.map((item, index) => <article key={index}><p className="original">{item.original}</p><p className="corrected">✓ {item.corrected}</p><small>{item.explanationAr}</small><small dir="ltr">{item.explanationEn}</small></article>)}</section>}
    <details className="transcript-review"><summary>عرض نص المحادثة · Show transcript</summary>{transcript.map((entry, index) => <p key={index} className={entry.role}><strong>{entry.role === 'learner' ? 'أنت · You' : 'المحاور · Facilitator'}:</strong> {entry.text}</p>)}</details>
    <LessonCompletion level="B1" lesson={1} section="conversation" passed={evaluation.passed} score={`${evaluation.totalScore}/20`} onRetry={restart} />
  </main>;

  return <main className="conversation-room-page live-room">
    <header className="live-room-head"><div><div className="conversation-kicker">قرارٌ أثار جدلًا · A controversial decision</div><h1>غرفة المحادثة الصوتية · Voice conversation room</h1></div><div className="room-timer" aria-label="مدة المحادثة · Conversation duration">{formatConversationTime(elapsed)}<small>من · of 15:00</small></div></header>
    <div className="live-layout"><section className="voice-stage">
      <div className={`status-pill ${status}`} aria-live="polite"><span />{statusLabels[status]}</div>
      <div className={`voice-orb ${status === 'facilitator-speaking' || status === 'learner-speaking' ? 'active' : ''}`} aria-hidden="true"><span /><i /></div>
      <h2>{status === 'learner-turn' || status === 'learner-speaking' ? 'تكلّم الآن بالعربية الفصحى · Speak in Modern Standard Arabic now' : statusLabels[status]}</h2>
      <p>استعمل حججك بحرية. لن يقاطعك المحاور لتصحيح الأخطاء العادية. · Express your reasoning freely; the facilitator will not interrupt ordinary errors.</p>
      {error && <div className="conversation-error" role="alert">{error}</div>}
      {audioBlocked && <button type="button" className="conversation-start-button" onClick={() => void resumeFacilitatorAudio()}>▶ تشغيل صوت المحاور · Play facilitator audio</button>}
      {captions && <div className="live-caption" aria-live="polite">{transcript.at(-1)?.text || 'سيظهر النص هنا عند بدء الحديث. · Live captions will appear here.'}</div>}
      <div className="help-controls" aria-label="المساعدة الصوتية · Voice help"><button type="button" onClick={() => askForHelp('hint')}>💡 تلميح · Hint</button><button type="button" onClick={() => askForHelp('rephrase')}>↻ أعد السؤال · Rephrase</button><button type="button" onClick={() => askForHelp('bilingual')}>EN مساعدة · Help</button></div>
      {textFallback && <form className="text-fallback" onSubmit={submitTextFallback}><label htmlFor="fallback-answer">بديل كتابي عند تعذر الميكروفون · Text alternative when the microphone is unavailable</label><div><input id="fallback-answer" value={textInput} onChange={(event) => setTextInput(event.target.value)} placeholder="اكتب إجابتك بالعربية… · Write your answer in Arabic…" /><button type="submit">إرسال · Send</button></div></form>}
    </section>
    <aside className="phase-panel"><h2>مراحل الاجتماع · Meeting stages</h2><ol>{conversationRoom.phases.map((phase) => <li key={phase.id}><b>{phase.order}</b><div><strong>{phase.titleAr} · {phaseEnglish[phase.id]?.title}</strong><small>{phase.goalAr} · {phaseEnglish[phase.id]?.goal}</small></div></li>)}</ol><div className="help-counter">طلبات المساعدة · Help requests: <strong>{helpCount}</strong></div></aside></div>
    <footer className="room-controls">
      <button type="button" className={muted ? 'active' : ''} onClick={toggleMute} aria-pressed={muted}>{muted ? '🔇 إلغاء الكتم · Unmute' : '🎙️ كتم الميكروفون · Mute'}</button>
      <button type="button" className={paused ? 'active' : ''} onClick={togglePause} aria-pressed={paused}>{paused ? '▶ متابعة · Resume' : '⏸ إيقاف مؤقت · Pause'}</button>
      <button type="button" onClick={() => setCaptions((value) => !value)} aria-pressed={captions}>CC {captions ? 'إخفاء النص · Hide captions' : 'النص الحي · Live captions'}</button>
      <button type="button" onClick={() => setTextFallback((value) => !value)} aria-pressed={textFallback}>⌨ البديل الكتابي · Text input</button>
      <label className="volume-control">🔊<span>الصوت · Volume</span><input type="range" min="0" max="1" step="0.1" value={volume} onChange={(event) => setVolume(Number(event.target.value))} /></label>
      <button type="button" className="end-button" onClick={() => void finishConversation(false)}>إنهاء وإظهار التقرير · End and show report</button>
    </footer>
  </main>;
}
