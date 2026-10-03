import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { ForgotPasswordForm } from "@/components/account/PasswordResetForms";

export const metadata: Metadata = {
  title: "Forgot Password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <Section>
      <div className="mx-auto max-w-sm rounded-[14px] border border-line bg-card p-6">
        <ForgotPasswordForm />
      </div>
    </Section>
  );
}
