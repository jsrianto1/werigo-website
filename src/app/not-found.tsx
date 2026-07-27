import { Compass } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { RouteLine } from "@/components/ui/RouteLine";

export default function NotFound() {
  return (
    <Section>
      <div className="mx-auto max-w-xl text-center">
        <Compass className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
        <p className="eyebrow mt-6">404, wrong turn</p>
        <h1 className="mt-3 font-display text-4xl text-ink">
          This road doesn&apos;t exist
        </h1>
        <p className="mx-auto mt-4 max-w-md leading-relaxed text-ink-soft">
          The page you&apos;re looking for was moved, renamed or never built.
          The good roads are all still here.
        </p>
        <RouteLine className="mt-8" />
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/" variant="primary" size="lg">
            Back to home
          </ButtonLink>
          <ButtonLink href="/fleet" variant="outline" size="lg">
            Browse the fleet
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}
