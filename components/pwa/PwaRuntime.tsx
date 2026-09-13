'use client';

import { useEffect } from 'react';

export type DarLughaInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

declare global {
  interface Window {
    __darLughaInstallPrompt?: DarLughaInstallPromptEvent;
  }
}

export const PWA_INSTALL_READY_EVENT = 'darlugha:pwa-install-ready';
export const PWA_INSTALL_STATE_EVENT = 'darlugha:pwa-install-state';
export const PWA_INSTALLED_STORAGE_KEY = 'darlugha-pwa-installed';

export function isRunningAsInstalledApp() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches
    || navigatorWithStandalone.standalone === true;
}

export function wasAppInstalledInThisBrowser() {
  try {
    return window.localStorage.getItem(PWA_INSTALLED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export default function PwaRuntime() {
  useEffect(() => {
    if ('serviceWorker' in navigator && window.isSecureContext) {
      void navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      }).catch(() => {
        // Installation help still works when service-worker registration fails.
      });
    }

    const captureInstallPrompt = (event: Event) => {
      const installEvent = event as DarLughaInstallPromptEvent;
      installEvent.preventDefault();
      window.__darLughaInstallPrompt = installEvent;
      try {
        window.localStorage.removeItem(PWA_INSTALLED_STORAGE_KEY);
      } catch {
        // Storage may be unavailable in a private browsing context.
      }
      window.dispatchEvent(new Event(PWA_INSTALL_READY_EVENT));
    };

    const markInstalled = () => {
      window.__darLughaInstallPrompt = undefined;
      try {
        window.localStorage.setItem(PWA_INSTALLED_STORAGE_KEY, '1');
      } catch {
        // Standalone display mode still hides the button if storage is unavailable.
      }
      window.dispatchEvent(new Event(PWA_INSTALL_STATE_EVENT));
    };

    window.addEventListener('beforeinstallprompt', captureInstallPrompt);
    window.addEventListener('appinstalled', markInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', captureInstallPrompt);
      window.removeEventListener('appinstalled', markInstalled);
    };
  }, []);

  return null;
}
