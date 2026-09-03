import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMyShopAds, getMyProducts } from "@/lib/queries";
import { resolveRequestedShopId } from "@/lib/authz";

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
    return NextResponse.json({ ads: [], products: [], hasProvider: false });
  }

  const [ads, products] = await Promise.all([
    getMyShopAds(providerId),
    getMyProducts(providerId),
  ]);
  return NextResponse.json({ ads, products, hasProvider: true });
}
