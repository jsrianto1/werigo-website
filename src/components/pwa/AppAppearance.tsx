"use client";

import { useSyncExternalStore } from "react";
import { Moon } from "lucide-react";
type Theme = "system" | "light" | "dark";
const themeEvent = "werigo-app-appearance";
function themeSnapshot(): Theme { try { const value = localStorage.getItem("werigo_app_theme"); return value === "light" || value === "dark" ? value : "system"; } catch { return "system"; } }
const serverTheme = (): Theme => "system";
function subscribeTheme(callback: () => void) { window.addEventListener("storage", callback); window.addEventListener(themeEvent, callback); return () => { window.removeEventListener("storage", callback); window.removeEventListener(themeEvent, callback); }; }
function subscribeScheme(callback: () => void) { const media = window.matchMedia("(prefers-color-scheme: dark)"); media.addEventListener("change", callback); return () => media.removeEventListener("change", callback); }
const darkSnapshot = () => window.matchMedia("(prefers-color-scheme: dark)").matches;
const serverDark = () => false;
export function useAppAppearance() {
  const theme = useSyncExternalStore(subscribeTheme, themeSnapshot, serverTheme);
  const systemDark = useSyncExternalStore(subscribeScheme, darkSnapshot, serverDark);
  return { theme, effectiveTheme: theme === "system" ? systemDark ? "dark" : "light" : theme };
}
export function AppAppearance() {
  const { theme } = useAppAppearance();
  return <label className="wr-account-appearance"><Moon size={23} /><span>Appearance</span><select aria-label="App appearance" value={theme} onChange={event => { try { localStorage.setItem("werigo_app_theme", event.target.value); } catch {} window.dispatchEvent(new Event(themeEvent)); }}><option value="system">Device</option><option value="light">Light</option><option value="dark">Dark</option></select></label>;
}
