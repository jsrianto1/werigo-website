import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { getPool } from "./db";
import { ac, roles } from "./permissions";

/**
 * Better Auth server configuration (users, sessions, roles).
 *
 * Roles: "customer" (default, Phase 1 accounts), "admin" and
 * "super_admin" (staff). Staff accounts are created with
 * `node scripts/create-admin.mjs`; public sign-up stays disabled
 * until the customer accounts phase ships.
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

export const auth = betterAuth({
  appName: "Werigo",
  baseURL: siteUrl,
  secret: process.env.BETTER_AUTH_SECRET?.trim(),
  trustedOrigins: [siteUrl],
  database: getPool(),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    // Phase 1 (customer accounts) turns sign-up on.
    disableSignUp: true,
  },
  socialProviders:
    googleClientId && googleClientSecret
      ? { google: { clientId: googleClientId, clientSecret: googleClientSecret } }
      : {},
  session: {
    expiresIn: 60 * 60 * 24 * 14, // 14 days
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  plugins: [
    admin({ ac, roles, defaultRole: "customer", adminRoles: [...STAFF_ROLES] }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
