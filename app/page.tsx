import Image from 'next/image';
import Link from 'next/link';
import InstallAppButton from '../components/pwa/InstallAppButton';

export default function HomePage() {
  return (
    <main className="shell" lang="en" dir="ltr">
      <header className="topbar">
        <div className="brand">
          <Image src="/assets/arabicpath-logo.png" alt="DarLugha logo" width={52} height={43} />
          <span>Dar<span>Lugha</span></span>
        </div>
        <div className="header-actions">
          <Link className="link" href="/login">Sign in</Link>
          <Link className="button small-button" href="/signup">Create an account</Link>
        </div>
      </header>

      <section className="hero">
        <div>
          <div className="eyebrow">YOUR ARABIC JOURNEY STARTS HERE</div>
          <h1>Learn Arabic<br /><em>with clarity and confidence.</em></h1>
          <p>
            Follow structured lessons, practise real-life skills, and get personal support
            as you progress from your first words to confident communication.
          </p>
          <div className="actions">
            <Link className="button" href="/signup">Start your journey →</Link>
            <InstallAppButton locale="en" />
            <Link className="link" href="/signup">Create an account for the placement test</Link>
          </div>
        </div>
        <div className="visual">
          <Image src="/assets/arabicpath-logo.png" alt="DarLugha" width={600} height={500} priority />
        </div>
      </section>
    </main>
  );
}
