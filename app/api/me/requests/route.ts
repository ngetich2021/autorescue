import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getIncomingRequests } from "@/lib/queries";
import { resolveRequestedShopId, hasShopPermission } from "@/lib/authz";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const providerId = await resolveRequestedShopId(
    session.user.id,
    searchParams.get("shop"),
  );
  if (!providerId) {
    return NextResponse.json({ requests: [], hasProvider: false });
  }
  if (!(await hasShopPermission(session.user.id, providerId, "MANAGE_REQUESTS"))) {
    return NextResponse.json({ requests: [], hasProvider: true, forbidden: true });
  }

  const requests = await getIncomingRequests(providerId);
  return NextResponse.json({ requests, hasProvider: true });
}
