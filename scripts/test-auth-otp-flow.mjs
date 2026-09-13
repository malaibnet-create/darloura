import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  EMAIL_OTP_LENGTH,
  authRequestErrorMessage,
  isEmailOtpReady,
  normalizeEmail,
  normalizeEmailOtp,
  remainingCooldownSeconds,
} from '../lib/auth/otp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = (relativePath) => readFile(path.join(root, relativePath), 'utf8');

assert.equal(EMAIL_OTP_LENGTH, 8);
assert.equal(normalizeEmail('  Student@Example.COM '), 'student@example.com');
assert.equal(normalizeEmailOtp('12a 34-5678-90'), '12345678');
assert.equal(isEmailOtpReady('12345678'), true);
assert.equal(isEmailOtpReady('123456'), false);
assert.equal(remainingCooldownSeconds(61_000, 1_000), 60);
assert.equal(remainingCooldownSeconds(500, 1_000), 0);
assert.match(authRequestErrorMessage({ status: 429 }, 'fallback'), /wait one minute/i);

const [home, signup, verify, login, forgot, reset, welcome, checkEmail, placement, callback, learningSession, confirmationTemplate, recoveryTemplate, migration] = await Promise.all([
  source('app/page.tsx'),
  source('app/signup/page.tsx'),
  source('app/verify/page.tsx'),
  source('app/login/page.tsx'),
  source('app/forgot-password/page.tsx'),
  source('app/reset-password/page.tsx'),
  source('app/welcome/page.tsx'),
  source('app/check-email/page.tsx'),
  source('components/placement/PlacementTest.tsx'),
  source('app/auth/callback/route.ts'),
  source('components/learning/LearningDataSession.tsx'),
  source('supabase/email-templates/confirm-signup.html'),
  source('supabase/email-templates/reset-password.html'),
  source('supabase/migrations/007_profiles_auth_and_password_reset.sql'),
]);

assert.match(signup, /auth\.signUp/);
assert.match(signup, /darlugha-pending-signup/);
assert.match(signup, /EMAIL_OTP_LENGTH/);
assert.match(signup, /passwordConfirmation/);
assert.match(signup, /Confirm password/);
assert.doesNotMatch(signup, /router\.push\(`\/verify\?/);
assert.match(verify, /type: 'email'/);
assert.match(verify, /auth\.resend\(\{ type: 'signup'/);
assert.match(verify, /maxLength=\{EMAIL_OTP_LENGTH\}/);
assert.doesNotMatch(verify, /placeholder="000000"/);
assert.match(forgot, /resetPasswordForEmail/);
assert.match(forgot, /darlugha-pending-recovery-email/);
assert.match(reset, /type: 'recovery'/);
assert.match(reset, /auth\.updateUser\(\{ password \}\)/);
assert.match(reset, /auth\.signOut\(\)/);
assert.match(reset, /passwordConfirmation/);
for (const page of [home, signup, verify, login, forgot, reset, welcome, checkEmail, placement]) {
  assert.match(page, /lang="en"/);
  assert.match(page, /dir="ltr"/);
}
assert.match(learningSession, /isPublicEntryRoute/);
assert.match(learningSession, /!ready && !isPublicEntryRoute/);
assert.match(callback, /auth=missing-code/);
assert.match(callback, /auth=callback-error/);
assert.match(callback, /catch/);
assert.match(login, /auth.*missing-code/s);
assert.match(login, /auth.*callback-error/s);
assert.match(confirmationTemplate, /\{\{ \.Token \}\}/);
assert.match(recoveryTemplate, /\{\{ \.Token \}\}/);
assert.match(confirmationTemplate, /<html lang="en" dir="ltr">/);
assert.match(recoveryTemplate, /<html lang="en" dir="ltr">/);
assert.doesNotMatch(confirmationTemplate, /ConfirmationURL/);
assert.doesNotMatch(recoveryTemplate, /ConfirmationURL/);
assert.match(migration, /create trigger on_auth_user_created/i);
assert.match(migration, /execute procedure public\.handle_new_user\(\)/i);

console.log('Auth OTP flow checks passed.');
