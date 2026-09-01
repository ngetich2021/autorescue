"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdColor } from "@/lib/validations";
import { AD_COLOR_SWATCHES } from "./ad-colors";

export type SlideView = {
  title: string;
  description: string | null;
  imageUrl: string | null;
  bgGradient: string;
  isDarkText: boolean;
  ctaColor: AdColor;
  ctaLabel: string;
  onCta?: () => void;
};

// The exact visual the live hero carousel (components/ads/hero-banner.tsx)
// renders for one slide. Also used, completely unchanged, for the admin
// appearance preview (components/admin/ad-detail-modal.tsx) so what an admin
// previews is pixel-identical to what customers actually see — not a
// simplified stand-in that can drift from the real thing.
export function HeroSlideVisual({
  view,
  priority = false,
}: {
  view: SlideView;
  priority?: boolean;
}) {
  const cta = (
    <button
      type="button"
      disabled={!view.onCta}
      className={cn(
        "flex h-7 items-center gap-1 rounded-lg px-2.5 text-[0.8rem] font-medium text-white transition-opacity hover:opacity-90 disabled:pointer-events-none",
        AD_COLOR_SWATCHES[view.ctaColor],
      )}
      onClick={view.onCta}
    >
      {view.ctaLabel} <ArrowRight className="size-3.5" />
    </button>
  );

  const overlay = (
    <div
      className={cn(
        "absolute inset-0 flex flex-col justify-end gap-2 p-4",
        view.isDarkText
          ? "bg-linear-to-t from-white/85 via-white/40 to-transparent text-neutral-900"
          : "bg-linear-to-t from-black/70 to-transparent text-white",
      )}
    >
      <div>
        <span className="text-base font-semibold">{view.title}</span>
        {view.description && (
          <p className="line-clamp-1 text-sm opacity-85">{view.description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">{cta}</div>
    </div>
  );

  return view.imageUrl ? (
    <div className="relative h-full w-full">
      <Image
        src={view.imageUrl}
        alt={view.title}
        fill
        className="object-cover"
        priority={priority}
      />
      {overlay}
    </div>
  ) : (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-center gap-2 bg-linear-to-br px-6 text-center text-white",
        view.bgGradient,
      )}
    >
      <span className="text-lg font-semibold">{view.title}</span>
      {view.description && (
        <span className="line-clamp-2 text-sm text-white/85">{view.description}</span>
      )}
      <div className="mt-1 flex items-center gap-3">{cta}</div>
    </div>
  );
}
