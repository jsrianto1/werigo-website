import { redirect } from "next/navigation";
import { AppBrand } from "@/components/pwa/AppBrand";
import { AuthForm } from "@/components/account/AuthForm";
import { getSessionUser } from "@/lib/session";
import { GOOGLE_SIGN_IN_ENABLED } from "@/lib/auth";
import { safeNext } from "@/lib/safeNext";
export const dynamic = "force-dynamic";
export default async function AppLogin({ searchParams }: { searchParams: Promise<{ next?: string; mode?: string }> }) {
  const query = await searchParams;
  const candidate = safeNext(query.next, "/app/rent");
  const next = candidate.startsWith("/app/") && !candidate.startsWith("/app/login") ? candidate : "/app/rent";
  const user = await getSessionUser();
  if (user) redirect(next);
  return <div className="wr-auth"><div className="wr-auth-identity"><AppBrand hero /></div><p className="wr-kicker">Your Bali starts here.</p><h1>Where we go?</h1><p className="wr-auth-intro">Sign in or create an account to rent your Wedison, see your bookings and collect Ride Points.</p><AuthForm googleEnabled={GOOGLE_SIGN_IN_ENABLED} callbackURL={next} heading={false} appMode initialMode={query.mode === "register" ? "register" : "login"}/><p className="wr-auth-footer">Electric rides. Endless possibilities.</p></div>;
}
