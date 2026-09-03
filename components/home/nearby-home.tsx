"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search } from "lucide-react";
import {
  HeroBanner,
  type BrandAdDto,
  type ShopHeroAdDto,
} from "@/components/ads/hero-banner";
import { HomeBanner } from "@/components/home/home-banner";
import { LocationTrigger } from "@/components/location/location-trigger";
import { ShopsSearchPanel } from "@/components/shops/shops-search-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Coords = { lat: number; lng: number };

// The one homepage — rescue and shop used to be separate tabs, but a
// provider account is always both at once, so there's a single location
// share and a single result list (components/shops/shops-search-panel.tsx)
// that shows "Request rescue" and/or "View shop" per provider as relevant.
export function NearbyHome({
  brandAds,
  shopAds,
}: {
  brandAds: BrandAdDto[];
  shopAds: ShopHeroAdDto[];
}) {
  const router = useRouter();
  const [location, setLocation] = useState<Coords | null>(null);
  const [searchText, setSearchText] = useState("");

  // Searching is what actually needs a location (it's how results get
  // ranked/filtered by distance) — so a search here is what prompts for one,
  // same as the promoted-product CTAs in HeroBanner above.
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchText.trim();
    if (!q) return;
    if (!location) {
      toast.error("Share your location first to search nearby shops.");
      return;
    }
    router.push(`/?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
      <HeroBanner brandAds={brandAds} shopAds={shopAds} location={location} />

      <HomeBanner
        title="Need help or supplies?"
        description="Share your location and we'll find nearby mechanics, tow, fuel, tire providers and shops."
      />

      <form
        onSubmit={handleSearch}
        className="mx-auto flex w-full max-w-md gap-2"
      >
        <Input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search for a product or shop…"
          aria-label="Search for a product or shop"
        />
        <Button type="submit">
          <Search /> Search
        </Button>
      </form>

      <div className="flex flex-col items-center gap-3">
        <LocationTrigger location={location} onLocationChange={setLocation} />
      </div>

      {location && (
        <Suspense fallback={<Skeleton className="h-36 w-full" />}>
          <ShopsSearchPanel location={location} />
        </Suspense>
      )}
    </div>
  );
}
