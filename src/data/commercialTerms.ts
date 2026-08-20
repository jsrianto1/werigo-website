import type { LucideIcon } from "lucide-react";
import {
  BatteryCharging,
  CloudRain,
  HardHat,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Truck,
  Umbrella,
} from "lucide-react";

/**
 * Central commercial configuration for the rental offer.
 *
 * Approved IDR pricing lives in src/lib/pricing.ts (single source of
 * truth for rates, tiers, minimum rental, and the EdPower age rule).
 * This file holds the approved inclusions, request-only add-on
 * presentation, and policy placeholders. Components read this file
 * and hide anything unapproved; changing an inclusion or activating
 * a policy later is an edit here only.
 */

/* ================= Approved standard inclusions ================= */

export interface RentalBenefit {
  id: string;
  label: string;
  /** Longer form used on section cards. */
  description: string;
  icon: LucideIcon;
  /** Chips and cards render ONLY when operationally confirmed. */
  confirmed: boolean;
  /** Show in the compact chip row on vehicle cards. */
  chip: boolean;
}

/**
 * Every rental includes exactly two sanitised helmets and one
 * premium phone holder already installed. Do not add unverified
 * items (hairnets, raincoats, insurance, roadside or 24-hour
 * assistance) without management confirmation.
 */
export const rentalBenefits: RentalBenefit[] = [
  {
    id: "helmets",
    label: "2 sanitised helmets",
    description: "Two sanitised helmets come with every motorcycle.",
    icon: HardHat,
    confirmed: true,
    chip: true,
  },
  {
    id: "phone-holder",
    label: "Installed phone holder",
    description:
      "One premium phone holder, already installed on the motorcycle.",
    icon: Smartphone,
    confirmed: true,
    chip: true,
  },
  {
    id: "charged",
    label: "Delivered with at least 80% battery",
    description: "Your motorcycle arrives with at least 80% battery, ready to ride.",
    icon: BatteryCharging,
    confirmed: true,
    chip: true,
  },
  {
    id: "handover-briefing",
    label: "Riding and charging briefing",
    description: "A quick, practical briefing before you ride off.",
    icon: MapPin,
    confirmed: true,
    chip: false,
  },
  {
    id: "delivery",
    label: "Hotel or villa delivery by arrangement",
    description: "We bring the motorcycle to where you're staying.",
    icon: Truck,
    confirmed: true,
    chip: false,
  },
  {
    id: "whatsapp-support",
    label: "WhatsApp support in operating hours",
    description: "Local WhatsApp support during operating hours.",
    icon: MessageCircle,
    confirmed: true,
    chip: false,
  },
  {
    id: "official",
    label: "Official Wedison motorcycle",
    description: "Every ride is an official Wedison, maintained in-house.",
    icon: ShieldCheck,
    confirmed: true,
    chip: false,
  },
];

export const confirmedBenefits = rentalBenefits.filter((b) => b.confirmed);
export const chipBenefits = confirmedBenefits.filter((b) => b.chip);

/**
 * Request-only add-ons shown in the benefits section. These are not
 * included and carry no public price; wording must stay qualified.
 */
export const requestOnlyBenefits: { id: string; label: string; description: string; icon: LucideIcon }[] = [
  {
    id: "rain-poncho",
    label: "Rain poncho on request",
    description:
      "Available as an optional request. Availability and price confirmed on WhatsApp.",
    icon: CloudRain,
  },
  {
    id: "protection",
    label: "Optional protection at checkout",
    description:
      "Cancellation and Motorcycle Protection can be added to your request. Conditions confirmed before you approve your quote.",
    icon: Umbrella,
  },
];

/* ================= Card payment fee: none shown ================= */

/**
 * Decision 2026-08-19 after competitor research: no card fee is shown
 * to customers, matching every professional Bali rental site checked
 * (Cinchy, Bikago, Bali Scootr, GFS-Bike all show none; Cinchy even
 * advertises "no hidden fees") and Bank Indonesia rules that keep the
 * MDR a merchant cost. Card processing costs are absorbed into the
 * rental rates. Do not reintroduce a customer-facing card surcharge
 * without management approval.
 */

/* ================= Battery return requirement ================= */

/** Approved battery-return wording, used verbatim across surfaces. */
export const batteryReturnNote =
  "Please return the motorcycle with at least 80% battery unless another arrangement has been confirmed with our team on WhatsApp.";

/* ================= Policies awaiting approval ================= */

export interface PolicyConfig {
  approved: boolean;
  label: string;
  summary: string;
  policyUrl: string;
}

/**
 * Cancellation policy. NOT approved: no cancellation badge, deadline,
 * or fee claim may render anywhere until management approves the
 * policy and this entry is filled in.
 */
export const cancellationPolicy: PolicyConfig = {
  approved: false as boolean,
  label: "",
  summary: "",
  policyUrl: "",
};

/**
 * Insurance. NOT approved and add-on protection is in-house, never
 * third-party: no insurance badge, coverage claim, excess, or
 * liability wording may render anywhere until management approval.
 */
export const insurancePolicy: PolicyConfig = {
  approved: false as boolean,
  label: "",
  summary: "",
  policyUrl: "",
};
