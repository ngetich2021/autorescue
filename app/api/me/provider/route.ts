import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getShopById } from "@/lib/queries";
import { getMyShopId, parseServiceTypes } from "@/lib/authz";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providerId = await getMyShopId(session.user.id);
  const shop = providerId ? await getShopById(providerId) : null;
  const profile = shop
    ? { ...shop, serviceTypes: parseServiceTypes(shop.serviceTypes) }
    : null;
  return NextResponse.json({ profile, accountEmail: session.user.email ?? "" });
}
