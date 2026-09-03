import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isPlatformMember } from "@/lib/authz";
import { getAdminDashboardData } from "@/lib/queries";

// Already dynamic by virtue of auth() reading cookies, but explicit for the
// same reason as app/api/ads/hero/route.ts — no ambiguity about caching.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await isPlatformMember(session.user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await getAdminDashboardData();
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[admin/data] database unavailable:", error);
    return NextResponse.json(
      { error: "Database temporarily unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
