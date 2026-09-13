import Link from 'next/link';

export default function CheckEmailPage() {
  return (
    <main className="shell" lang="en" dir="ltr">
      <section className="auth-page auth-ltr">
        <div className="success-mark">✉</div>
        <div className="eyebrow">CHECK YOUR EMAIL</div>
        <h1>We sent you a verification code.</h1>
        <p>Enter the complete code on the verification page to finish creating your account.</p>
        <p className="muted-text">If you cannot find the message, check your spam or junk folder.</p>
        <Link className="button" href="/verify">Enter verification code</Link>
        <Link className="link back-link" href="/login">Back to sign in</Link>
      </section>
    </main>
  );
}
