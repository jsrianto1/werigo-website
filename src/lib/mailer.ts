import nodemailer, { type Transporter } from "nodemailer";

/**
 * Outgoing email through the Hostinger mailbox (SMTP_*). Used for
 * account verification and password reset. When SMTP is not
 * configured (local dev), the message is logged instead of sent so
 * the flow can still be exercised.
 *
 * No `server-only` import: src/lib/auth.ts pulls this in and is also
 * loaded by the Better Auth CLI outside Next.js.
 */

function smtpConfig() {
  // Host, port and user default to the Hostinger mailbox documented in
  // .env.example; only the password is strictly required.
  const host = process.env.SMTP_HOST?.trim() || "smtp.hostinger.com";
  const user = process.env.SMTP_USER?.trim() || "noreply@werigo.co";
  const pass = process.env.SMTP_PASSWORD?.trim();
  const port = Number(process.env.SMTP_PORT?.trim() || 465);
  if (!pass) return null;
  return { host, port, secure: port === 465, auth: { user, pass } };
}

export function isMailConfigured(): boolean {
  return smtpConfig() !== null;
}

function from(): string {
  return process.env.MAIL_FROM?.trim() || `Werigo <${process.env.SMTP_USER?.trim() ?? "noreply@werigo.co"}>`;
}

let transport: Transporter | null = null;

export async function sendMail(msg: { to: string; subject: string; text: string; html: string }): Promise<void> {
  const cfg = smtpConfig();
  if (!cfg) {
    console.warn(`[mail] SMTP not configured; would send "${msg.subject}" to ${msg.to.replace(/(.{2}).+(@.+)/, "$1…$2")}`);
    if (process.env.NODE_ENV !== "production") console.warn(`[mail] ${msg.text}`);
    return;
  }
  transport ??= nodemailer.createTransport(cfg);
  await transport.sendMail({ from: from(), ...msg });
}

/* ================= Templates ================= */

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f6f5;font-family:Inter,Arial,sans-serif;color:#17201d">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:14px;padding:32px">
<tr><td style="font-size:20px;font-weight:700;padding-bottom:16px">Werigo</td></tr>
<tr><td style="font-size:22px;font-weight:600;padding-bottom:12px">${escapeHtml(title)}</td></tr>
<tr><td style="font-size:15px;line-height:1.6">${bodyHtml}</td></tr>
<tr><td style="font-size:12px;color:#6b7572;padding-top:24px">Werigo, electric motorcycle rental in Bali. Powered by Wedison.<br>If you did not request this email, you can ignore it.</td></tr>
</table></td></tr></table></body></html>`;
}

function button(url: string, label: string): string {
  return `<p style="margin:24px 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:#0b5c4d;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px">${escapeHtml(label)}</a></p><p style="font-size:13px;color:#6b7572">Or copy this link:<br>${escapeHtml(url)}</p>`;
}

export async function sendVerificationEmail(to: string, name: string, url: string): Promise<void> {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  await sendMail({
    to,
    subject: "Confirm your email for Werigo",
    text: `${greeting}\n\nConfirm your email address to finish setting up your Werigo account:\n${url}\n\nThe link is valid for one hour.`,
    html: layout(
      "Confirm your email",
      `<p>${greeting}</p><p>Confirm your email address to finish setting up your Werigo account.</p>${button(url, "Confirm email")}<p>The link is valid for one hour.</p>`
    ),
  });
}

export async function sendPasswordResetEmail(to: string, name: string, url: string): Promise<void> {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  await sendMail({
    to,
    subject: "Reset your Werigo password",
    text: `${greeting}\n\nSomeone asked to reset the password of your Werigo account. Set a new password here:\n${url}\n\nThe link is valid for one hour. If this was not you, ignore this email; your password stays the same.`,
    html: layout(
      "Reset your password",
      `<p>${greeting}</p><p>Someone asked to reset the password of your Werigo account.</p>${button(url, "Set a new password")}<p>The link is valid for one hour. If this was not you, ignore this email; your password stays the same.</p>`
    ),
  });
}
