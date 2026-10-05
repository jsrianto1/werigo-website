import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { getPool } from "./db";
import { ac, roles } from "./permissions";
import { sendPasswordResetEmail, sendVerificationEmail } from "./mailer";

/**
 * Better Auth server configuration (users, sessions, roles).
 *
 * Roles: "customer" (default; public sign-up with email + password or
 * Google), "admin" and "super_admin" (staff, created only with
 * `node scripts/create-admin.mjs`).
 *
 * Email verification is sent on sign-up but does not block checkout:
 * WhatsApp is the primary contact. A working email is still needed
 * for password reset, which is why the verification email goes out.
 *
 * Imports are relative on purpose: the Better Auth CLI loads this
 * file outside Next.js (`npm run auth:generate`) and does not know
 * the `@/` alias.
 */

export const ROLES = ["customer", "admin", "super_admin"] as const;
export type Role = (typeof ROLES)[number];
export const STAFF_ROLES: readonly Role[] = ["admin", "super_admin"];

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  process.env.BETTER_AUTH_URL?.trim() ||
  "http://localhost:3000";

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

export const GOOGLE_SIGN_IN_ENABLED = Boolean(googleClientId && googleClientSecret);

export const auth = betterAuth({
  appName: "Werigo",
  baseURL: siteUrl,
  secret: process.env.BETTER_AUTH_SECRET?.trim(),
  trustedOrigins: [siteUrl],
  database: getPool(),
  user: {
    additionalFields: {
      /** WhatsApp number in +62… form; pre-fills checkout. */
      phone: { type: "string", required: false, input: true },
      nationality: { type: "string", required: false, input: true },
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, user.name, url);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    // Never let a slow or failing mailbox block sign-up: send in the
    // background and log failures (the customer can resend from Profile).
    sendVerificationEmail: async ({ user, url }) => {
      void sendVerificationEmail(user.email, user.name, url).catch((err) => {
        console.error(`[mail] verification email failed: ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`);
      });
    },
  },
  socialProviders: GOOGLE_SIGN_IN_ENABLED
    ? { google: { clientId: googleClientId!, clientSecret: googleClientSecret! } }
    : {},
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  plugins: [
    admin({ ac, roles, defaultRole: "customer", adminRoles: [...STAFF_ROLES] }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
export type SessionUser = Session["user"] & {
  role?: string | null;
  banned?: boolean | null;
  phone?: string | null;
  nationality?: string | null;
};
