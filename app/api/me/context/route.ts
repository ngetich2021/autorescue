import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getPlatformPermissions,
  getShopPermissions,
  getMyShops,
} from "@/lib/authz";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const platformPermissions = await getPlatformPermissions(session.user.id);
  const shops = await getMyShops(session.user.id);
  const shopId = shops[0]?.id ?? null;
  const shopPermissions = shopId
    ? await getShopPermissions(session.user.id, shopId)
    : new Set<string>();

  return NextResponse.json({
    platform: {
      isMember: platformPermissions.size > 0,
      permissions: Array.from(platformPermissions),
    },
    shop: shopId
      ? { providerId: shopId, permissions: Array.from(shopPermissions) }
      : null,
    shops: shops.map(({ id, businessName }) => ({ id, businessName })),
  });
}
