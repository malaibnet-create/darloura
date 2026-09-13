'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { hydrateLearningDataFromCloud } from '../../lib/learning-progress';
import { createClient } from '../../lib/supabase/client';
import { setActiveLearningUser } from '../../lib/user-scoped-storage.mjs';

export default function LearningDataSession({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const isPublicEntryRoute = [
    '/',
    '/login',
    '/signup',
    '/verify',
    '/welcome',
    '/forgot-password',
    '/reset-password',
    '/check-email',
  ].includes(pathname);

  useEffect(() => {
    let mounted = true;
    let unsubscribe = () => {};

    try {
      const client = createClient();
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        setActiveLearningUser(session?.user?.id || null);

        if (session?.user) {
          queueMicrotask(() => {
            void hydrateLearningDataFromCloud().catch(() => false);
          });
        }
      });
      unsubscribe = () => data.subscription.unsubscribe();

      void client.auth.getUser()
        .then(async ({ data: userData }) => {
          setActiveLearningUser(userData.user?.id || null);
          if (userData.user) await hydrateLearningDataFromCloud();
        })
        .catch(() => {
          setActiveLearningUser(null);
        })
        .finally(() => {
          if (mounted) setReady(true);
        });
    } catch {
      setActiveLearningUser(null);
      queueMicrotask(() => {
        if (mounted) setReady(true);
      });
    }

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  if (!ready && !isPublicEntryRoute) {
    return <div role="status" aria-live="polite" className="app-session-loading">
      <span dir="ltr">Preparing your learning progress…</span>
    </div>;
  }

  return children;
}
