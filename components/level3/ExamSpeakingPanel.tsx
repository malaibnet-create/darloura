'use client';

import { useEffect, useRef, useState } from 'react';
import { formatConversationTime, readRealtimeEvent } from '../../lib/conversation-realtime.mjs';

export type ExamTranscriptEntry = { role: 'learner' | 'examiner'; text: string };

export default function ExamSpeakingPanel({ attemptId, initialTranscript, locked, onChange, onComplete }: {
  attemptId: string;
  initialTranscript: ExamTranscriptEntry[];
  locked: boolean;
  onChange: (entries: ExamTranscriptEntry[]) => void;
  onComplete: (entries: ExamTranscriptEntry[]) => void;
}) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'examiner' | 'learner' | 'understanding' | 'ended' | 'error'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [captions, setCaptions] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [transcript, setTranscript] = useState(initialTranscript);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<ExamTranscriptEntry[]>(initialTranscript);
  const elapsedRef = useRef(0);
  const endingRef = useRef(false);

  useEffect(() => () => cleanup(), []);

  function cleanup() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    channelRef.current?.close(); peerRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.srcObject = null; }
    channelRef.current = null; peerRef.current = null; streamRef.current = null;
  }

  function addEntry(role: 'learner' | 'examiner', text: string) {
    if (!text.trim()) return;
    const next = [...transcriptRef.current, { role, text: text.trim() }];
    transcriptRef.current = next; setTranscript(next); onChange(next);
  }

  function send(event: Record<string, unknown>) {
    if (channelRef.current?.readyState === 'open') channelRef.current.send(JSON.stringify(event));
  }

  async function start() {
    if (locked || (status !== 'idle' && status !== 'error')) return;
    setError(''); setAudioBlocked(false); setStatus('connecting'); endingRef.current = false; elapsedRef.current = 0; setElapsed(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      streamRef.current = stream;
      const peer = new RTCPeerConnection(); peerRef.current = peer;
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      const audio = new Audio(); audio.autoplay = true; audio.setAttribute('playsinline', ''); audioRef.current = audio;
      peer.ontrack = (event) => {
        audio.srcObject = event.streams[0] || new MediaStream([event.track]);
        void audio.play().then(() => setAudioBlocked(false)).catch(() => {
          setAudioBlocked(true);
          setError('منع المتصفح تشغيل صوت الممتحن تلقائيًا. اضغط «تشغيل صوت الممتحن». · The browser blocked autoplay. Press “Play examiner audio”.');
        });
      };
      const channel = peer.createDataChannel('oai-events'); channelRef.current = channel;
      channel.onmessage = ({ data }) => {
        try {
          const change = readRealtimeEvent(JSON.parse(data));
          if (change.status === 'facilitator-speaking') setStatus('examiner');
          if (change.status === 'learner-speaking' || change.status === 'learner-turn') setStatus('learner');
          if (change.status === 'understanding') setStatus('understanding');
          if (change.transcript) addEntry(change.transcript.role === 'learner' ? 'learner' : 'examiner', change.transcript.text);
          if (change.error) { setError(change.error); setStatus('error'); }
        } catch { /* Ignore unrelated realtime events. */ }
      };
      channel.onopen = () => {
        setStatus('examiner');
        send({ type: 'response.create', response: { output_modalities: ['audio'], instructions: 'ابدأ الآن بصيغة بداية الامتحان المحددة، ثم اطرح السؤال الأول فقط.' } });
        timerRef.current = setInterval(() => {
          elapsedRef.current += 1; setElapsed(elapsedRef.current);
          if (elapsedRef.current >= 9 * 60) finish(true);
        }, 1000);
      };
      channel.onclose = () => { if (!endingRef.current) { setStatus('error'); setError('انقطع الاتصال. أعد فتح القسم لإكمال محاولة المحادثة نفسها. · The connection ended. Reopen the section to continue the same speaking attempt.'); } };
      const offer = await peer.createOffer(); await peer.setLocalDescription(offer);
      const response = await fetch(`/api/level3-exam/realtime?attemptId=${encodeURIComponent(attemptId)}`, { method: 'POST', headers: { 'Content-Type': 'application/sdp' }, body: offer.sdp || '' });
      if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(payload.error || 'VOICE_SESSION_FAILED'); }
      await peer.setRemoteDescription({ type: 'answer', sdp: await response.text() });
    } catch (caught) {
      cleanup(); setStatus('error');
      if (caught instanceof DOMException && caught.name === 'NotAllowedError') setError('لم تسمح باستعمال الميكروفون. اسمح به من شريط العنوان ثم حاول مرة أخرى. · Microphone permission was denied. Allow it from the address bar and retry.');
      else setError(caught instanceof Error && caught.message === 'VOICE_SERVICE_NOT_CONFIGURED' ? 'المحادثة الصوتية غير مهيأة في الخادم. · The server voice service is not configured.' : 'تعذر بدء المحادثة الصوتية. تحقق من الإعدادات والاتصال. · The voice conversation could not start. Check the settings and connection.');
    }
  }

  async function resumeExaminerAudio() {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      await audio.play();
      setAudioBlocked(false);
      setError('');
    } catch {
      setAudioBlocked(true);
      setError('تعذّر تشغيل صوت الممتحن. تحقق من إخراج الصوت ثم حاول مرة أخرى. · Examiner audio could not play. Check audio output and try again.');
    }
  }

  function finish(automatic = false) {
    if (endingRef.current) return;
    endingRef.current = true;
    if (!automatic) send({ type: 'response.create', response: { output_modalities: ['audio'], instructions: 'قل جملة الختام المحددة فقط، من غير تقييم أو تصحيح.' } });
    setTimeout(() => {
      cleanup(); setStatus('ended'); onComplete(transcriptRef.current);
    }, automatic ? 100 : 650);
  }

  function toggleMute() {
    const next = !muted; setMuted(next);
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
  }

  if (locked) return <div className="exam-speaking-panel locked-production"><strong>تم تثبيت قسم المحادثة. · Speaking section submitted.</strong><p>سيظهر تقييمه بعد تسليم الامتحان النهائي. · Its evaluation appears after final submission.</p></div>;
  return <div className="exam-speaking-panel">
    <div className="speaking-status" aria-live="polite"><span className={status} />{
      status === 'idle' ? 'جاهز لبدء المحادثة · Ready' : status === 'connecting' ? 'جاري الاتصال · Connecting' : status === 'examiner' ? 'الممتحن يتحدث · Examiner speaking' : status === 'learner' ? 'دورك في الكلام · Your turn' : status === 'understanding' ? 'جاري فهم إجابتك · Understanding your answer' : status === 'ended' ? 'انتهت الجلسة · Session ended' : 'مشكلة في الاتصال · Connection problem'
    }</div>
    <div className={`exam-voice-orb ${status === 'examiner' || status === 'learner' ? 'active' : ''}`}>🎙️</div>
    <strong className="speaking-clock">{formatConversationTime(elapsed)} / 09:00</strong>
    <p>أجب بالعربية الفصحى. لا توجد تلميحات أو تصحيحات أثناء الامتحان. · Answer in Modern Standard Arabic. No hints or corrections are provided during the exam.</p>
    {error && <div className="exam-alert error" role="alert">{error}</div>}
    {audioBlocked && <button type="button" onClick={() => void resumeExaminerAudio()}>▶ تشغيل صوت الممتحن · Play examiner audio</button>}
    {captions && <div className="exam-captions" aria-live="polite">{transcript.at(-1)?.text || 'سيظهر النص هنا عند بدء الحديث. · Live captions will appear here.'}</div>}
    <div className="speaking-controls">
      {status === 'idle' || status === 'error' ? <button type="button" onClick={() => void start()}>ابدأ الاختبار الصوتي · Start speaking test</button> : <>
        <button type="button" onClick={toggleMute}>{muted ? 'إلغاء كتم الميكروفون · Unmute' : 'كتم الميكروفون · Mute'}</button>
        <button type="button" onClick={() => setCaptions((value) => !value)}>{captions ? 'إخفاء النص الحي · Hide captions' : 'إظهار النص الحي · Show captions'}</button>
        <button type="button" className="danger" onClick={() => finish(false)}>إنهاء المحادثة · End conversation</button>
      </>}
    </div>
    {transcript.filter((entry) => entry.role === 'learner').length > 0 && <small>تم تفريغ {transcript.filter((entry) => entry.role === 'learner').length} إجابات صوتية وحفظها تلقائيًا. · {transcript.filter((entry) => entry.role === 'learner').length} spoken answers were transcribed and autosaved.</small>}
  </div>;
}
