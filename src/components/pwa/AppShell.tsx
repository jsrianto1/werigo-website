"use client";
import { AppBrand } from "./AppBrand";
import { InstallGuide } from "./InstallGuide";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { House, CalendarDays, Compass, KeyRound, UserRound, Download, ArrowUpRight, ArrowLeft } from "lucide-react";

type InstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{outcome: string}> };
function subscribeOnline(callback: () => void) { window.addEventListener("online", callback); window.addEventListener("offline", callback); return () => { window.removeEventListener("online", callback); window.removeEventListener("offline", callback); }; }
const onlineSnapshot = () => navigator.onLine;
const serverOnlineSnapshot = () => true;
function subscribeStandalone(callback: () => void) { const media = window.matchMedia("(display-mode: standalone)"); media.addEventListener("change", callback); window.addEventListener("appinstalled", callback); return () => { media.removeEventListener("change", callback); window.removeEventListener("appinstalled", callback); }; }
const standaloneSnapshot = () => window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
const serverStandaloneSnapshot = () => false;
const navigation = [
  { href: "/app/rent", label: "Home", icon: House },
  { href: "/app/activity", label: "Bookings", icon: CalendarDays },
  { href: "/app/rent?start=1", label: "RENT", icon: KeyRound },
  { href: "/app/explore", label: "What to do?", icon: Compass },
  { href: "/app/account", label: "Account", icon: UserRound },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = pathname === "/app/login";
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [help, setHelp] = useState(false);
  const [message, setMessage] = useState("");
  const online = useSyncExternalStore(subscribeOnline, onlineSnapshot, serverOnlineSnapshot);
  const standalone = useSyncExternalStore(subscribeStandalone, standaloneSnapshot, serverStandaloneSnapshot);
  useEffect(() => {
    // The public website explicitly links here to show installation guidance.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!standaloneSnapshot() && new URLSearchParams(window.location.search).get("install") === "1") setHelp(true);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/app/sw.js", { scope: "/app/" }).catch(() => {});
    const onInstall = (event: Event) => { event.preventDefault(); setInstall(event as InstallEvent); };
    const onInstalled = () => { setInstall(null); setHelp(false); setMessage("Werigo is on your home screen."); };
    window.addEventListener("beforeinstallprompt", onInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onInstall); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  async function addToHome() {
    if (!install) { setHelp(value => !value); return; }
    try {
      await install.prompt();
      const choice = await install.userChoice;
      setInstall(null);
      setHelp(choice.outcome !== "accepted");
    } catch { setInstall(null); setHelp(true); }
  }
  return <div className={`ride-app${isAuth ? " wr-auth-shell" : ""}`}>
    <header className="ra-header">{isAuth ? <Link href="/" className="wr-auth-back"><ArrowLeft size={18} /><span>Website</span></Link> : <Link href="/app/rent" aria-label="Werigo app home" className="wr-brand"><AppBrand /></Link>}
      <div className="ra-header-actions"><span className="ra-location">Bali, Indonesia</span>{!standalone && <button onClick={() => void addToHome()} className="ra-install" aria-expanded={help} aria-controls="app-install-help"><Download size={16} /><span>Install app</span></button>}<Link href="/" className="ra-website" aria-label="Visit Werigo website"><ArrowUpRight size={20}/></Link></div>
    </header>
    {help && !standalone && <InstallGuide onClose={() => setHelp(false)} onInstall={install ? () => void addToHome() : undefined} />}
    {message && <p role="status" className="ra-install-help">{message}</p>}
    {!online && <p role="status" className="ra-install-help">You’re offline. Reconnect before opening another guide, checking bookings or using rewards. No booking or payment is sent while offline.</p>}
    <div className="ra-content">{children}</div>
    {!isAuth && <nav className="ra-nav" aria-label="Werigo app"><div>{navigation.map(item => {
      const active = item.label === "RENT" ? false : item.href === "/app/rent" ? /^\/app\/(rent|charge)(\/|$)/.test(pathname) : item.href === "/app/explore" ? /^\/app\/(explore|places)(\/|$)/.test(pathname) : item.href === "/app/account" ? /^\/app\/(account|profile|rewards)(\/|$)/.test(pathname) : pathname.startsWith(item.href);
      return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`${active ? "is-active" : ""}${item.label === "RENT" ? " wr-nav-rent" : ""}`}><item.icon size={23}/><span>{item.label}</span></Link>;
    })}</div></nav>}
  </div>;
}
