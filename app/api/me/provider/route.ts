import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getShopById } from "@/lib/queries";
import { resolveRequestedShopId, parseServiceTypes } from "@/lib/authz";

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
  const shop = providerId ? await getShopById(providerId) : null;
  const profile = shop
    ? { ...shop, serviceTypes: parseServiceTypes(shop.serviceTypes) }
    : null;
  return NextResponse.json({ profile, accountEmail: session.user.email ?? "" });
}
