import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Section } from "@/components/ui/Section";
import { AuthForm } from "@/components/account/AuthForm";
import { getSessionUser } from "@/lib/session";
import { GOOGLE_SIGN_IN_ENABLED } from "@/lib/auth";
import { safeNext } from "@/lib/safeNext";
import { GOOGLE_CALLBACK_ERROR } from "@/lib/authErrors";

export const metadata: Metadata = {
  title: "Sign In",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string; error?: string }>;
}) {
  const { next, mode, error } = await searchParams;
  const target = safeNext(next, "/account");
  const user = await getSessionUser();
  if (user) redirect(target);
  return (
    <Section>
      <div className="mx-auto max-w-sm rounded-[14px] border border-line bg-card p-6">
        <AuthForm
          initialMode={mode === "register" ? "register" : "login"}
          googleEnabled={GOOGLE_SIGN_IN_ENABLED}
          callbackURL={target}
          initialError={error ? GOOGLE_CALLBACK_ERROR : undefined}
        />
      </div>
    </Section>
  );
}
