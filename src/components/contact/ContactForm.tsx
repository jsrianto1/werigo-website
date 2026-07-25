"use client";

import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { buildSupportWhatsAppUrl } from "@/lib/whatsapp";

/**
 * Contact form — prototype behaviour opens WhatsApp with the message.
 * Swap the submit handler for an API route when the email system exists.
 */
export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; message?: string }>({});
  const [sent, setSent] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Enter your name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      next.email = "Enter a valid email address.";
    if (message.trim().length < 10)
      next.message = "Tell us a little more — at least 10 characters.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const text = `Hi Werigo! I'm ${name} (${email}).\n\n${message}`;
    window.open(buildSupportWhatsAppUrl(text), "_blank", "noopener");
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[14px] border border-line bg-card p-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-ok" aria-hidden="true" />
        <h2 className="mt-4 font-display text-2xl text-ink">Message on its way</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
          We opened WhatsApp with your message — hit send there and the team
          will get back to you during riding hours.
        </p>
        <Button variant="ghost" className="mt-6" onClick={() => setSent(false)}>
          Write another message
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="rounded-[14px] border border-line bg-card p-6"
      aria-label="Contact form"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-ink">
            Name<span aria-hidden="true" className="text-danger"> *</span>
          </label>
          <input
            id="contact-name"
            type="text"
            autoComplete="name"
            required
            value={name}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "contact-name-error" : undefined}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            className={`min-h-11 w-full rounded-[10px] border bg-card px-3 text-[15px] text-ink ${
              errors.name ? "border-danger" : "border-line-strong"
            }`}
          />
          {errors.name ? (
            <p id="contact-name-error" role="alert" className="mt-1.5 text-xs font-medium text-danger">
              {errors.name}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-ink">
            Email<span aria-hidden="true" className="text-danger"> *</span>
          </label>
          <input
            id="contact-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "contact-email-error" : undefined}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            className={`min-h-11 w-full rounded-[10px] border bg-card px-3 text-[15px] text-ink ${
              errors.email ? "border-danger" : "border-line-strong"
            }`}
          />
          {errors.email ? (
            <p id="contact-email-error" role="alert" className="mt-1.5 text-xs font-medium text-danger">
              {errors.email}
            </p>
          ) : null}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-ink">
            Message<span aria-hidden="true" className="text-danger"> *</span>
          </label>
          <textarea
            id="contact-message"
            rows={5}
            required
            value={message}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? "contact-message-error" : undefined}
            onChange={(e) => {
              setMessage(e.target.value);
              setErrors((prev) => ({ ...prev, message: undefined }));
            }}
            placeholder="Booking dates, custom delivery, partnerships — anything."
            className={`w-full rounded-[10px] border bg-card px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-faint ${
              errors.message ? "border-danger" : "border-line-strong"
            }`}
          />
          {errors.message ? (
            <p id="contact-message-error" role="alert" className="mt-1.5 text-xs font-medium text-danger">
              {errors.message}
            </p>
          ) : null}
        </div>
      </div>
      <Button type="submit" variant="accent" size="lg" className="mt-6">
        <Send className="h-4 w-4" aria-hidden="true" />
        Send via WhatsApp
      </Button>
      <p className="mt-3 text-xs leading-relaxed text-ink-faint">
        The form opens WhatsApp with your message pre-filled — you stay in
        control of what&apos;s sent. Direct email delivery arrives with our launch.
      </p>
    </form>
  );
}
