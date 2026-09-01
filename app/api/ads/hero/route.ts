import { NextResponse } from "next/server";
import { getActiveBrandAds, getActiveShopAdsForHero } from "@/lib/queries";

// Polled every 5s by components/ads/hero-banner.tsx so a newly-approved ad
// (or one an admin just deactivated) shows up for anyone already on the
// page, without them needing to reload. GET handlers with no params and no
// dynamic API calls are the one shape Next can be tempted to treat as
// static — force-dynamic plus a no-store header rules that out explicitly
// rather than relying on the framework's default.
export const dynamic = "force-dynamic";

export async function GET() {
  const [brandAds, shopAds] = await Promise.all([
    getActiveBrandAds(),
    getActiveShopAdsForHero(),
  ]);
  return NextResponse.json(
    { brandAds, shopAds },
    { headers: { "Cache-Control": "no-store" } },
  );
}
