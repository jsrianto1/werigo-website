"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Download, X } from "lucide-react";

type Device = "android" | "iphone";

export function InstallGuide({ onClose, onInstall }: {
  onClose: () => void;
  onInstall?: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [device, setDevice] = useState<Device>("android");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const appleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    // Device preference comes from the browser after hydration.
    setDevice(appleMobile ? "iphone" : "android");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      document.querySelector<HTMLButtonElement>(".ra-install")?.focus();
    };
  }, []);

  const steps = device === "iphone" ? [
    <>Open this page in <b>Safari</b>, then tap <b>Share</b>.</>,
    <>Choose <b>Add to Home Screen</b>. Enable <b>Open as Web App</b> if shown.</>,
    <>Tap <b>Add</b>, then open <b>Werigo</b> from your home screen.</>,
  ] : [
    <>Open this page in <b>Chrome</b>, then tap the <b>⋮ menu</b>.</>,
    <>Choose <b>Add to home screen</b> → <b>Install</b>. Some versions show <b>Install app</b> directly.</>,
    <>Open <b>Werigo</b> from your home screen.</>,
  ];

  return <dialog ref={dialogRef} className="wr-install-dialog" id="app-install-help"
    aria-labelledby="wr-install-title" onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="wr-install-sheet">
      <button type="button" className="wr-install-close" aria-label="Close installation instructions" onClick={onClose} autoFocus><X size={20} /></button>
      <Image src="/app/icon-192.png" width={56} height={56} alt="" className="wr-install-icon" loading="eager" unoptimized />
      <p className="wr-install-eyebrow">WERIGO APP</p>
      <h2 id="wr-install-title">Your Bali.<br />One tap away.</h2>
      <p className="wr-install-intro">Add Werigo to your home screen. Your first ride starts with log in or sign up.</p>
      {onInstall && device === "android" && <button type="button" className="wr-install-native" onClick={onInstall}><Download size={18} />Install Werigo</button>}
      <div className="wr-install-devices" aria-label="Your phone">
        <button type="button" aria-pressed={device === "android"} onClick={() => setDevice("android")}>Android</button>
        <button type="button" aria-pressed={device === "iphone"} onClick={() => setDevice("iphone")}>iPhone</button>
      </div>
      <ol className="wr-install-steps">{steps.map((step, index) => <li key={`${device}-${index}`}><span aria-hidden="true">{index + 1}</span><p>{step}</p></li>)}</ol>
      <p className="wr-install-note">Coming from WhatsApp or Instagram? Open this page in {device === "iphone" ? "Safari" : "Chrome"} first.</p>
      <p className="wr-install-footnote">Already signed in? You’ll go straight to your app. Bookings, payments and account services need internet.</p>
    </section>
  </dialog>;
}
