import type { Metadata } from "next";
import Link from "next/link";
import { Ticket } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { AccountNav } from "@/components/account/AccountNav";
import { requireCustomer } from "@/lib/customerGate";
import { customerContext, promotionsForCustomer } from "@/lib/promotions";
import { discountLabel } from "@/lib/promotionRules";
import { formatIdr } from "@/lib/pricing";
import { getModel } from "@/data/vehicles";

export const metadata: Metadata = {
  title: "My Vouchers",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { timeZone: "Asia/Makassar", day: "numeric", month: "long", year: "numeric" });

export default async function VouchersPage() {
  const user = await requireCustomer("/account/vouchers");
  const promos = await promotionsForCustomer(await customerContext(user.id));
  const usable = promos.filter((p) => !p.blockedReason);
  const used = promos.filter((p) => p.blockedReason);

  return (
    <Section className="!py-10">
      <div className="mx-auto max-w-3xl">
        <AccountNav name={user.name} />
        <p className="mt-6 text-sm text-ink-soft">
          Vouchers and offers on your account. At checkout we apply the biggest discount that
          fits your booking automatically, and you can pick another one. One discount per booking.
        </p>

        {usable.length === 0 ? (
          <div className="mt-6 rounded-[14px] border border-dashed border-line-strong bg-card p-10 text-center">
            <Ticket className="mx-auto h-6 w-6 text-ink-faint" aria-hidden="true" />
            <h2 className="mt-3 font-display text-xl text-ink">No vouchers right now</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
              Got a promo or referral code from a friend? Enter it at checkout.
            </p>
            <Link
              href="/account/referral"
              className="mt-5 inline-flex text-sm font-semibold text-primary hover:text-primary-strong"
            >
              Share your referral code →
            </Link>
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {usable.map((p) => (
              <li key={p.id} className="relative overflow-hidden rounded-[14px] border border-primary/40 bg-card p-5">
                <span className="absolute right-0 top-0 rounded-bl-[14px] bg-primary px-3 py-1 text-xs font-semibold text-white">
                  {p.discount_type === "percent" ? `${p.discount_value}%` : formatIdr(p.discount_value)}
                </span>
                <p className="tnum text-xs font-semibold uppercase tracking-wider text-primary">{p.code}</p>
                <h2 className="mt-1 pr-16 font-display text-xl text-ink">{p.title}</h2>
                {p.description ? <p className="mt-1 text-sm text-ink-soft">{p.description}</p> : null}
                <ul className="mt-3 space-y-1 text-xs text-ink-soft">
                  <li>{discountLabel(p)} the rental (delivery fee not included)</li>
                  {p.first_booking_only ? <li>For your first booking</li> : null}
                  {p.min_rental_idr ? <li>Rental of at least {formatIdr(p.min_rental_idr)}</li> : null}
                  {p.models ? <li>Valid for {p.models.map((m) => getModel(m)?.displayName ?? m).join(", ")}</li> : null}
                  {p.ends_at ? <li>Valid until {fmtDate(p.ends_at)}</li> : null}
                </ul>
              </li>
            ))}
          </ul>
        )}

        {used.length > 0 ? (
          <div className="mt-8">
            <h2 className="font-display text-lg text-ink">Used or not available</h2>
            <ul className="mt-3 divide-y divide-line rounded-[14px] border border-line bg-card text-sm">
              {used.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <span className="text-ink-soft">
                    <span className="tnum font-semibold text-ink">{p.code}</span> · {p.title}
                  </span>
                  <span className="text-xs text-ink-faint">{p.blockedReason}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Section>
  );
}
