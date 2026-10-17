import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/pwa/AppShell";
import "./app.css";
export const metadata: Metadata = {
  title: { default: "Werigo App · Ride & Explore Bali", template: "%s | Werigo App" },
  description: "Your Bali riding companion. Explore area guides, rent a Wedison motorcycle and see your Werigo Ride Club rewards.",
  manifest: "/app/manifest.webmanifest", robots: { index: false, follow: true },
  icons: { apple: "/app/icon-192.png", icon: "/app/icon-192.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Werigo" },
};
export const viewport: Viewport = { themeColor: "#007565" };
export default function AppLayout({ children }: { children: React.ReactNode }) { return <AppShell>{children}</AppShell>; }
