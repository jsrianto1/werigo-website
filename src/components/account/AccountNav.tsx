"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { T } from "@/components/i18n/LanguageProvider";
import { authClient } from "@/lib/auth-client";

const tabs = [
  { href: "/account", label: "Bookings" },
  { href: "/account/profile", label: "Profile" },
];

export function AccountNav({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
      <div>
        <p className="eyebrow"><T>{"My account"}</T></p>
        <h1 className="font-display text-3xl text-ink">{name}</h1>
      </div>
      <nav aria-label="Account" className="flex items-center gap-1">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-primary-faint text-primary" : "text-ink-soft hover:text-ink"}`}
            >
              <T>{t.label}</T>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => void signOut()}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <T>{"Sign out"}</T>
        </button>
      </nav>
    </div>
  );
}
