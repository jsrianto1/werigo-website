"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Award, ClipboardList, Share2, Ticket, UserRound } from "lucide-react";
import { DashboardShell } from "@/components/ui/DashboardShell";
import { T } from "@/components/i18n/LanguageProvider";
import { authClient } from "@/lib/auth-client";

const items = [
  { href: "/account", label: "Bookings", icon: ClipboardList, exact: true },
  { href: "/account/vouchers", label: "Vouchers", icon: Ticket },
  { href: "/account/membership", label: "Ride Club", icon: Award },
  { href: "/account/referral", label: "Referral", icon: Share2 },
  { href: "/account/profile", label: "Profile", icon: UserRound },
];

/**
 * Frame for the customer account pages: sidebar on desktop, drawer on
 * small screens, sitting under the site header. Each page gives its
 * own title; the person's name lives in the sidebar card.
 */
export function AccountShell({
  name,
  email,
  title,
  lede,
  children,
}: {
  name: string;
  email: string;
  title: string;
  lede?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <DashboardShell
      offsetTop
      maxWidth="max-w-3xl"
      menuLabel="Open account menu"
      brand={<span className="font-display text-base text-ink"><T>{"My account"}</T></span>}
      groups={[{ items: items.map((i) => ({ ...i, label: <T>{i.label}</T> })) }]}
      user={{ name, email, href: "/account/profile" }}
      signOutLabel={<T>{"Sign out"}</T>}
      onSignOut={() => void signOut()}
      footer={
        <Link href="/book" className="inline-flex items-center gap-1.5 px-3 hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> <T>{"Book a ride"}</T>
        </Link>
      }
    >
      <div className="mb-6">
        <p className="eyebrow"><T>{"My account"}</T></p>
        <h1 className="font-display text-3xl text-ink"><T>{title}</T></h1>
        {lede ? <p className="mt-1 text-sm text-ink-soft"><T>{lede}</T></p> : null}
      </div>
      {children}
    </DashboardShell>
  );
}
