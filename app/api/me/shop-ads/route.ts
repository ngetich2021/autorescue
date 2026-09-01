import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMyShopAds, getMyProducts } from "@/lib/queries";
import { getMyShopId } from "@/lib/authz";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providerId = await getMyShopId(session.user.id);
  if (!providerId) {
    return NextResponse.json({ ads: [], products: [], hasProvider: false });
  }

  const [ads, products] = await Promise.all([
    getMyShopAds(providerId),
    getMyProducts(providerId),
  ]);
  return NextResponse.json({ ads, products, hasProvider: true });
}
