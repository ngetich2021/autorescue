import { Skeleton } from "@/components/ui/skeleton";

// Route-level Suspense fallback for /admin — shown immediately while the
// page resolves platform-membership + the full dashboard dataset server-side
// (see lib/db.ts's cold-start note).
export default function AdminLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <Skeleton className="h-7 w-40" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
