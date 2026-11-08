import { createSupportHandler } from "@/lib/support";
import { isMailConfigured, sendRequiredSupportMail } from "@/lib/mailer";
import { site } from "@/lib/config";

export const runtime = "nodejs";
export const POST = createSupportHandler({
  trustedOrigin: new URL(process.env.NEXT_PUBLIC_SITE_URL || site.baseUrl).origin,
  allowLocalOrigins: process.env.NODE_ENV !== "production",
  isConfigured: isMailConfigured,
  send: sendRequiredSupportMail,
});
