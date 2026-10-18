import { redirect } from "next/navigation";
import { AppBrand } from "@/components/pwa/AppBrand";
import { AuthForm } from "@/components/account/AuthForm";
import { getSessionUser } from "@/lib/session";
import { GOOGLE_SIGN_IN_ENABLED } from "@/lib/auth";
import { safeNext } from "@/lib/safeNext";
import { GOOGLE_CALLBACK_ERROR } from "@/lib/authErrors";
import Image from "next/image";
import { BatteryCharging, Compass, Gift } from "lucide-react";
export const dynamic = "force-dynamic";
export default async function AppLogin({ searchParams }: { searchParams: Promise<{ next?: string; mode?: string; install?: string; error?: string }> }) {
  const query = await searchParams;
  const candidate = safeNext(query.next, "/app/rent");
  const next = candidate.startsWith("/app/") && !candidate.startsWith("/app/login") ? candidate : "/app/rent";
  const user = await getSessionUser();
  if (user) {
    const destination = new URL(next, "https://werigo.co");
    if (query.install === "1") destination.searchParams.set("install", "1");
    redirect(destination.pathname + destination.search + destination.hash);
  }
  return <div className="wr-auth wg-auth"><section className="wg-auth-story"><div className="wr-auth-identity"><AppBrand hero /></div><p className="wg-overline">YOUR ISLAND. YOUR PACE.</p><h1>Where<br/>we go<span>?</span></h1><p className="wr-auth-intro">Your electric ride to a little more Bali.</p><div className="wg-auth-bike"><Image src="/app/edpower-red.webp" alt="Red Wedison EdPower electric motorcycle" width={1100} height={922} sizes="(max-width:700px) 150px, 440px" priority/></div><div className="wg-auth-perks"><span><BatteryCharging size={16}/>Electric rides</span><span><Compass size={16}/>Bali discoveries</span><span><Gift size={16}/>Ride rewards</span></div></section><section className="wg-auth-form" aria-label="Log in or create a Werigo account"><p className="wg-overline">LET’S GET YOU GOING</p><h2>Your Bali starts here.</h2><p className="wg-auth-form-intro">One account. Every adventure.</p><AuthForm googleEnabled={GOOGLE_SIGN_IN_ENABLED} callbackURL={next} heading={false} appMode initialMode={query.mode === "register" ? "register" : "login"} initialError={query.error ? GOOGLE_CALLBACK_ERROR : undefined}/></section></div>;
}
