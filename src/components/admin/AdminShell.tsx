"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { modulesFor } from "@/components/admin/modules";
import { authClient } from "@/lib/auth-client";

/**
 * Frame for every staff page: module navigation, who is signed in,
 * sign out. Modules come from ./modules.
 */
export function AdminShell({
  adminEmail,
  adminRole,
  mustChangePassword = false,
  children,
}: {
  adminEmail: string;
  adminRole: string;
  /** Temporary password still in use: only the profile page is allowed. */
  mustChangePassword?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }, ...modulesFor(adminRole)];
  const locked = mustChangePassword && pathname !== "/admin/profile";

  useEffect(() => {
    if (locked) router.replace("/admin/profile?change=1");
  }, [locked, router]);

  async function signOut() {
    await authClient.signOut();
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="min-h-[70vh] bg-page">
      <div className="border-b border-line bg-card">
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8 xl:px-10">
          <nav aria-label="Admin" className="-mx-1 flex items-center gap-1 overflow-x-auto">
            {nav.map((item) => {
              const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-[10px] px-3 text-sm font-semibold transition-colors ${
                    active ? "bg-primary-faint text-primary" : "text-ink-soft hover:bg-sunken hover:text-ink"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/admin/profile"
              aria-current={pathname === "/admin/profile" ? "page" : undefined}
              className={`inline-flex min-h-10 items-center gap-2 rounded-[10px] px-3 font-semibold transition-colors ${
                pathname === "/admin/profile" ? "bg-primary-faint text-primary" : "text-ink-soft hover:bg-sunken hover:text-ink"
              }`}
            >
              <UserRound className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{adminEmail}</span>
              <span className="rounded-full bg-sunken px-2 py-0.5 text-xs font-medium text-ink-soft">
                {adminRole === "super_admin" ? "Super admin" : "Admin"}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-[10px] px-3 font-semibold text-ink-soft transition-colors hover:bg-sunken hover:text-ink"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </div>
      {locked ? (
        <p className="mx-auto max-w-[1400px] px-4 py-10 text-sm text-ink-soft">Please set your own password first…</p>
      ) : (
        children
      )}
    </div>
  );
}
