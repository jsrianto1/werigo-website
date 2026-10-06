import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { rideClubReady } from "@/lib/rideClub";
import { RIDE_TIERS } from "@/lib/rideClubRules";
import { formatIdr } from "@/lib/pricing";
export const dynamic="force-dynamic";
async function available(){try{return await rideClubReady();}catch{return false;}}
export async function generateMetadata():Promise<Metadata>{
  return {title:"Werigo Ride Club | Rental Rewards in Bali",description:"Earn Ride Points on completed electric scooter rentals in Bali. Silver, Gold and Platinum rewards for your next rental or extension.",alternates:{canonical:"/ride-club"},robots:{index:await available(),follow:true}};
}
export default async function RideClubPage(){
  const ready=await available();
  return <Section className="!py-16"><div className="mx-auto max-w-4xl">
    <p className="eyebrow">Werigo Ride Club</p>
    <h1 className="mt-3 max-w-2xl font-display text-4xl text-ink sm:text-6xl">More Bali days.<br/>More rewarding rides.</h1>
    <p className="mt-5 max-w-xl text-lg text-ink-soft">Your coffee run, beach day and extra week in Bali can bring you closer to your next ride. Membership is free.</p>
    {!ready && <p role="status" className="mt-5 rounded-xl border border-line p-4">Ride Club is getting ready. Points will start earning after the program is activated.</p>}
    <div className="mt-7 flex flex-wrap gap-4"><Link href="/account/register?next=/account/membership" className="rounded-lg bg-primary px-6 py-3 font-semibold text-white">{ready?"Join Werigo Ride Club":"Create your Werigo account"}</Link><Link href="/account/membership" className="rounded-lg border border-line px-6 py-3 font-semibold">View my membership</Link></div>
    <div className="mt-12 grid gap-5 sm:grid-cols-3">{RIDE_TIERS.map(t=><article key={t.name} className="rounded-[14px] border border-line p-6"><h2 className="font-display text-2xl">{t.name}</h2><p className="mt-3 text-sm text-ink-soft">{t.spend?`${formatIdr(t.spend)} in completed rentals over the last 12 months`:"Start here when you create your account"}</p><p className="mt-5 text-2xl font-semibold text-primary">{t.multiplier} Ride Points</p><p className="text-sm text-ink-soft">per Rp10,000 of net rental charges</p></article>)}</div>
    <h2 className="mt-12 font-display text-3xl">Earn. Extend. Explore again.</h2>
    <ol className="mt-5 grid gap-5 sm:grid-cols-3"><li><h3 className="font-semibold">1. Create your account</h3><p className="mt-2 text-sm text-ink-soft">Verify your email. Your 50-point welcome bonus unlocks after your first completed, paid rental.</p></li><li><h3 className="font-semibold">2. Complete your rental</h3><p className="mt-2 text-sm text-ink-soft">Points arrive after completion and full payment. Your tier at booking sets your earning rate.</p></li><li><h3 className="font-semibold">3. Use your Ride Points</h3><p className="mt-2 text-sm text-ink-soft">Choose points at checkout for your next rental or a new extension booking on the same account.</p></li></ol>
    <div className="mt-8 rounded-xl bg-sunken p-6 text-sm text-ink-soft"><p className="font-semibold text-ink">The details, before you ride</p><p className="mt-2">1 point = Rp200. Minimum redemption: 100 points (Rp20,000). Points cover up to 10% of the rental charge and expire 12 months after issue. Choose points or a voucher/referral discount, one per booking. Points are calculated on rental charges after discounts; delivery, deposits and other fees are excluded. Cancelled or refunded rentals do not earn points. Historical rentals before activation are excluded. Points have no cash value and cannot be transferred.</p></div>
  </div></Section>;
}
