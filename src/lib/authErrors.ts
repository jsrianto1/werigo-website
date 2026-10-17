export const AUTH_SERVICE_UNAVAILABLE = "Sign-in and registration are temporarily unavailable. Please try again shortly.";
export const GOOGLE_CALLBACK_ERROR = "Google sign-in could not be completed. Please try again or sign in with email.";

const messages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "That email and password don't match.",
  USER_ALREADY_EXISTS: "An account with this email already exists. Sign in instead.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "An account with this email already exists. Sign in instead.",
  PASSWORD_TOO_SHORT: "Use at least 10 characters for your password.",
  PASSWORD_TOO_LONG: "That password is too long.",
  INVALID_EMAIL: "Enter a valid email address.",
  EMAIL_NOT_VERIFIED: "Please confirm your email first. Check your inbox for the link.",
  BANNED_USER: "This account has been suspended. Contact us on WhatsApp.",
  USER_NOT_FOUND: "That email and password don't match.",
};

export function describeAuthError(error: { code?: string; message?: string; status?: number } | null | undefined): string {
  if (error?.status === 429) return "Too many attempts. Please wait a minute before trying again.";
  if ((error?.status ?? 0) >= 500) return AUTH_SERVICE_UNAVAILABLE;
  if (error?.code && messages[error.code]) return messages[error.code];
  return "Could not complete your request. Please check your details and try again.";
}
