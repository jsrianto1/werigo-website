/**
 * Cookie consent: one source of truth for the banner, Google Tag Manager
 * (Consent Mode v2), the Meta Pixel and the consent record on the server.
 *
 * Flow:
 *  1. consentBootstrapScript() runs inline in <head> before anything else.
 *     It sets Consent Mode defaults to denied and defines idempotent
 *     loaders for GTM and the Pixel. Neither tag is requested until the
 *     visitor has allowed it; a returning visitor's stored choice loads
 *     them straight away so the first PageView is not delayed.
 *  2. The visitor chooses in the banner -> saveConsent(): write the
 *     cookie, update Consent Mode, load or pause the tags, send a record
 *     to /api/consent.
 *  3. Raising CONSENT_VERSION invalidates every stored choice and the
 *     banner asks again.
 */

export const CONSENT_COOKIE = "werigo_consent";
/** Raise when the categories or the tags behind them change materially. */
export const CONSENT_VERSION = 1;
/** Visitors are asked again after six months. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 182;

export const GTM_ID = "GTM-5RC9TGR4";
export const META_PIXEL_ID = "27824990167174730";

export type ConsentChoice = { analytics: boolean; marketing: boolean };
export type ConsentAction = "accept_all" | "reject_all" | "custom";
export type StoredConsent = ConsentChoice & {
  /** Random UUID, not an identity; links a browser's changes in the record. */
  id: string;
  v: number;
  /** Epoch ms of the decision. */
  t: number;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    __werigoLoadGtm?: () => void;
    __werigoLoadPixel?: () => void;
  }
}

export function parseConsent(raw: string | undefined): StoredConsent | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(decodeURIComponent(raw)) as Partial<StoredConsent>;
    if (c.v !== CONSENT_VERSION || typeof c.id !== "string") return null;
    return { id: c.id, v: c.v, t: Number(c.t) || 0, analytics: c.analytics === true, marketing: c.marketing === true };
  } catch {
    return null;
  }
}

export function readConsent(): StoredConsent | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
    ?.slice(CONSENT_COOKIE.length + 1);
  return parseConsent(raw);
}

/** Tracking calls check this, so a revoked choice stops events even after a tag has loaded. */
export function hasConsent(category: keyof ConsentChoice): boolean {
  return readConsent()?.[category] === true;
}

function writeConsent(c: StoredConsent) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(c))}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

/** Remove first-party tag cookies (_ga, _fbp...) once permission is withdrawn. */
function deleteCookies(match: (name: string) => boolean) {
  const host = location.hostname;
  const domains = ["", host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`];
  for (const cookie of document.cookie.split("; ")) {
    const name = cookie.split("=")[0];
    if (!match(name)) continue;
    for (const d of domains) document.cookie = `${name}=; Path=/; Max-Age=0${d ? `; Domain=${d}` : ""}`;
  }
}

// ── Store for useSyncExternalStore ──

const listeners = new Set<() => void>();
let snapshot: StoredConsent | null | undefined;

export function subscribeConsent(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
export function getConsentSnapshot() {
  if (snapshot === undefined) snapshot = readConsent();
  return snapshot;
}
/** No decision is known on the server, so the banner is never in the SSR HTML. */
export function getServerConsentSnapshot(): StoredConsent | null | undefined {
  return undefined;
}

const OPEN_EVENT = "werigo-open-cookie-settings";
export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}
export function onOpenCookieSettings(cb: () => void) {
  window.addEventListener(OPEN_EVENT, cb);
  return () => window.removeEventListener(OPEN_EVENT, cb);
}

// ── Applying a choice to the tags ──

function consentModeState(c: ConsentChoice) {
  const g = (on: boolean) => (on ? "granted" : "denied");
  return {
    analytics_storage: g(c.analytics),
    ad_storage: g(c.marketing),
    ad_user_data: g(c.marketing),
    ad_personalization: g(c.marketing),
  };
}

function applyConsent(c: ConsentChoice) {
  try {
    window.gtag?.("consent", "update", consentModeState(c));
    // For GTM triggers on any future non-Google tag, which Consent Mode does not gate.
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "consent_update", consent_analytics: c.analytics, consent_marketing: c.marketing });
    if (c.analytics || c.marketing) window.__werigoLoadGtm?.();
    if (c.marketing) {
      window.__werigoLoadPixel?.();
      window.fbq?.("consent", "grant");
    } else {
      window.fbq?.("consent", "revoke");
    }
  } catch {
    /* A blocked tag must not break the banner. */
  }
}

function newId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function saveConsent(choice: ConsentChoice, action: ConsentAction, locale?: string) {
  const prev = readConsent();
  const next: StoredConsent = {
    id: prev?.id ?? newId(),
    v: CONSENT_VERSION,
    t: Date.now(),
    analytics: choice.analytics,
    marketing: choice.marketing,
  };
  writeConsent(next);

  // Permission withdrawn: clear what the tags already stored.
  if (!next.analytics) deleteCookies((n) => n === "_ga" || n.startsWith("_ga_") || n === "_gid");
  if (!next.marketing) deleteCookies((n) => n === "_fbp" || n === "_fbc" || n.startsWith("_gcl_"));

  applyConsent(next);
  snapshot = next;
  listeners.forEach((l) => l());

  // Proof of consent. Fire and forget: a failed send never blocks the visitor.
  try {
    fetch("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consentId: next.id,
        version: next.v,
        action,
        analytics: next.analytics,
        marketing: next.marketing,
        locale,
        path: location.pathname.slice(0, 300),
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

/**
 * Inline <head> script, run while the HTML is parsed and before hydration.
 * Defaults every Consent Mode signal to denied, defines the tag loaders and
 * loads only the tags a valid stored choice allows. With no choice nothing
 * is requested from Google or Meta.
 */
export function consentBootstrapScript() {
  return `(function(w,d){w.dataLayer=w.dataLayer||[];function gtag(){w.dataLayer.push(arguments);}w.gtag=gtag;
var c=null;try{var m=d.cookie.match(/(?:^|; )${CONSENT_COOKIE}=([^;]*)/);if(m){var p=JSON.parse(decodeURIComponent(m[1]));if(p&&p.v===${CONSENT_VERSION})c=p;}}catch(e){}
var a=!!(c&&c.analytics===true),k=!!(c&&c.marketing===true),g=function(on){return on?'granted':'denied';};
gtag('consent','default',{analytics_storage:g(a),ad_storage:g(k),ad_user_data:g(k),ad_personalization:g(k),wait_for_update:500});
gtag('set','ads_data_redaction',true);gtag('set','url_passthrough',false);
w.__werigoLoadGtm=function(){if(w.__werigoGtm)return;w.__werigoGtm=1;
w.dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var j=d.createElement('script');j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id=${GTM_ID}';d.head.appendChild(j);};
w.__werigoLoadPixel=function(){if(w.__werigoPixel)return;w.__werigoPixel=1;
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(w,d,'script','https://connect.facebook.net/en_US/fbevents.js');
w.fbq('init','${META_PIXEL_ID}');w.fbq('track','PageView');};
if(a||k)w.__werigoLoadGtm();if(k)w.__werigoLoadPixel();})(window,document);`;
}
