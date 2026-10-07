"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { DashboardShell, type NavGroup } from "@/components/ui/DashboardShell";
import { MODULE_GROUPS, modulesFor } from "@/components/admin/modules";
import { authClient } from "@/lib/auth-client";

/**
 * Frame for every staff page: sidebar navigation (drawer on small
 * screens), who is signed in, sign out. Modules come from ./modules.
 */
export function AdminShell({
  adminEmail,
  adminName,
  adminRole,
  mustChangePassword = false,
  children,
}: {
  adminEmail: string;
  adminName?: string;
  adminRole: string;
  /** Temporary password still in use: only the profile page is allowed. */
  mustChangePassword?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const locked = mustChangePassword && pathname !== "/admin/profile";

  useEffect(() => {
    if (locked) router.replace("/admin/profile?change=1");
  }, [locked, router]);

  async function signOut() {
    await authClient.signOut();
    router.push("/admin");
    router.refresh();
  }

  const modules = modulesFor(adminRole);
  const groups: NavGroup[] = [
    { items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }] },
    ...MODULE_GROUPS.map((g) => ({ label: g, items: modules.filter((m) => m.group === g) })).filter((g) => g.items.length > 0),
  ];

  return (
    <DashboardShell
      brand={
        <Link href="/admin" className="flex items-center gap-2.5" aria-label="Werigo admin home">
          <Image src="/brand/werigo-logo-compact.png" alt="" width={1217} height={482} className="h-7 w-auto" sizes="72px" />
          <span className="rounded-full bg-sunken px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Admin</span>
        </Link>
      }
      groups={groups}
      user={{
        name: adminName || adminEmail,
        email: adminEmail,
        badge: adminRole === "super_admin" ? "Super admin" : "Admin",
        href: "/admin/profile",
      }}
      onSignOut={() => void signOut()}
      footer={
        <Link href="/" className="inline-flex items-center gap-1.5 px-3 hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back to werigo.co
        </Link>
      }
    >
      {locked ? <p className="text-sm text-ink-soft">Please set your own password first…</p> : children}
    </DashboardShell>
  );
}
