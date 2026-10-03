/** Only same-site paths may be used as a post-login destination. */
export function safeNext(next: string | undefined | null, fallback: string): string {
  return next && /^\/(?!\/)/.test(next) ? next : fallback;
}
