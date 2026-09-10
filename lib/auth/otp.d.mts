export const EMAIL_OTP_LENGTH: 6;
export const AUTH_REQUEST_COOLDOWN_SECONDS: 60;
export function normalizeEmail(value: unknown): string;
export function normalizeEmailOtp(value: unknown): string;
export function isEmailOtpReady(value: unknown): boolean;
export function remainingCooldownSeconds(until: unknown, now?: number): number;
export function authRequestErrorMessage(error: unknown, fallback: string): string;
