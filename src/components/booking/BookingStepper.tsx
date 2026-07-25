import { Check } from "lucide-react";

const stepLabels = ["Search", "Choose ride", "Extras", "Your details", "Review", "Confirmed"];

/**
 * Booking progress indicator. `current` is 0-based against stepLabels.
 */
export function BookingStepper({ current }: { current: number }) {
  return (
    <nav aria-label="Booking progress" className="mb-8">
      <ol className="flex items-center gap-0 overflow-x-auto pb-1">
        {stepLabels.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={label} className="flex shrink-0 items-center">
              {i > 0 ? (
                <span
                  aria-hidden="true"
                  className={`mx-1.5 h-px w-5 sm:mx-2 sm:w-8 ${
                    i <= current ? "bg-primary" : "bg-line-strong"
                  }`}
                />
              ) : null}
              <span
                aria-current={active ? "step" : undefined}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium sm:text-sm ${
                  active
                    ? "bg-primary text-white"
                    : done
                      ? "text-primary"
                      : "text-ink-faint"
                }`}
              >
                {done ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <span className="tnum">{i + 1}.</span>
                )}
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
