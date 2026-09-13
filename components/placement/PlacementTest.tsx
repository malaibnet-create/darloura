'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import { placementQuestions } from '../../data/placement/public-questions';
import { PlacementResponse } from '../../data/placement/types';
import {
  audioFileExtension,
  hasUsableRecordingPath,
  isSpeakingResponseComplete,
  selectSupportedAudioMime,
} from '../../lib/placement-recording.mjs';
import { userSessionStorage as sessionStorage } from '../../lib/user-scoped-storage.mjs';

const storageKey = 'darlugha-placement-draft-v2';

function microphoneErrorMessage(error: unknown) {
  if (!window.isSecureContext) {
    return 'Microphone access requires a secure HTTPS connection. Open https://darlugha.com and try again, or choose Type instead.';
  }

  const errorName = error instanceof DOMException ? error.name : '';
  if (errorName === 'NotAllowedError' || errorName === 'SecurityError') {
    return 'Microphone access is blocked. Tap the lock, site-controls, or “aA” icon beside the address, open Site settings, set Microphone to Allow, then reload this page. You can also choose Type instead.';
  }
  if (errorName === 'NotFoundError') {
    return 'No microphone was found on this device. Connect or enable a microphone, or choose Type instead.';
  }
  if (errorName === 'NotReadableError' || errorName === 'AbortError') {
    return 'The microphone is busy or could not be opened. Close other apps that use it, reload this page, and try again—or choose Type instead.';
  }

  return 'The microphone could not start in this browser. Check the browser microphone permission and try again, or choose Type instead.';
}

export default function PlacementTest() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<Record<number, PlacementResponse>>({});
  const [recording, setRecording] = useState(false);
  const [requestingMicrophone, setRequestingMicrophone] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const activeStream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const discardRecording = useRef(false);
  const question = placementQuestions[index];
  const response = responses[question.id];
  const textValue = typeof response?.value === 'string' ? response.value : '';
  const wordCount = textValue.trim().split(/\s+/).filter(Boolean).length;
  const hasRecording = hasUsableRecordingPath(response?.recordingPath);
  const speakingMode = response?.answerMode ?? (textValue.trim() ? 'text' : 'audio');
  const answered = question.type === 'choice'
    ? typeof response?.value === 'number'
    : question.type === 'speaking'
      ? isSpeakingResponseComplete(response)
      : textValue.trim().length > 0;
  const percent = Math.round(((index + 1) / placementQuestions.length) * 100);
  const busyWithRecording = recording || requestingMicrophone || uploading;
  const skillLabel = useMemo(
    () => ({ listening: 'Listening', reading: 'Reading', writing: 'Writing', speaking: 'Speaking' })[question.skill],
    [question.skill],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const draft = sessionStorage.getItem(storageKey);
      if (draft) {
        try {
          const saved = JSON.parse(draft) as { index?: unknown; responses?: unknown };
          const savedIndex = typeof saved.index === 'number' && Number.isInteger(saved.index)
            ? Math.min(Math.max(saved.index, 0), placementQuestions.length - 1)
            : 0;
          setIndex(savedIndex);
          if (saved.responses && typeof saved.responses === 'object') {
            setResponses(saved.responses as Record<number, PlacementResponse>);
          }
        } catch {
          // Ignore an invalid saved draft.
        }
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify({ index, responses }));
  }, [index, responses]);

  useEffect(() => () => {
    discardRecording.current = true;
    clearRecordingTimers();
    if (recorder.current?.state === 'recording') recorder.current.stop();
    stopActiveStream();
  }, []);

  function clearRecordingTimers() {
    if (timer.current) clearInterval(timer.current);
    if (stopTimer.current) clearTimeout(stopTimer.current);
    timer.current = null;
    stopTimer.current = null;
  }

  function stopActiveStream() {
    activeStream.current?.getTracks().forEach((track) => track.stop());
    activeStream.current = null;
  }

  function update(value: number | string) {
    setResponses((current) => ({ ...current, [question.id]: { questionId: question.id, value } }));
    setError('');
  }

  function chooseSpeakingMode(answerMode: 'audio' | 'text') {
    if (busyWithRecording) return;
    setResponses((current) => ({
      ...current,
      [question.id]: {
        ...current[question.id],
        questionId: question.id,
        answerMode,
      },
    }));
    setError('');
  }

  function updateSpeakingText(value: string) {
    setResponses((current) => ({
      ...current,
      [question.id]: {
        ...current[question.id],
        questionId: question.id,
        answerMode: 'text',
        value,
      },
    }));
    setError('');
  }

  async function startRecording() {
    setError('');
    if (!window.isSecureContext) {
      setError('Microphone access requires a secure HTTPS connection. Open https://darlugha.com and try again, or choose Type instead.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('This browser does not support microphone recording. Please choose Type instead below.');
      return;
    }

    let stream: MediaStream | null = null;
    setRequestingMicrophone(true);
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      activeStream.current = stream;

      const preferredMimeType = selectSupportedAudioMime((mimeType) => MediaRecorder.isTypeSupported(mimeType));
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = preferredMimeType
          ? new MediaRecorder(stream, { mimeType: preferredMimeType })
          : new MediaRecorder(stream);
      } catch {
        mediaRecorder = new MediaRecorder(stream);
      }

      const questionId = question.id;
      const maximumSeconds = question.maxSeconds ?? 60;
      let recorderFailed = false;
      recorder.current = mediaRecorder;
      chunks.current = [];
      discardRecording.current = false;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      mediaRecorder.onerror = () => {
        recorderFailed = true;
        setError('Recording stopped because the browser reported an audio error. Try again, or choose Type instead.');
      };
      mediaRecorder.onstop = async () => {
        clearRecordingTimers();
        stopActiveStream();
        recorder.current = null;
        setRecording(false);
        if (discardRecording.current || recorderFailed) return;

        const contentType = mediaRecorder.mimeType || preferredMimeType || chunks.current[0]?.type || 'audio/webm';
        const blob = new Blob(chunks.current, { type: contentType });
        if (blob.size === 0) {
          setError('The browser created an empty recording. Check microphone access and try again, or choose Type instead.');
          return;
        }

        try {
          setUploading(true);
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Please sign in again before recording.');
          const extension = audioFileExtension(blob.type);
          const path = `${user.id}/speaking-${questionId}-${Date.now()}.${extension}`;
          const { error: uploadError } = await supabase.storage
            .from('placement-recordings')
            .upload(path, blob, { contentType: blob.type, upsert: false });
          if (uploadError) throw uploadError;
          setResponses((current) => ({
            ...current,
            [questionId]: {
              ...current[questionId],
              questionId,
              answerMode: 'audio',
              recordingPath: path,
            },
          }));
          setError('');
        } catch (uploadError) {
          setError(uploadError instanceof Error
            ? `The recording could not be uploaded: ${uploadError.message}. Try again, or choose Type instead.`
            : 'The recording could not be uploaded. Try again, or choose Type instead.');
        } finally {
          setUploading(false);
        }
      };

      mediaRecorder.start(1000);
      setResponses((current) => ({
        ...current,
        [questionId]: {
          ...current[questionId],
          questionId,
          answerMode: 'audio',
        },
      }));
      setRecording(true);
      setRecordingSeconds(0);
      timer.current = setInterval(() => {
        setRecordingSeconds((seconds) => Math.min(seconds + 1, maximumSeconds));
      }, 1000);
      stopTimer.current = setTimeout(() => {
        if (mediaRecorder.state === 'recording') mediaRecorder.stop();
      }, maximumSeconds * 1000);
    } catch (recordingError) {
      if (stream) stream.getTracks().forEach((track) => track.stop());
      stopActiveStream();
      recorder.current = null;
      setRecording(false);
      clearRecordingTimers();
      setError(microphoneErrorMessage(recordingError));
    } finally {
      setRequestingMicrophone(false);
    }
  }

  function stopRecording() {
    if (recorder.current?.state === 'recording') recorder.current.stop();
  }

  async function submit() {
    setSubmitting(true);
    setError('');
    try {
      const result = await fetch('/api/placement/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: Object.values(responses) }),
      });
      const payload = await result.json();
      if (!result.ok) throw new Error(payload.error || 'Unable to submit the assessment.');
      sessionStorage.removeItem(storageKey);
      router.push(`/placement-test/result?attempt=${payload.attemptId}`);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to submit the assessment.');
      setSubmitting(false);
    }
  }

  const audioFile = question.audioPath?.split('/').pop();
  const audioUrl = audioFile && process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/placement-audio/${audioFile}`
    : undefined;

  return (
    <main className="shell placement-shell" lang="en" dir="ltr">
      <header className="topbar">
        <strong>Arabic Placement Assessment</strong>
        <a className="link" href="/dashboard">Dashboard</a>
      </header>
      <section className="placement-card">
        <div className="placement-meta">
          <span>Question {index + 1} of {placementQuestions.length}</span>
          <span>{skillLabel} · {question.cefrLevel}</span>
        </div>
        <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>
        {question.passage && <div className="reading-passage" dir="rtl" lang="ar">{question.passage}</div>}
        <div className="eyebrow">{skillLabel.toUpperCase()} IN MODERN STANDARD ARABIC</div>
        <h1 dir="rtl" lang="ar">{question.prompt}</h1>

        {audioUrl && (
          <div className="audio-box">
            <audio controls preload="none" src={audioUrl}><track kind="captions" /></audio>
            <small>Select Play to listen. Audio never starts automatically.</small>
          </div>
        )}

        {question.options && (
          <div className="placement-options">
            {question.options.map((option, optionIndex) => (
              <button
                key={option}
                type="button"
                dir="rtl"
                lang="ar"
                className={response?.value === optionIndex ? 'selected' : ''}
                onClick={() => update(optionIndex)}
              >
                {String.fromCharCode(65 + optionIndex)}. {option}
              </button>
            ))}
          </div>
        )}

        {question.type === 'reorder' || question.type === 'short-text' ? (
          <input
            className="placement-input"
            dir="rtl"
            lang="ar"
            value={textValue}
            onChange={(event) => update(event.target.value)}
            placeholder="Write your answer in Arabic"
          />
        ) : null}

        {question.type === 'writing' ? (
          <>
            <textarea
              className="placement-textarea"
              dir="rtl"
              lang="ar"
              value={textValue}
              onChange={(event) => update(event.target.value)}
              placeholder="Write your answer in Arabic"
            />
            <small className="word-counter">Words: {wordCount} / {question.maxWords}</small>
          </>
        ) : null}

        {question.type === 'speaking' ? (
          <div className="recording-box">
            <div className="speaking-mode-switch" role="group" aria-label="Choose how to answer">
              <button
                type="button"
                className={speakingMode === 'audio' ? 'selected' : ''}
                disabled={busyWithRecording}
                onClick={() => chooseSpeakingMode('audio')}
              >
                Record my answer
              </button>
              <button
                type="button"
                className={speakingMode === 'text' ? 'selected' : ''}
                disabled={busyWithRecording}
                onClick={() => chooseSpeakingMode('text')}
              >
                Type instead
              </button>
            </div>

            {speakingMode === 'audio' ? (
              <>
                <p>When you are ready, allow your browser to use the microphone. Maximum recording time: {question.maxSeconds ?? 60} seconds.</p>
                {recording ? (
                  <button type="button" className="record-button recording" onClick={stopRecording}>
                    Stop recording ({recordingSeconds}s)
                  </button>
                ) : (
                  <button type="button" className="record-button" disabled={uploading || requestingMicrophone} onClick={startRecording}>
                    {requestingMicrophone ? 'Waiting for microphone permission…' : uploading ? 'Uploading recording…' : hasRecording ? 'Record again' : 'Start recording'}
                  </button>
                )}
                {hasRecording && !recording && (
                  <span role="status">Your recording was uploaded successfully. You may record it again.</span>
                )}
                <details className="microphone-help">
                  <summary>Microphone not working? Follow these steps</summary>
                  <ol>
                    <li>Tap the lock, site-controls, or “aA” icon beside the browser address.</li>
                    <li>Open Site settings and set Microphone to Allow.</li>
                    <li>Reload this page, then tap Start recording again.</li>
                    <li>If recording is still unavailable, choose Type instead above.</li>
                  </ol>
                </details>
              </>
            ) : (
              <div className="speaking-text-fallback">
                <label htmlFor={`speaking-answer-${question.id}`}>Written alternative</label>
                <p id={`speaking-help-${question.id}`}>Type in Arabic what you would have said aloud. This answer is saved as your alternative speaking response.</p>
                <textarea
                  id={`speaking-answer-${question.id}`}
                  className="placement-textarea"
                  dir="rtl"
                  lang="ar"
                  value={textValue}
                  maxLength={1500}
                  aria-describedby={`speaking-help-${question.id}`}
                  onChange={(event) => updateSpeakingText(event.target.value)}
                  placeholder="اكتب إجابتك بالعربية هنا"
                />
              </div>
            )}
          </div>
        ) : null}

        {error && <p className="placement-error" role="alert">{error}</p>}
        <div className="placement-actions">
          <button type="button" className="secondary-button" disabled={index === 0 || submitting || busyWithRecording} onClick={() => setIndex((current) => current - 1)}>Back</button>
          {index < placementQuestions.length - 1 ? (
            <button type="button" className="primary-button" disabled={!answered || busyWithRecording || submitting} onClick={() => setIndex((current) => current + 1)}>Next</button>
          ) : (
            <button type="button" className="primary-button" disabled={!answered || busyWithRecording || submitting} onClick={submit}>{submitting ? 'Submitting…' : 'Submit assessment'}</button>
          )}
        </div>
      </section>
    </main>
  );
}
