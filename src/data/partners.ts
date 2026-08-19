import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Handshake,
  MapPinned,
  MessageCircle,
  Percent,
  Send,
  Ticket,
  Users,
} from "lucide-react";

/**
 * Werigo Partner Program.
 *
 * Confirmed by management (2026-07-26, referral commission for hotel,
 * villa and rental company partners): partners refer guests to Werigo
 * and earn a 10% commission on every completed rental. There is no
 * partner portal or online checkout yet, so the mechanism matches how
 * the rest of the site already works: WhatsApp for the application,
 * and a personal referral code carried through the booking flow's
 * existing promo code field so the team can attribute the rental.
 *
 * Do not add payout schedules, minimum thresholds or contract terms
 * here. Those are confirmed directly with each partner on WhatsApp,
 * the same way deposits and cancellation terms are handled elsewhere
 * on the site.
 */

export const partnerCommissionRate = "10%";

export interface PartnerType {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const partnerTypes: PartnerType[] = [
  {
    id: "hotels-villas",
    label: "Hotels and villas",
    description:
      "Give guests an easy way to explore Bali and earn from every ride you refer.",
    icon: Building2,
  },
  {
    id: "guesthouses",
    label: "Guesthouses and homestays",
    description:
      "The same personal recommendation you already give guests, now with a commission attached.",
    icon: Users,
  },
  {
    id: "tour-operators",
    label: "Tour operators and travel agents",
    description:
      "Add electric motorcycle rental to the itineraries and packages you already sell.",
    icon: MapPinned,
  },
];

export interface PartnerStep {
  title: string;
  text: string;
  icon: LucideIcon;
}

export const partnerSteps: PartnerStep[] = [
  {
    title: "Apply on WhatsApp",
    text: "Tell us about your property or business. We confirm the details and set you up with a personal referral code.",
    icon: Send,
  },
  {
    title: "Refer your guests",
    text: "Share your code or your personal booking link whenever a guest wants to rent an electric motorcycle.",
    icon: Handshake,
  },
  {
    title: "Werigo handles the rest",
    text: "We confirm the booking, deliver the motorcycle and support the guest for the whole rental, the same way we do for every ride.",
    icon: MessageCircle,
  },
  {
    title: "You earn a commission",
    text: `Your code is attached to the booking, so every completed rental earns you a ${partnerCommissionRate} commission.`,
    icon: Percent,
  },
];

export interface PartnerBenefit {
  title: string;
  text: string;
  icon: LucideIcon;
}

export const partnerBenefits: PartnerBenefit[] = [
  {
    title: `${partnerCommissionRate} commission per rental`,
    text: "Earn a commission on every completed rental you refer. No purchase, no lease and no inventory on your side.",
    icon: Percent,
  },
  {
    title: "A personal referral code",
    text: "Your code travels with every booking your guests make, so your commission is easy to track and confirm.",
    icon: Ticket,
  },
  {
    title: "A guest amenity, sorted",
    text: "Offer electric motorcycle rental without owning a fleet, charging it or maintaining it yourself.",
    icon: Handshake,
  },
];
