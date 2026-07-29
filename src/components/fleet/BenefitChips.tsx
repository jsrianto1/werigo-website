import {
  chipBenefits,
  confirmedBenefits,
  cancellationPolicy,
  insurancePolicy,
} from "@/data/commercialTerms";

/**
 * Verified benefit chips for vehicle cards and detail pages.
 *
 * Reads only confirmed benefits from src/data/commercialTerms.ts.
 * Cancellation and insurance chips are wired but render nothing until
 * their policies are approved in that file: no free-cancellation or
 * insurance wording may appear before then.
 */
export function BenefitChips({
  variant = "card",
  className = "",
}: {
  variant?: "card" | "detail";
  className?: string;
}) {
  const benefits = variant === "card" ? chipBenefits : confirmedBenefits;
  const policies = [cancellationPolicy, insurancePolicy].filter(
    (p) => p.approved && p.label
  );

  if (benefits.length === 0 && policies.length === 0) return null;

  return (
    <ul
      aria-label="Included with this rental"
      className={`flex flex-wrap gap-1.5 ${className}`}
    >
      {benefits.map((b) => (
        <li
          key={b.id}
          className={`inline-flex items-center gap-1.5 rounded-full bg-primary-faint py-1 font-medium text-primary ${
            variant === "card" ? "px-2.5 text-[11px]" : "px-3 text-xs"
          }`}
        >
          <b.icon
            className={variant === "card" ? "h-3 w-3" : "h-3.5 w-3.5"}
            aria-hidden="true"
          />
          {b.label}
        </li>
      ))}
      {policies.map((p) => (
        <li
          key={p.label}
          className={`inline-flex items-center gap-1.5 rounded-full bg-ok/10 py-1 font-medium text-ok ${
            variant === "card" ? "px-2.5 text-[11px]" : "px-3 text-xs"
          }`}
        >
          {p.label}
        </li>
      ))}
    </ul>
  );
}
