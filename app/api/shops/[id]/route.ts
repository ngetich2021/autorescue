import { NextRequest, NextResponse } from "next/server";
import { getShopWithDistance } from "@/lib/queries";
import { coordsSchema } from "@/lib/validations";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const parsed = coordsSchema.safeParse({
    latitude: searchParams.get("latitude"),
    longitude: searchParams.get("longitude"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const shop = await getShopWithDistance(id, parsed.data);
  if (!shop) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  return NextResponse.json({ shop });
}
