export const EMAIL_OTP_LENGTH = 6;
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
  const code = String(error?.code || '');
  if (status === 429 || code.includes('rate_limit')) {
    return 'أرسلت طلبات كثيرة. انتظر دقيقة قبل المحاولة مجددًا.';
  }
  if (code === 'email_address_invalid') {
    return 'عنوان البريد الإلكتروني غير صالح.';
  }
  return fallback;
}
