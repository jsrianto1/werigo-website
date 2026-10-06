import { BadgePercent, Boxes, ClipboardList, Share2, Award } from "lucide-react";

/**
 * Staff modules, in menu order. Adding an entry here puts it in the
 * admin navigation and on the dashboard.
 */
export const MODULES = [
  { href: "/admin/membership", label: "Membership", description: "Ride Club tiers, points and audited corrections.", icon: Award },
  {
    href: "/admin/bookings",
    label: "Bookings",
    description: "Every booking: payment, status, notes, follow-ups, CSV export.",
    icon: ClipboardList,
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
] as const;
