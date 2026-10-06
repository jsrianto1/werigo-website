import { Award, BadgePercent, Bell, Boxes, ClipboardList, ScrollText, Share2, UserCog, Users } from "lucide-react";

/**
 * Staff modules, in menu order. Adding an entry here puts it in the
 * admin navigation and on the dashboard; `superOnly` hides it from
 * regular admins (the API routes enforce the same rule).
 */
export interface AdminModule {
  href: string;
  label: string;
  description: string;
  icon: typeof Users;
  superOnly?: boolean;
}

export const MODULES: readonly AdminModule[] = [
  {
    href: "/admin/bookings",
    label: "Bookings",
    description: "Every booking: payment, status, notes, follow-ups, CSV export.",
    icon: ClipboardList,
  },
  {
    href: "/admin/customers",
    label: "Customers",
    description: "Who is renting: history, documents, vouchers, referral balance, notes, suspend or block.",
    icon: Users,
  },
  {
    href: "/admin/stock",
    label: "Stock",
    description: "Rentable units per model, used to stop overbooking at checkout.",
    icon: Boxes,
  },
  {
    href: "/admin/promotions",
    label: "Promotions",
    description: "Promo codes, automatic campaigns and vouchers for chosen customers.",
    icon: BadgePercent,
  },
  {
    href: "/admin/referrals",
    label: "Referrals",
    description: "Referral percentages, earnings log and payout requests.",
    icon: Share2,
  },
  { href: "/admin/membership", label: "Membership", description: "Ride Club tiers, points and audited corrections.", icon: Award },
  {
    href: "/admin/staff",
    label: "Staff",
    description: "Staff accounts, roles, temporary passwords, sign out everywhere.",
    icon: UserCog,
    superOnly: true,
  },
  {
    href: "/admin/audit",
    label: "Audit log",
    description: "Who did what, when: logins, bookings, promotions, payouts, settings.",
    icon: ScrollText,
    superOnly: true,
  },
  {
    href: "/admin/settings",
    label: "Settings",
    description: "WhatsApp notifications: recipients, switches, test message, delivery log.",
    icon: Bell,
    superOnly: true,
  },
];

export function modulesFor(role: string): AdminModule[] {
  return MODULES.filter((m) => !m.superOnly || role === "super_admin");
}
