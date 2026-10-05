import Link from "next/link";
import { ArrowRight, CalendarClock, CreditCard, Inbox, BellRing, Wallet } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { MODULES } from "@/components/admin/modules";
import { formatIdr } from "@/lib/pricing";
import { getModel } from "@/data/vehicles";
import type { AdminOverview } from "@/lib/adminOverview";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Makassar",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const PAYMENT_STYLES: Record<string, string> = {
  paid: "bg-ok-soft text-ok",
  pending: "bg-warn-soft text-warn",
  expired: "bg-danger-soft text-danger",
  failed: "bg-danger-soft text-danger",
  refunded: "bg-sunken text-ink-soft",
  unpaid: "bg-sunken text-ink-faint",
};

/** Admin landing page (server component): what needs attention, then the modules. */
export function AdminHome({
  name,
  role,
  overview,
}: {
  name: string;
  role: string;
  overview: AdminOverview | null;
}) {
  const o = overview;
  const tiles = o
    ? [
        {
          label: "New, needs action",
          value: o.needsAction,
          hint: "Paid or new requests nobody has handled yet",
          href: "/admin/bookings?status=new",
          icon: Inbox,
          tone: o.needsAction > 0 ? "text-primary" : "text-ink",
        },
        {
          label: "Awaiting payment",
          value: o.awaitingPayment,
          hint: "Payment window still open",
          href: "/admin/bookings?payment=pending",
          icon: CreditCard,
          tone: "text-ink",
        },
        {
          label: "Follow-ups due",
          value: o.followUpsDue,
          hint: "Follow-up date is today or earlier",
          href: "/admin/bookings",
          icon: BellRing,
          tone: o.followUpsDue > 0 ? "text-warn" : "text-ink",
        },
        {
          label: "Starting in 7 days",
          value: o.startingSoon,
          hint: "Paid or confirmed rentals to prepare",
          href: "/admin/bookings",
          icon: CalendarClock,
          tone: "text-ink",
        },
      ]
    : [];

  return (
    <Section className="!py-10">
      <p className="eyebrow">Werigo admin</p>
      <h1 className="font-display text-3xl text-ink">Hi, {name.split(" ")[0]}</h1>
      <p className="mt-1 text-sm text-ink-soft">Here is what needs your attention today.</p>

      {!o ? (
        <p role="alert" className="mt-6 rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger">
          Couldn&apos;t load the numbers. The modules below still work; refresh in a moment.
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tiles.map((t) => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.label}
                  href={t.href}
                  className="group rounded-[14px] border border-line bg-card p-5 transition-colors hover:border-primary"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">{t.label}</p>
                    <Icon className="h-4 w-4 text-ink-faint group-hover:text-primary" aria-hidden="true" />
                  </div>
                  <p className={`tnum mt-2 font-display text-4xl ${t.tone}`}>{t.value}</p>
                  <p className="mt-1 text-xs text-ink-soft">{t.hint}</p>
                </Link>
              );
            })}
          </div>

          {role === "super_admin" ? (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-[14px] border border-line bg-card p-5">
              <Wallet className="h-5 w-5 text-primary" aria-hidden="true" />
              <p className="text-sm text-ink-soft">
                Paid this month:{" "}
                <strong className="tnum font-semibold text-ink">{formatIdr(o.paidThisMonth.revenueIdr)}</strong>{" "}
                from <span className="tnum">{o.paidThisMonth.count}</span> booking{o.paidThisMonth.count === 1 ? "" : "s"}
              </p>
            </div>
          ) : null}
        </>
      )}

      <h2 className="mt-10 font-display text-xl text-ink">Modules</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.href}
              href={m.href}
              className="group flex items-start gap-4 rounded-[14px] border border-line bg-card p-5 transition-colors hover:border-primary"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-faint text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="flex-1">
                <span className="flex items-center justify-between font-semibold text-ink">
                  {m.label}
                  <ArrowRight className="h-4 w-4 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                </span>
                <span className="mt-1 block text-sm text-ink-soft">{m.description}</span>
              </span>
            </Link>
          );
        })}
      </div>

      {o ? (
        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl text-ink">Latest bookings</h2>
              <Link href="/admin/bookings" className="text-sm font-semibold text-primary hover:text-primary-strong">
                All bookings →
              </Link>
            </div>
            {o.recent.length === 0 ? (
              <p className="mt-3 rounded-[14px] border border-dashed border-line-strong bg-card p-6 text-center text-sm text-ink-soft">
                No bookings yet.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[14px] border border-line bg-card">
                {o.recent.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/admin/bookings?q=${encodeURIComponent(b.booking_code)}`}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm transition-colors hover:bg-primary-faint"
                    >
                      <span>
                        <span className="tnum font-semibold text-primary">{b.booking_code}</span>
                        <span className="ml-2 text-ink">{b.full_name}</span>
                        <span className="block text-xs text-ink-faint">
                          {getModel(b.vehicle_model)?.displayName ?? b.vehicle_model} × {b.quantity} · starts {fmt(b.start_at)}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        {b.total_idr !== null ? <span className="tnum text-xs text-ink-soft">{formatIdr(b.total_idr)}</span> : null}
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PAYMENT_STYLES[b.payment_status] ?? "bg-sunken text-ink-soft"}`}>
                          {b.payment_status}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl text-ink">Stock</h2>
              <Link href="/admin/stock" className="text-sm font-semibold text-primary hover:text-primary-strong">
                Edit →
              </Link>
            </div>
            <ul className="mt-3 divide-y divide-line rounded-[14px] border border-line bg-card text-sm">
              {o.stock.map((s) => (
                <li key={s.model} className="flex items-center justify-between px-4 py-3">
                  <span className="text-ink">{getModel(s.model)?.displayName ?? s.model}</span>
                  <span className="tnum text-ink-soft">{s.total_units === null ? "not tracked" : `${s.total_units} units`}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </Section>
  );
}
