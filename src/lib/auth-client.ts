"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";
import { ac, roles } from "@/lib/permissions";

/**
 * Browser auth client. Talks to /api/auth/* on this same origin; the
 * session cookie is httpOnly, so nothing secret lives in the bundle.
 * `inferAdditionalFields` is type-only: it teaches the client about
 * the phone / nationality fields without importing server code.
 */
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>(), adminClient({ ac, roles })],
});

export type ClientSession = typeof authClient.$Infer.Session;
