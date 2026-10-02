"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { ac, roles } from "@/lib/permissions";

/**
 * Browser auth client. Talks to /api/auth/* on this same origin; the
 * session cookie is httpOnly, so nothing secret lives in the bundle.
 */
export const authClient = createAuthClient({
  plugins: [adminClient({ ac, roles })],
});
