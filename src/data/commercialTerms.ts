import type { LucideIcon } from "lucide-react";
import {
  BatteryCharging,
  HardHat,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Truck,
} from "lucide-react";

/**
 * Central commercial data for the rental offer.
 *
 * Everything customer-facing that depends on management approval
 * lives here: rental pricing, benefit availability, cancellation and
 * insurance policies. Components read this file and hide anything
 * that is not approved, so activating a rate or a policy later is an
 * edit to THIS file only. Never hard-code prices or policy claims in
 * components.
 */

/* ================= Rental durations & pricing ================= */

export type RentalDurationId = "daily" | "weekly" | "monthly";

export interface RentalDuration {
  id: RentalDurationId;
  label: string;
  /** Short qualifier shown under the label, e.g. minimum period. */
  detail: string;
}

/** The three rental tiers offered on every model. */
export const rentalDurations: RentalDuration[] = [
  { id: "daily", label: "Daily", detail: "1 to 6 days" },
  { id: "weekly", label: "Weekly", detail: "7 to 29 days" },
  { id: "monthly", label: "Monthly", detail: "30 days and up" },
];

export type RentalPricing = {
  dailyUsdPerDay?: number;
  weeklyUsdPerDay?: number;
  monthlyUsdPerDay?: number;
  /** Numeric prices render ONLY when this is true. */
  pricingApproved: boolean;
  pricingUpdatedAt?: string;
};

/**
 * Pricing per customer-facing model. Rates are not approved yet:
 * every entry keeps pricingApproved false and no numeric amounts.
 * When management approves rates, fill the numbers, set
 * pricingApproved true, and stamp pricingUpdatedAt.
 */
export const rentalPricing: Record<string, RentalPricing> = {
  bees: { pricingApproved: false },
  victory: { pricingApproved: false },
  athena: { pricingApproved: false },
  edpower: { pricingApproved: false },
};

/** Copy used wherever a rate would appear while unapproved. */
export const rateFallback = {
  label: "Rate available upon request",
  support: "Final rate and availability confirmed on WhatsApp.",
};

export function getPricing(modelSlug: string): RentalPricing {
  return rentalPricing[modelSlug] ?? { pricingApproved: false };
}

/* ================= Verified rental benefits ================= */

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
 * Operationally confirmed inclusions. Set confirmed to false to pull
 * a benefit from the whole site without touching components. Do NOT
 * add unverified benefits (raincoats, USB ports, POS payment,
 * roadside or 24/7 assistance) without management confirmation.
 */
export const rentalBenefits: RentalBenefit[] = [
  {
    id: "helmet",
    label: "Helmet included",
    description: "A clean, properly sized helmet comes with every motorcycle.",
    icon: HardHat,
    confirmed: true,
    chip: true,
  },
  {
    id: "phone-holder",
    label: "Phone holder included",
    description: "Navigate with your phone mounted, not balanced on your lap.",
    icon: Smartphone,
    confirmed: true,
    chip: true,
  },
  {
    id: "hairnet",
    label: "Fresh hairnet included",
    description: "A fresh hairnet for every rider, every rental.",
    icon: Sparkles,
    confirmed: true,
    chip: false,
  },
  {
    id: "charged",
    label: "Fully charged handover",
    description: "Your motorcycle arrives with a full battery, ready to ride.",
    icon: BatteryCharging,
    confirmed: true,
    chip: true,
  },
  {
    id: "whatsapp-support",
    label: "Local WhatsApp support",
    description: "A local team answers on the app you already use.",
    icon: MessageCircle,
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
    id: "official",
    label: "Official Wedison motorcycle",
    description: "Every ride is an official Wedison, maintained in-house.",
    icon: ShieldCheck,
    confirmed: true,
    chip: false,
  },
  {
    id: "handover-briefing",
    label: "Basic riding and charging handover",
    description: "A quick, practical briefing before you ride off.",
    icon: MapPin,
    confirmed: true,
    chip: false,
  },
];

export const confirmedBenefits = rentalBenefits.filter((b) => b.confirmed);
export const chipBenefits = confirmedBenefits.filter((b) => b.chip);

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
 * Insurance. NOT approved: no insurance badge, coverage claim,
 * excess, or liability wording may render anywhere until management
 * approves the policy and this entry is filled in.
 */
export const insurancePolicy: PolicyConfig = {
  approved: false as boolean,
  label: "",
  summary: "",
  policyUrl: "",
};
