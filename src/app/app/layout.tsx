import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/pwa/AppShell";
import "./app.css";
import "./rental.css";
import "./mobile.css";
import "./reference.css";
import "./identity.css";
import "./guides.css";
import "./charging-feature.css";
import "./bike-selection.css";
import "./electric-island.css";
import "leaflet/dist/leaflet.css";
export const metadata: Metadata = {
  title: { default: "Werigo App · Electric Motorcycle Rental", template: "%s | Werigo App" },
  description: "Rent a Wedison motorcycle in Bali, manage your bookings and see your Werigo Ride Club rewards.",
  manifest: "/app/manifest.webmanifest", robots: { index: false, follow: true },
  icons: { apple: "/app/icon-192.png", icon: "/app/icon-192.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Werigo" },
};
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f5f1eb" }, { media: "(prefers-color-scheme: dark)", color: "#103c3b" }], viewportFit: "cover" };
export default function AppLayout({ children }: { children: React.ReactNode }) { return <div className="werigo-app-root"><AppShell>{children}</AppShell></div>; }
