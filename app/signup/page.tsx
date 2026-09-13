'use client';

import { FormEvent, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import {
  AUTH_REQUEST_COOLDOWN_SECONDS,
  EMAIL_OTP_LENGTH,
  authRequestErrorMessage,
  normalizeEmail,
} from '../../lib/auth/otp.mjs';

const RESEND_UNTIL_KEY = 'darlugha-signup-resend-until';

const startedOptions = [
  { value: 'لم أبدأ بعد', label: 'I have not started yet' },
  { value: 'منذ أقل من 6 أشهر', label: 'Less than 6 months ago' },
  { value: 'منذ سنة', label: 'About one year ago' },
  { value: 'منذ أكثر من سنة', label: 'More than one year ago' },
];

const trackOptions = [
  { value: 'الفصحى', label: 'Modern Standard Arabic (MSA)' },
  { value: 'الدارجة', label: 'Moroccan Darija' },
  { value: 'كلاهما', label: 'Both MSA and Moroccan Darija' },
];

const goalOptions = [
  { value: 'التحدث بثقة', label: 'Speak with confidence' },
  { value: 'الدراسة أو الجامعة', label: 'Study or university' },
  { value: 'العمل', label: 'Work' },
  { value: 'السفر', label: 'Travel' },
  { value: 'فهم الثقافة العربية', label: 'Understand Arab culture' },
];

export default function SignupPage() {
  const requestInFlight = useRef(false);
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [started, setStarted] = useState('لم أبدأ بعد');
  const [track, setTrack] = useState('الفصحى');
  const [goal, setGoal] = useState('');
  const [interest, setInterest] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  function nextProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !goal) {
      setMessage('Please enter your full name and choose your main learning goal.');
      return;
    }
    setName(name.trim());
    setMessage('');
    setStep(2);
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestInFlight.current) return;
    if (password.length < 6) {
      setMessage('Your password must contain at least 6 characters.');
      return;
    }
    if (password !== passwordConfirmation) {
      setMessage('The passwords do not match.');
      return;
    }

    requestInFlight.current = true;
    setLoading(true);
    setMessage('');
    const normalizedEmail = normalizeEmail(email);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: name.trim(),
            age: age ? Number(age) : null,
            started_learning: started,
            arabic_track: track,
            learning_goal: goal,
            interests: interest.trim(),
          },
        },
      });

      if (error) {
        setMessage(authRequestErrorMessage(error, 'We could not create your account. Please check your details and try again.'));
        return;
      }
      if (!data.user) {
        setMessage('We could not start account creation. Please try again.');
        return;
      }

      if (data.session) {
        window.sessionStorage.removeItem('darlugha-pending-signup');
        window.sessionStorage.removeItem(RESEND_UNTIL_KEY);
        router.replace('/welcome');
        return;
      }

      window.sessionStorage.setItem(
        'darlugha-pending-signup',
        JSON.stringify({ email: normalizedEmail, name: name.trim() }),
      );
      window.sessionStorage.setItem(
        RESEND_UNTIL_KEY,
        String(Date.now() + AUTH_REQUEST_COOLDOWN_SECONDS * 1000),
      );
      router.push('/verify');
    } catch {
      setMessage('We could not connect to the account service. Check your internet connection and try again.');
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  }

  if (step === 1) {
    return (
      <main className="shell" lang="en" dir="ltr">
        <section className="auth-page wide-auth auth-ltr">
          <div className="eyebrow">LET&apos;S GET TO KNOW YOU</div>
          <h1>Personalize your Arabic journey.</h1>
          <p>Your answers help us recommend lessons that match your goals.</p>
          <form onSubmit={nextProfile}>
            <label>
              Full name
              <input dir="auto" autoComplete="name" placeholder="Enter your full name" value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
            <label>
              Age <span className="auth-note">(optional)</span>
              <input type="number" min="8" max="100" inputMode="numeric" placeholder="Enter your age" value={age} onChange={(event) => setAge(event.target.value)} />
            </label>
            <label>
              When did you start learning Arabic?
              <select value={started} onChange={(event) => setStarted(event.target.value)}>
                {startedOptions.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label>
              Which type of Arabic would you like to learn?
              <select value={track} onChange={(event) => setTrack(event.target.value)}>
                {trackOptions.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label>
              What is your main goal?
              <select value={goal} onChange={(event) => setGoal(event.target.value)} required>
                <option value="">Choose your goal</option>
                {goalOptions.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label>
              Interests <span className="auth-note">(optional)</span>
              <input dir="auto" placeholder="For example: travel, sport, films" value={interest} onChange={(event) => setInterest(event.target.value)} />
            </label>
            <button className="button" type="submit">Continue →</button>
            {message && <p className="auth-error" role="alert">{message}</p>}
          </form>
          <p className="switch-text">Already have an account? <Link className="link" href="/login">Sign in</Link></p>
          <Link className="link back-link" href="/">Back to home</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="shell" lang="en" dir="ltr">
      <section className="auth-page auth-ltr">
        <button className="back-button" type="button" onClick={() => setStep(1)}>← Edit my profile</button>
        <div className="eyebrow">FINAL STEP</div>
        <h1>Create your account.</h1>
        <p>We will email you a {EMAIL_OTP_LENGTH}-digit verification code.</p>
        <form onSubmit={createAccount}>
          <label>
            Email address
            <input type="email" dir="ltr" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" dir="ltr" autoComplete="new-password" placeholder="At least 6 characters" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          <label>
            Confirm password
            <input type="password" dir="ltr" autoComplete="new-password" placeholder="Enter your password again" minLength={6} value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} required />
          </label>
          <button className="button" type="submit" disabled={loading}>{loading ? 'Creating your account…' : 'Create account and send code'}</button>
          {message && <p className="auth-error" role="alert">{message}</p>}
        </form>
      </section>
    </main>
  );
}
