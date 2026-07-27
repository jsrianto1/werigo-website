import Link from "next/link";
import Image from "next/image";

/**
 * Official Werigo logo (master: public/brand/, derived unmodified
 * from "Werigo Logo.png" — background removal only).
 *
 * - header: compact lockup (symbol + WERIGO wordmark) on light surfaces
 * - footer: full lockup with "MOVE THE FUTURE." on a white plate so the
 *   navy wordmark stays readable on the dark footer
 */
export function Logo({
  variant = "header",
  className = "",
}: {
  variant?: "header" | "footer";
  className?: string;
}) {
  if (variant === "footer") {
    return (
      <Link
        href="/"
        aria-label="Werigo home"
        className={`inline-block rounded-[10px] bg-white px-4 py-3 ${className}`}
      >
        <Image
          src="/brand/werigo-logo-full.png"
          alt="Werigo. Move the Future."
          width={1217}
          height={560}
          className="h-auto w-40"
          sizes="160px"
        />
      </Link>
    );
  }

  return (
    <Link
      href="/"
      aria-label="Werigo home"
      className={`inline-flex items-center ${className}`}
    >
      <Image
        src="/brand/werigo-logo-compact.png"
        alt="Werigo. Move the Future."
        width={1217}
        height={482}
        priority
        className="h-10 w-auto"
        sizes="104px"
      />
    </Link>
  );
}
