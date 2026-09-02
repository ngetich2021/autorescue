"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { haversineDistanceKm } from "@/lib/geo";
import type { AdColor, AdTextColor } from "@/lib/validations";
import { AD_COLOR_GRADIENTS } from "./ad-colors";
import { HeroSlideVisual } from "./hero-slide";

export type BrandAdDto = {
  id: string;
  title: string;
  productName: string;
  description: string | null;
  imageUrl: string | null;
  bgColor: AdColor;
  textColor: AdTextColor;
  ctaColor: AdColor;
  targetLatitude: number | null;
  targetLongitude: number | null;
  targetRadiusKm: number | null;
};

// A shop's own promoted-product poster, shown in the same carousel as brand
// ads. Its "target area" is always the shop's own location + the ad's own
// radiusKm (universal when null) — same visibility shape as brand targeting.
export type ShopHeroAdDto = {
  id: string;
  providerId: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  radiusKm: number | null;
};

type Coords = { lat: number; lng: number };

type Slide =
  | { kind: "brand"; ad: BrandAdDto }
  | { kind: "shop"; ad: ShopHeroAdDto };

function isVisible(
  targetLat: number | null,
  targetLng: number | null,
  targetRadiusKm: number | null,
  location?: Coords | null,
) {
  // Universal: no target radius set, always shown.
  if (targetRadiusKm == null) return true;
  // Localised: only shown once we know the customer is within range.
  if (!location || targetLat == null || targetLng == null) return false;
  return (
    haversineDistanceKm(location.lat, location.lng, targetLat, targetLng) <=
    targetRadiusKm
  );
}

const AD_POLL_INTERVAL_MS = 5000;

export function HeroBanner({
  brandAds: initialBrandAds,
  shopAds: initialShopAds,
  location,
}: {
  brandAds: BrandAdDto[];
  shopAds: ShopHeroAdDto[];
  location?: Coords | null;
}) {
  const router = useRouter();
  const [brandAds, setBrandAds] = useState(initialBrandAds);
  const [shopAds, setShopAds] = useState(initialShopAds);

  // Ads are server-rendered once at page load, so without this an ad an
  // admin just approved (or deactivated) wouldn't show up for anyone
  // already sitting on the page until they reloaded it. Keeps polling even
  // while there's nothing to show (count === 0 below) — that's exactly the
  // "just got approved" moment this needs to catch.
  useEffect(() => {
    const interval = setInterval(() => {
      fetch("/api/ads/hero", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) return;
          setBrandAds(data.brandAds ?? []);
          setShopAds(data.shopAds ?? []);
        })
        .catch(() => {});
    }, AD_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const slides = useMemo<Slide[]>(() => {
    const brand = brandAds
      .filter((ad) =>
        isVisible(ad.targetLatitude, ad.targetLongitude, ad.targetRadiusKm, location),
      )
      .map((ad) => ({ kind: "brand" as const, ad }));
    const shop = shopAds
      .filter((ad) => isVisible(ad.latitude, ad.longitude, ad.radiusKm, location))
      .map((ad) => ({ kind: "shop" as const, ad }));
    return [...brand, ...shop];
  }, [brandAds, shopAds, location]);

  const count = slides.length;
  const [index, setIndex] = useState(0);
  // Slide index can outrun a shrinking slide list (location arriving, ads
  // changing) — clamp what we render from, never trust `index` raw.
  const activeIndex = count === 0 ? 0 : index % count;

  useEffect(() => {
    if (count < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => clearInterval(timer);
  }, [count]);

  if (count === 0) return null;

  // Guards against double navigation from a fast double-click/tap —
  // router.push doesn't resolve synchronously, so relying on React state
  // (which only updates on the next render) isn't enough to block the
  // second click. Disabling the clicked DOM node directly (via the event,
  // not a ref) is synchronous and re-enabled on a timer.
  function navigate(e: React.MouseEvent<HTMLButtonElement>, href: string) {
    const button = e.currentTarget;
    if (button.disabled) return;
    button.disabled = true;
    router.push(href);
    setTimeout(() => {
      button.disabled = false;
    }, 1000);
  }

  function goFindNearbyShops(ad: BrandAdDto, e: React.MouseEvent<HTMLButtonElement>) {
    if (!location) {
      toast.error("Share your location first to find nearby shops.");
      return;
    }
    navigate(e, `/shops?q=${encodeURIComponent(ad.productName)}`);
  }

  function goToShop(ad: ShopHeroAdDto, e: React.MouseEvent<HTMLButtonElement>) {
    if (!location) {
      toast.error("Share your location first to view this shop.");
      return;
    }
    navigate(e, `/shops?shop=${ad.providerId}`);
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="relative h-36 w-full overflow-hidden rounded-xl border sm:h-44">
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{
            width: `${count * 100}%`,
            transform: `translateX(-${(100 / count) * activeIndex}%)`,
          }}
        >
          {slides.map((slide, i) => {
            // Resolve every per-kind field up front (rather than narrowing
            // `slide.kind` inline below) so TypeScript keeps each branch's
            // field types straight — BrandAdDto and ShopHeroAdDto only
            // overlap on id/title/description/imageUrl.
            const view =
              slide.kind === "brand"
                ? {
                    id: slide.ad.id,
                    title: slide.ad.title,
                    description: slide.ad.description,
                    imageUrl: slide.ad.imageUrl,
                    bgGradient: AD_COLOR_GRADIENTS[slide.ad.bgColor],
                    isDarkText: slide.ad.textColor === "dark",
                    ctaColor: slide.ad.ctaColor,
                    ctaLabel: "Find nearby shops",
                    onCta: (e: React.MouseEvent<HTMLButtonElement>) =>
                      goFindNearbyShops(slide.ad, e),
                  }
                : {
                    id: slide.ad.id,
                    title: slide.ad.title,
                    description: slide.ad.description,
                    imageUrl: slide.ad.imageUrl,
                    bgGradient: AD_COLOR_GRADIENTS.blue,
                    isDarkText: false,
                    ctaColor: "blue" as AdColor,
                    ctaLabel: "View shop",
                    onCta: (e: React.MouseEvent<HTMLButtonElement>) =>
                      goToShop(slide.ad, e),
                  };

            return (
              <div
                key={`${slide.kind}-${view.id}`}
                className="h-full shrink-0"
                style={{ width: `${100 / count}%` }}
              >
                <HeroSlideVisual view={view} priority={i === 0} />
              </div>
            );
          })}
        </div>
      </div>
      {count > 1 && (
        <div className="flex justify-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show ad ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIndex ? "w-4 bg-foreground" : "w-1.5 bg-muted-foreground/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
