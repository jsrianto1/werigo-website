import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { bikeImage, modelNames, type SagaModel } from "@/data/saga";

/**
 * Bike card for the dark WERIGO SAGA surfaces. Uses the clean official
 * transparent cutouts (public/media/saga/bikes), shown on a dark glass
 * card with a soft glow and floor shadow. Never the spin-blurred
 * fleet/<model>/cutout.webp, which is animation artwork.
 */
export function SagaBikeCard({ model, compact = false }: { model: SagaModel; compact?: boolean }) {
  const img = bikeImage(model);

  if (compact) {
    return (
      <Link
        href={`/fleet/${model}`}
        className="group flex items-center gap-4 rounded-[16px] border border-white/10 bg-white/[0.04] p-3 pr-4 transition-colors hover:border-[#2ee0b0]/50 hover:bg-white/[0.07]"
      >
        <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-[12px] bg-[radial-gradient(70%_70%_at_50%_60%,rgba(46,224,176,0.22),transparent_75%)]">
          <Image
            src={img.src}
            alt={modelNames[model]}
            fill
            sizes="112px"
            className="object-contain p-1.5 drop-shadow-[0_6px_10px_rgba(0,0,0,0.55)] transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">{modelNames[model]}</p>
          <p className="mt-0.5 text-sm text-white/60">See rates and details</p>
        </div>
        <ArrowRight
          className="h-5 w-5 shrink-0 text-white/50 transition-transform group-hover:translate-x-1 group-hover:text-[#2ee0b0]"
          aria-hidden="true"
        />
      </Link>
    );
  }

  return (
    <Link
      href={`/fleet/${model}`}
      className="group relative block overflow-hidden rounded-[18px] border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.015] p-4 transition-colors hover:border-[#2ee0b0]/50"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-6 mx-auto h-40 w-4/5 rounded-full bg-[#2ee0b0]/20 blur-3xl transition-opacity duration-300 group-hover:opacity-100 sm:opacity-70"
      />
      <div className="relative aspect-[4/3]">
        <div
          aria-hidden="true"
          className="absolute inset-x-[12%] bottom-[5%] h-[9%] rounded-[50%] bg-black/60 blur-md"
        />
        <Image
          src={img.src}
          alt={modelNames[model]}
          fill
          sizes="(min-width: 1024px) 280px, 45vw"
          className="object-contain object-bottom px-1 pb-[4%] transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-[1.03]"
        />
      </div>
      <div className="relative mt-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white sm:text-base">{modelNames[model]}</p>
        <ArrowRight
          className="h-4 w-4 shrink-0 text-white/50 transition-transform group-hover:translate-x-1 group-hover:text-[#2ee0b0]"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}
