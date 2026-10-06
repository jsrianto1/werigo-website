"use client";

import { useRouter } from "next/navigation";
import { IdentityForm } from "@/components/account/IdentityForm";

/** Client wrapper: save documents, then continue where the customer was going. */
export function CompleteIdentity({ next }: { next: string }) {
  const router = useRouter();
  return (
    <IdentityForm
      heading="One more step: your rider documents"
      intro="To rent a motorcycle we need your identity document and driving licence number. You only do this once."
      submitLabel="Save and continue"
      onSaved={() => {
        router.push(next);
        router.refresh();
      }}
    />
  );
}
