import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMyProducts } from "@/lib/queries";
import { getMyShopId } from "@/lib/authz";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providerId = await getMyShopId(session.user.id);
  if (!providerId) {
    return NextResponse.json({ products: [], hasProvider: false });
  }

  const products = await getMyProducts(providerId);
  return NextResponse.json({ products, hasProvider: true });
}
