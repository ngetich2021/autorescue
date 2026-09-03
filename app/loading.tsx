import { Skeleton } from "@/components/ui/skeleton";

// Next's route-level Suspense fallback for "/" — shown immediately while
// the page's server-side auth() + DB fetches (getActiveBrandAds,
// getActiveShopAdsForHero) are pending, instead of a blank white screen for
// however long that takes (Turso's cold-start latency can run several
// seconds — see lib/db.ts).
export default function HomeLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
      <Skeleton className="h-36 w-full rounded-xl sm:h-44" />
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="mx-auto flex w-full max-w-md gap-2">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="flex justify-center gap-3">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-36" />
      </div>
    </div>
  );
}
