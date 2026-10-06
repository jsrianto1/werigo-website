"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { T } from "@/components/i18n/LanguageProvider";
import { authClient } from "@/lib/auth-client";

/**
 * Header entry: "Sign in" for visitors, the first name for customers.
 * Reads the session client-side so the header can stay static.
 */
export function AccountMenu({ className = "" }: { className?: string }) {
  const { data, isPending } = authClient.useSession();
  const user = data?.user as ({ name: string; email: string; role?: string | null } | undefined);
  const staff = user?.role === "admin" || user?.role === "super_admin";
  const label = user ? (staff ? "Admin" : user.name.split(" ")[0] || user.email) : null;
  return (
    <Link
      href={user ? (staff ? "/admin" : "/account") : "/account/login"}
      aria-label={user ? `Account: ${user.name}` : undefined}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink ${isPending ? "invisible" : ""} ${className}`}
    >
      <UserRound className="h-4 w-4" aria-hidden="true" />
      <span className="max-w-[9rem] truncate">{label ?? <T>{"Sign in"}</T>}</span>
    </Link>
  );
}
