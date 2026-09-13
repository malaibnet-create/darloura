'use client';

import { useRouter } from 'next/navigation';

export default function WelcomePage() {
  const router = useRouter();

  return (
    <main className="shell" lang="en" dir="ltr">
      <section className="auth-page auth-ltr">
        <div className="success-mark">✓</div>
        <div className="eyebrow">WELCOME TO DARLUGHA</div>
        <h1>Your account is ready! 🎉</h1>
        <p>You can take the placement assessment now or go directly to your learning dashboard.</p>
        <div className="auth-choice">
          <button className="button" type="button" onClick={() => router.push('/placement-test')}>Take the placement assessment</button>
          <button className="button secondary" type="button" onClick={() => router.push('/dashboard')}>Go to my dashboard</button>
        </div>
      </section>
    </main>
  );
}
