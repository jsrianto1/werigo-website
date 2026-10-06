import { Boxes, ClipboardList } from "lucide-react";

/**
 * Staff modules, in menu order. Adding an entry here puts it in the
 * admin navigation and on the dashboard.
 */
export const MODULES = [
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
] as const;
