import { createHash } from "node:crypto";
import { z } from "zod";

export const SUPPORT_RECIPIENTS = ["werigo.bali@gmail.com", "wedison.bali@gmail.com"] as const;
export const supportSchema = z.object({
  kind: z.enum(["question", "partnership"]),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).refine(value => !/[\r\n]/.test(value)),
  phone: z.string().trim().max(40).regex(/^[+\d\s().-]*$/).default(""),
  company: z.string().trim().max(120).default(""),
  message: z.string().trim().min(10).max(2000),
  locale: z.enum(["en", "id", "ru"]).default("en"),
  source: z.string().max(250).regex(/^\/[a-zA-Z0-9/_-]*$/).default("/"),
  submissionId: z.string().uuid(),
  website: z.string().max(200).default(""),
}).strict();
export type SupportInput = z.infer<typeof supportSchema>;
export type SupportMail = { to: string[]; replyTo: string; subject: string; text: string; html: string };
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]!);

export function buildSupportMail(input: SupportInput): SupportMail {
  const topic = input.kind === "partnership" ? "Partnership enquiry" : "Customer question";
  const fields = [
    ["Name", input.name], ["Email", input.email],
    ...(input.phone ? [["WhatsApp", input.phone]] : []),
    ...(input.company ? [["Business", input.company]] : []),
    ["Language", { en:"English", id:"Indonesian", ru:"Russian" }[input.locale]],
    ["Website page", input.source],
  ];
  return {
    to:[...SUPPORT_RECIPIENTS], replyTo:input.email, subject:`[WERIGO website] ${topic}`,
    text:`${topic}\n\n${fields.map(([label,value]) => `${label}: ${value}`).join("\n")}\n\nMessage:\n${input.message}\n\nSent from the WERIGO website concierge. Reply to this email to contact the sender.`,
    html:`<!doctype html><html><body style="margin:0;background:#f5f1eb;color:#103c3b;font-family:Arial,sans-serif;padding:24px"><div style="max-width:600px;margin:auto;background:#fff;border-radius:18px;padding:28px"><p style="color:#007565;font-size:12px;font-weight:700;letter-spacing:2px">WERIGO</p><h1 style="font-size:24px">${topic}</h1><table role="presentation" style="font-size:14px;line-height:1.7">${fields.map(([label,value]) => `<tr><td style="vertical-align:top;padding:3px 18px 3px 0;color:#516765">${label}</td><td>${escape(value)}</td></tr>`).join("")}</table><div style="padding:18px;background:#f5f1eb;border-radius:12px;line-height:1.7;margin-top:20px;overflow-wrap:anywhere">${escape(input.message).replace(/\r?\n/g,"<br>")}</div><p style="font-size:12px;color:#516765;margin-top:24px">Sent from the WERIGO website concierge. Reply to this email to contact the sender.</p></div></body></html>`,
  };
}

type Dependencies = { trustedOrigin: string; allowLocalOrigins: boolean; isConfigured: () => boolean; send: (mail: SupportMail) => Promise<void>; now?: () => number };
const json = (status: number, value: object) => Response.json(value, { status, headers:{ "Cache-Control":"no-store" } });

/** Bounded public form; no customer database, arbitrary recipients or personal-data logs. */
export function createSupportHandler(deps: Dependencies) {
  const clock = deps.now ?? Date.now;
  const hits = new Map<string, number[]>();
  const submissions = new Map<string, { fingerprint:string; expires:number; sending:Promise<void> }>();
  let globalHits: number[] = [];

  return async function post(req: Request): Promise<Response> {
    const origin = req.headers.get("origin");
    let allowed = origin === deps.trustedOrigin;
    if (!allowed && deps.allowLocalOrigins) {
      try {
        const url = new URL(req.url); const caller = new URL(origin || ""); const local = ["localhost","127.0.0.1","[::1]"];
        allowed = local.includes(url.hostname) && local.includes(caller.hostname) && caller.protocol === url.protocol && caller.port === url.port;
      } catch { /* Invalid origin. */ }
    }
    if (!allowed) return json(403,{ ok:false,error:"origin",message:"Please reload this page and try again." });
    if (!req.headers.get("content-type")?.startsWith("application/json")) return json(415,{ ok:false,error:"content_type" });
    let raw: unknown;
    try {
      const limit = 12_000;
      if (Number(req.headers.get("content-length") || 0) > limit) return json(413,{ ok:false,error:"too_large" });
      if (!req.body) return json(400,{ ok:false,error:"invalid_request" });
      const reader = req.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
      try {
        for (;;) { const next = await reader.read(); if (next.done) break; length += next.value.length;
          if (length > limit) { await reader.cancel(); return json(413,{ ok:false,error:"too_large" }); } chunks.push(next.value); }
      } finally { reader.releaseLock(); }
      const bytes = new Uint8Array(length); let offset = 0;
      for (const part of chunks) { bytes.set(part,offset); offset += part.length; }
      raw = JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
    } catch { return json(400,{ ok:false,error:"invalid_request" }); }
    if (raw && typeof raw === "object" && "website" in raw && typeof raw.website === "string" && raw.website.trim()) return json(200,{ok:true});
    const parsed = supportSchema.safeParse(raw);
    if (!parsed.success) return json(422,{ok:false,error:"validation",message:"Check your name, email and message, then try again."});
    if (!deps.isConfigured()) return json(503,{ok:false,error:"email_unavailable",message:"Email is unavailable right now. Please contact our team on WhatsApp."});

    const now = clock();
    for (const [key,value] of submissions) if (value.expires <= now) submissions.delete(key);
    for (const [key,value] of hits) if (!value.some(time => now-time < 600_000)) hits.delete(key);
    const ip = createHash("sha256").update((req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown").slice(0,100)).digest("hex");
    const key = `${ip}:${parsed.data.submissionId}`;
    const fingerprint = createHash("sha256").update(JSON.stringify(parsed.data)).digest("hex");
    const existing = submissions.get(key);
    if (existing && existing.fingerprint !== fingerprint) return json(409,{ok:false,error:"submission_conflict",message:"Please reopen the form before sending a different message."});
    if (existing) {
      try { await existing.sending; return json(200,{ok:true}); }
      catch { return json(502,{ok:false,error:"send_failed",message:"We couldn’t send your message. Please try again or use WhatsApp."}); }
    }
    const recent = (hits.get(ip) || []).filter(time => now-time < 600_000);
    globalHits = globalHits.filter(time => now-time < 3_600_000);
    if (recent.length >= 3 || globalHits.length >= 60 || hits.size >= 5000 || submissions.size >= 1000) return json(429,{ok:false,error:"rate_limited",message:"Please wait a few minutes before sending another message."});
    hits.set(ip,[...recent,now]); globalHits.push(now);
    const sending = Promise.resolve().then(() => deps.send(buildSupportMail(parsed.data)));
    submissions.set(key,{fingerprint,expires:now+1_800_000,sending});
    try { await sending; return json(200,{ok:true}); }
    catch {
      submissions.delete(key);
      console.warn("[support] Email relay did not accept the request.");
      return json(502,{ok:false,error:"send_failed",message:"We couldn’t send your message. Please try again or use WhatsApp."});
    }
  };
}
