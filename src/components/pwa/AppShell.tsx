"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Compass, Bike, Zap, Gift, UserRound, Download, ArrowUpRight } from "lucide-react";

type InstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{outcome: string}> };
function subscribeOnline(callback: () => void) { window.addEventListener("online", callback); window.addEventListener("offline", callback); return () => { window.removeEventListener("online", callback); window.removeEventListener("offline", callback); }; }
const onlineSnapshot = () => navigator.onLine;
const serverOnlineSnapshot = () => true;
const navigation = [
  { href: "/app/explore", label: "Explore", icon: Compass }, { href: "/app/rent", label: "Rent", icon: Bike },
  { href: "/app/charge", label: "Charge", icon: Zap }, { href: "/app/rewards", label: "Rewards", icon: Gift },
  { href: "/app/account", label: "Account", icon: UserRound },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [help, setHelp] = useState(false);
  const [message, setMessage] = useState("");
  const online = useSyncExternalStore(subscribeOnline, onlineSnapshot, serverOnlineSnapshot);
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/app/sw.js", { scope: "/app/" }).catch(() => {});
    const onInstall = (event: Event) => { event.preventDefault(); setInstall(event as InstallEvent); };
    const onInstalled = () => { setInstall(null); setMessage("Werigo is on your home screen."); };
    window.addEventListener("beforeinstallprompt", onInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onInstall); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  async function addToHome() {
    if (!install) { setHelp(value => !value); return; }
    try { await install.prompt(); await install.userChoice; setInstall(null); }
    catch { setMessage("Use your browser menu to add Werigo to your home screen."); }
  }
  return <div className="ride-app">
    <header className="ra-header"><Link href="/app/explore" aria-label="Werigo app home"><Image src="/brand/werigo-logo-compact.png" width={126} height={50} alt="Werigo" className="ra-logo" /></Link>
      <div className="ra-header-actions"><span className="ra-location">Bali, Indonesia</span><button onClick={() => void addToHome()} className="ra-install"><Download size={16} /><span>Get the app</span></button><Link href="/" className="ra-website" aria-label="Visit Werigo website"><ArrowUpRight size={20}/></Link></div>
    </header>
    {help && <aside className="ra-install-help"><strong>Keep Bali in your pocket.</strong> On iPhone, open this page in Safari, tap Share, then Add to Home Screen. On Android, use Install app or Add to Home screen in your browser menu. Installation requires a supported browser and a secure connection.<button onClick={() => setHelp(false)}>Close</button></aside>}
    {message && <p role="status" className="ra-install-help">{message}</p>}
    {!online && <p role="status" className="ra-install-help">You’re offline. Reconnect before opening another guide, checking bookings or using rewards. No booking or payment is sent while offline.</p>}
    <div className="ra-content">{children}</div>
    <nav className="ra-nav" aria-label="Werigo app"><div>{navigation.map(item => {
      const active = item.href === "/app/explore" ? pathname === item.href || pathname.startsWith("/app/places/") : pathname.startsWith(item.href);
      return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={active ? "is-active" : ""}><item.icon size={23}/><span>{item.label}</span></Link>;
    })}</div></nav>
  </div>;
}
