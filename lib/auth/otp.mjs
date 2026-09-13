const configuredOtpLength = Number.parseInt(process.env.NEXT_PUBLIC_EMAIL_OTP_LENGTH || '8', 10);

export const EMAIL_OTP_LENGTH = Number.isInteger(configuredOtpLength)
  && configuredOtpLength >= 6
  && configuredOtpLength <= 10
  ? configuredOtpLength
  : 8;
export const AUTH_REQUEST_COOLDOWN_SECONDS = 60;

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function normalizeEmailOtp(value) {
  return String(value || '').replace(/\D/g, '').slice(0, EMAIL_OTP_LENGTH);
}

export function isEmailOtpReady(value) {
  return normalizeEmailOtp(value).length === EMAIL_OTP_LENGTH;
}

export function remainingCooldownSeconds(until, now = Date.now()) {
  const remaining = Math.ceil((Number(until) - now) / 1000);
  return Number.isFinite(remaining) ? Math.max(0, remaining) : 0;
}

export function authRequestErrorMessage(error, fallback) {
  const status = Number(error?.status);
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  if (status === 429 || code.includes('rate_limit') || message.includes('rate limit')) {
    return 'Too many requests. Please wait one minute before trying again.';
  }
  if (code === 'email_address_invalid') {
    return 'Please enter a valid email address.';
  }
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return 'Please verify your email address before signing in.';
  }
  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return 'The email address or password is incorrect.';
  }
  if (code.includes('otp') || message.includes('token has expired') || message.includes('invalid token')) {
    return 'The verification code is incorrect or has expired. Request a new code and try again.';
  }
  return fallback;
}
