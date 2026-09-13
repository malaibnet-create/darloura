'use client';

import { useEffect, useRef, useState } from 'react';
import {
  isRunningAsInstalledApp,
  PWA_INSTALLED_STORAGE_KEY,
  PWA_INSTALL_READY_EVENT,
  PWA_INSTALL_STATE_EVENT,
  wasAppInstalledInThisBrowser,
} from './PwaRuntime';

type InstallAppButtonProps = {
  locale?: 'en' | 'ar';
  className?: string;
};

function isAppleMobileDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export default function InstallAppButton({ locale = 'en', className = '' }: InstallAppButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const closeButton = useRef<HTMLButtonElement | null>(null);
  const arabic = locale === 'ar';

  useEffect(() => {
    const syncInstallationState = () => {
      setInstalled(isRunningAsInstalledApp() || wasAppInstalledInThisBrowser());
      setMounted(true);
    };
    const frame = window.requestAnimationFrame(syncInstallationState);
    const displayMode = window.matchMedia('(display-mode: standalone)');
    displayMode.addEventListener('change', syncInstallationState);
    window.addEventListener(PWA_INSTALL_READY_EVENT, syncInstallationState);
    window.addEventListener(PWA_INSTALL_STATE_EVENT, syncInstallationState);
    return () => {
      window.cancelAnimationFrame(frame);
      displayMode.removeEventListener('change', syncInstallationState);
      window.removeEventListener(PWA_INSTALL_READY_EVENT, syncInstallationState);
      window.removeEventListener(PWA_INSTALL_STATE_EVENT, syncInstallationState);
    };
  }, []);

  useEffect(() => {
    if (!showHelp) return;
    closeButton.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowHelp(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [showHelp]);

  async function installApp() {
    const installPrompt = window.__darLughaInstallPrompt;
    if (!installPrompt) {
      setShowHelp(true);
      return;
    }

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      window.__darLughaInstallPrompt = undefined;
      if (choice.outcome === 'accepted') {
        try {
          window.localStorage.setItem(PWA_INSTALLED_STORAGE_KEY, '1');
        } catch {
          // The appinstalled event or standalone mode will also hide the button.
        }
        setInstalled(true);
      }
    } catch {
      window.__darLughaInstallPrompt = undefined;
      setShowHelp(true);
    }
  }

  if (!mounted || installed) return null;

  const appleMobile = isAppleMobileDevice();
  const label = arabic ? 'ثبّت التطبيق · Install app' : 'Install the app';
  const title = arabic ? 'ثبّت DarLugha على جهازك' : 'Install DarLugha on your device';

  return (
    <>
      <button
        type="button"
        className={`install-app-button ${className}`.trim()}
        onClick={installApp}
      >
        <span aria-hidden="true">⇩</span>
        {label}
      </button>

      {showHelp && (
        <div className="pwa-install-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setShowHelp(false);
        }}>
          <section
            className="pwa-install-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
            lang={arabic ? 'ar' : 'en'}
            dir={arabic ? 'rtl' : 'ltr'}
          >
            <button
              ref={closeButton}
              type="button"
              className="pwa-install-close"
              aria-label={arabic ? 'إغلاق تعليمات التثبيت' : 'Close installation instructions'}
              onClick={() => setShowHelp(false)}
            >
              ×
            </button>
            <div className="pwa-install-icon" aria-hidden="true">⇩</div>
            <h2 id="pwa-install-title">{title}</h2>
            {appleMobile ? (
              arabic ? (
                <>
                  <p>على iPhone أو iPad، يتم التثبيت من Safari:</p>
                  <ol>
                    <li>افتح darlugha.com في Safari.</li>
                    <li>اضغط زر المشاركة، ثم «إضافة إلى الشاشة الرئيسية».</li>
                    <li>فعّل «فتح كتطبيق ويب»، ثم اضغط «إضافة».</li>
                  </ol>
                </>
              ) : (
                <>
                  <p>On iPhone or iPad, install from Safari:</p>
                  <ol>
                    <li>Open darlugha.com in Safari.</li>
                    <li>Tap Share, then Add to Home Screen.</li>
                    <li>Turn on Open as Web App, then tap Add.</li>
                  </ol>
                </>
              )
            ) : arabic ? (
              <>
                <p>افتح قائمة المتصفح واختر «تثبيت DarLugha» أو اضغط رمز التثبيت بجانب شريط العنوان.</p>
                <p className="pwa-install-note">إذا لم يظهر الخيار، افتح المنصة في Chrome أو Edge وتأكد من أنك تستخدم الرابط الآمن https://darlugha.com.</p>
              </>
            ) : (
              <>
                <p>Open your browser menu and choose Install DarLugha, or select the install icon beside the address bar.</p>
                <p className="pwa-install-note">If the option is missing, open the platform in Chrome or Edge and make sure you are using the secure https://darlugha.com address.</p>
              </>
            )}
            <button type="button" className="button" onClick={() => setShowHelp(false)}>
              {arabic ? 'فهمت' : 'Got it'}
            </button>
          </section>
        </div>
      )}
    </>
  );
}
