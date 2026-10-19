import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { AppShell } from "@/components/pwa/AppShell";
import "./app.css";
import "./rental.css";
import "./mobile.css";
import "./reference.css";
import "./identity.css";
import "./guides.css";
import "./charging-feature.css";
import "./bike-selection.css";
import "leaflet/dist/leaflet.css";
const appBrandFont = Outfit({ variable: "--font-werigo", subsets: ["latin"], display: "swap" });
export const metadata: Metadata = {
  title: { default: "Werigo App · Electric Motorcycle Rental", template: "%s | Werigo App" },
  description: "Rent a Wedison motorcycle in Bali, manage your bookings and see your Werigo Ride Club rewards.",
  manifest: "/app/manifest.webmanifest", robots: { index: false, follow: true },
  icons: { apple: "/app/icon-192.png", icon: "/app/icon-192.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Werigo" },
};
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f5f8f5" }, { media: "(prefers-color-scheme: dark)", color: "#09282b" }], viewportFit: "cover" };
export default function AppLayout({ children }: { children: React.ReactNode }) { return <div className={appBrandFont.variable}><AppShell>{children}</AppShell></div>; }
