import { redirect } from "next/navigation";
import { AppBrand } from "@/components/pwa/AppBrand";
import { AuthForm } from "@/components/account/AuthForm";
import { getSessionUser } from "@/lib/session";
import { GOOGLE_SIGN_IN_ENABLED } from "@/lib/auth";
import { safeNext } from "@/lib/safeNext";
import { GOOGLE_CALLBACK_ERROR } from "@/lib/authErrors";
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
  return <div className="wr-auth"><div className="wr-auth-identity"><AppBrand hero /></div><p className="wr-kicker">Your Bali starts here.</p><h1>Where we go?</h1><p className="wr-auth-intro">Rent a Wedison, explore Bali and earn Ride Points. One account for every ride.</p><AuthForm googleEnabled={GOOGLE_SIGN_IN_ENABLED} callbackURL={next} heading={false} appMode initialMode={query.mode === "register" ? "register" : "login"} initialError={query.error ? GOOGLE_CALLBACK_ERROR : undefined}/><p className="wr-auth-footer">Electric rides. Endless possibilities.</p></div>;
}
