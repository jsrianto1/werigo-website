import puppeteer from "puppeteer-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const CHROME =
  process.env.PUPPETEER_EXECUTABLE_PATH ??
  "C:/Program Files/Google/Chrome/Application/chrome.exe";
const outDir = "C:/Users/LOQ/Documents/werigo-website/screenshots";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const results = {};
let failed = false;

async function checkViewport(width, height, name) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(() => {
    window.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (!e.hadRecentInput) window.__cls += e.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 45000 });
  await new Promise((r) => setTimeout(r, 3000));

  const r = await page.evaluate(() => {
    const video = document.querySelector("video");
    const backdrop = document.querySelector('[aria-label*="Canggu"]');
    const poster = backdrop?.querySelector("img");
    const h1 = document.querySelector("h1");
    const h1Rect = h1?.getBoundingClientRect();
    const widget = document.getElementById("hero-booking");
    const pickup = document.getElementById("pickup-location");
    const soundBtn = document.querySelector('button[aria-label*="nature sound"]');
    const sources = video
      ? [...video.querySelectorAll("source")].map((s) => s.src)
      : [];
    return {
      hasBackdrop: !!backdrop,
      backdropDecorative:
        backdrop?.getAttribute("role") === "img" &&
        !!backdrop?.getAttribute("aria-label"),
      posterRendered: !!poster && poster.getAttribute("aria-hidden") === "true",
      hasVideo: !!video,
      video: video
        ? {
            playing: !video.paused && !video.ended && video.readyState > 2,
            muted: video.muted,
            loop: video.loop,
            playsInline: video.playsInline,
            controls: video.controls,
            preload: video.preload,
            posterAttr: (video.getAttribute("poster") ?? "").includes(
              "werigo-athena-canggu-hero-poster.webp"
            ),
            hasWebm: sources.some((s) => s.includes("werigo-athena-canggu-hero.webm")),
            hasMp4: sources.some((s) => s.includes("werigo-athena-canggu-hero.mp4")),
            hasAudioTrack:
              video.mozHasAudio ||
              Boolean(video.webkitAudioDecodedByteCount) ||
              Boolean(video.audioTracks && video.audioTracks.length > 0) ||
              // Chromium fallback: the file has audio if decoded bytes grow
              video.webkitAudioDecodedByteCount !== 0,
            ariaHidden: video.getAttribute("aria-hidden") === "true",
          }
        : null,
      noAudioControl:
        !soundBtn &&
        ![...document.querySelectorAll("button")].some((b) =>
          /sound|audio|mute|volume/i.test(b.getAttribute("aria-label") ?? "")
        ),
      headlineVisible:
        !!h1Rect && h1Rect.width > 0 && h1Rect.left >= 0 && h1Rect.right <= innerWidth,
      bookingFormUsable: !!widget && !!pickup && !pickup.disabled,
      noHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth,
      cls: Math.round(window.__cls * 1000) / 1000,
    };
  });

  await page.screenshot({ path: `${outDir}/hero-${name}.png` });
  await page.close();

  r.pass =
    r.hasBackdrop &&
    r.backdropDecorative &&
    r.posterRendered &&
    r.hasVideo &&
    r.video.playing &&
    r.video.muted &&
    r.video.loop &&
    r.video.playsInline &&
    !r.video.controls &&
    r.video.preload === "metadata" &&
    r.video.posterAttr &&
    r.video.hasWebm &&
    r.video.hasMp4 &&
    r.video.ariaHidden &&
    r.noAudioControl &&
    r.headlineVisible &&
    r.bookingFormUsable &&
    r.noHorizontalOverflow &&
    r.cls < 0.1;
  if (!r.pass) failed = true;
  results[name] = r;
}

await checkViewport(375, 812, "375");
await checkViewport(768, 1024, "768");
await checkViewport(1440, 900, "1440");
await checkViewport(1920, 1080, "1920");

// Reduced motion: poster only, video never downloaded
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
  const videoRequests = [];
  page.on("request", (req) => {
    if (req.url().includes("werigo-athena-canggu-hero.mp4") ||
        req.url().includes("werigo-athena-canggu-hero.webm")) {
      videoRequests.push(req.url());
    }
  });
  await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 45000 });
  await new Promise((r) => setTimeout(r, 2000));
  const rm = await page.evaluate(() => ({
    hasVideo: !!document.querySelector("video"),
    posterRendered: !!document.querySelector('[aria-label*="Canggu"] img'),
  }));
  rm.videoNeverRequested = videoRequests.length === 0;
  rm.pass = !rm.hasVideo && rm.posterRendered && rm.videoNeverRequested;
  if (!rm.pass) failed = true;
  results.reducedMotion = rm;
  await page.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
console.log(failed ? "HERO VIDEO FAIL" : "HERO VIDEO PASS");
process.exit(failed ? 1 : 0);
