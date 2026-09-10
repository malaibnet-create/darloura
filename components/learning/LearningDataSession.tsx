'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { hydrateLearningDataFromCloud } from '../../lib/learning-progress';
import { createClient } from '../../lib/supabase/client';
import { setActiveLearningUser } from '../../lib/user-scoped-storage.mjs';

export default function LearningDataSession({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

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

  if (!ready) {
    return <div role="status" aria-live="polite" className="app-session-loading">
      <span>جارٍ تجهيز حسابك…</span>
      <small dir="ltr">Preparing your learning progress…</small>
    </div>;
  }

  return children;
}
