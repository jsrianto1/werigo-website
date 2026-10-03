import type { Metadata } from "next";
import { Suspense } from "react";
import { Section } from "@/components/ui/Section";
import { ResetPasswordForm } from "@/components/account/PasswordResetForms";

export const metadata: Metadata = {
  title: "Reset Password",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <Section>
      <div className="mx-auto max-w-sm rounded-[14px] border border-line bg-card p-6">
        <Suspense fallback={<div className="h-40 animate-pulse rounded-[10px] bg-sunken" aria-busy="true" />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </Section>
  );
}
