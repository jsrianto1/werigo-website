"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";

export interface NavItem {
  href: string;
  label: ReactNode;
  icon: typeof Menu;
  /** Match the path exactly (for index routes such as /admin). */
  exact?: boolean;
}

export interface NavGroup {
  label?: ReactNode;
  items: NavItem[];
}

export interface ShellUser {
  name: string;
  email: string;
  /** Small tag under the name, e.g. the role. */
  badge?: ReactNode;
  /** Where the user card links to (profile page). */
  href: string;
}

/**
 * Application frame shared by the staff dashboard and the customer
 * account: a fixed sidebar on desktop (navigation, who is signed in,
 * sign out) and a top bar with a menu button on smaller screens that
 * opens the same navigation as a drawer.
 *
 * `offsetTop` keeps the sidebar and bar below the sticky site header
 * (customer account); the staff dashboard has no site header.
 */
export function DashboardShell({
  brand,
  groups,
  user,
  signOutLabel = "Sign out",
  onSignOut,
  offsetTop = false,
  footer,
  maxWidth = "max-w-[1200px]",
  menuLabel = "Open menu",
  children,
}: {
  brand: ReactNode;
  groups: NavGroup[];
  user: ShellUser;
  signOutLabel?: ReactNode;
  onSignOut: () => void;
  offsetTop?: boolean;
  /** Small links under the navigation, e.g. back to the website. */
  footer?: ReactNode;
  maxWidth?: string;
  /** Accessible name of the menu button; distinct from the site header's own menu where both exist. */
  menuLabel?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  // Route change closes the drawer (state-adjust-during-render pattern).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  const isActive = (item: NavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));

  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  const nav = (
    <nav aria-label="Dashboard" className="flex-1 overflow-y-auto px-3 py-2">
      {groups.map((g, gi) => (
        <div key={gi} className={gi > 0 ? "mt-5" : ""}>
          {g.label ? <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{g.label}</p> : null}
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-10 items-center gap-3 rounded-[10px] px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                      active ? "bg-primary-faint text-primary" : "text-ink-soft hover:bg-sunken hover:text-ink"
                    }`}
                  >
                    <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-primary" : "text-ink-faint"}`} aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {footer ? <div className="mt-6 border-t border-line pt-4 text-xs text-ink-faint">{footer}</div> : null}
    </nav>
  );

  const userCard = (
    <div className="border-t border-line p-3">
      <Link
        href={user.href}
        aria-current={pathname === user.href ? "page" : undefined}
        className={`flex items-center gap-3 rounded-[10px] px-2 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          pathname === user.href ? "bg-primary-faint" : "hover:bg-sunken"
        }`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white" aria-hidden="true">
          {initials || "?"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{user.name}</span>
          <span className="block truncate text-xs text-ink-faint">{user.badge ?? user.email}</span>
        </span>
      </Link>
      <button
        type="button"
        onClick={onSignOut}
        className="mt-1 flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-[10px] px-3 text-sm font-medium text-ink-soft transition-colors hover:bg-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <LogOut className="h-[18px] w-[18px] text-ink-faint" aria-hidden="true" />
        {signOutLabel}
      </button>
    </div>
  );

  const sidebarTop = offsetTop ? "top-20 h-[calc(100dvh-5rem)]" : "top-0 h-dvh";
  const barTop = offsetTop ? "top-20" : "top-0";

  return (
    <div className={`bg-sunken lg:flex ${offsetTop ? "min-h-[calc(100dvh-5rem)]" : "min-h-dvh"}`}>
      <aside className={`sticky hidden w-64 shrink-0 flex-col border-r border-line bg-card lg:flex ${sidebarTop}`}>
        <div className="flex h-16 items-center border-b border-line px-5">{brand}</div>
        {nav}
        {userCard}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className={`sticky z-40 flex h-14 items-center gap-3 border-b border-line bg-card/95 px-4 backdrop-blur-sm lg:hidden ${barTop}`}>
          <button
            ref={menuButton}
            type="button"
            onClick={() => setOpen(true)}
            aria-label={menuLabel}
            aria-haspopup="dialog"
            aria-expanded={open}
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] text-ink-soft transition-colors hover:bg-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">{brand}</div>
          <Link href={user.href} aria-label={`Profile: ${user.name}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
            {initials || "?"}
          </Link>
        </header>

        <main className="flex-1">
          <div className={`mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 ${maxWidth}`}>{children}</div>
        </main>
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} returnFocusRef={menuButton}>
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          {brand}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            data-autofocus
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] text-ink-soft hover:bg-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {nav}
        {userCard}
      </Drawer>
    </div>
  );
}

/** Off-canvas panel for the navigation on small screens: portal to body, scroll lock, focus trap, Escape closes. */
function Drawer({ open, onClose, returnFocusRef, children }: { open: boolean; onClose: () => void; returnFocusRef: React.RefObject<HTMLButtonElement | null>; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const returnTo = returnFocusRef.current;
    panel.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const focusable = panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKeyDown);
      returnTo?.focus();
    };
  }, [open, onClose, returnFocusRef]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] lg:hidden">
      <button type="button" aria-label="Close menu" onClick={onClose} className="absolute inset-0 cursor-default bg-deep/50" />
      <div ref={panel} role="dialog" aria-modal="true" aria-label="Menu" className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col bg-card shadow-xl">
        {children}
      </div>
    </div>,
    document.body,
  );
}
