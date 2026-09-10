'use client';

import { useEffect, useState } from 'react';
import { AUDIO_ERROR_EVENT } from '../../lib/audio';

type Detail = { reason?: string };

export default function AudioErrorNotice() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    let timeout = 0;
    const handleError = (event: Event) => {
      const detail = (event as CustomEvent<Detail>).detail;
      setMessage(detail?.reason === 'arabic-voice-unavailable'
        ? 'لا يتوفر صوت عربي في هذا الجهاز، ولا يوجد تسجيل جاهز لهذا العنصر. · No Arabic system voice is available for this item.'
        : 'تعذّر تشغيل التسجيل الصوتي. تحقق من الاتصال ثم حاول مرة أخرى. · The audio could not be played.');
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setMessage(''), 7000);
    };
    window.addEventListener(AUDIO_ERROR_EVENT, handleError);
    return () => {
      window.removeEventListener(AUDIO_ERROR_EVENT, handleError);
      window.clearTimeout(timeout);
    };
  }, []);

  if (!message) return null;
  return <div className="audio-error-notice" role="alert" aria-live="assertive">
    <span>{message}</span>
    <button type="button" onClick={() => setMessage('')} aria-label="إغلاق رسالة خطأ الصوت · Close audio error">×</button>
  </div>;
}
