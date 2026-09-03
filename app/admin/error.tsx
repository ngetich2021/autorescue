"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// auth() and getAdminDashboardData() both read the database on every visit
// to /admin (session strategy: "database") — a Turso outage/DNS blip throws
// here instead of hanging the whole request, now that lib/db.ts bounds every
// query to an 8s timeout.
export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <AlertTriangle className="size-10 text-muted-foreground" />
      <h1 className="text-xl font-semibold">Admin data unavailable</h1>
      <p className="text-sm text-muted-foreground">
        Couldn&apos;t reach the database. This is usually temporary — try again in
        a moment.
      </p>
      <div className="flex gap-2">
        <Button onClick={() => reset()}>Try again</Button>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          Back to app
        </Link>
      </div>
    </div>
  );
}
