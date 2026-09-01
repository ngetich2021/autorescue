import { getActiveBrandAds, getActiveShopAdsForHero } from "@/lib/queries";
import { NearbyHome } from "@/components/home/nearby-home";

// ISR: regenerate this page's server-rendered snapshot at most every 10s,
// so a fresh visit/navigation never shows data older than that — on top of
// the 5s client-side polling in components/ads/hero-banner.tsx that keeps
// an already-open tab current without a reload.
export const revalidate = 10;

export default async function HomePage() {
  const [brandAds, shopAds] = await Promise.all([
    getActiveBrandAds(),
    getActiveShopAdsForHero(),
  ]);
  return <NearbyHome brandAds={brandAds} shopAds={shopAds} />;
}
