import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getNearbyProviders } from "@/lib/queries";
import { coordsSchema, SERVICE_TYPES } from "@/lib/validations";

const querySchema = coordsSchema.extend({
  radiusKm: z.coerce.number().min(1).max(200).default(15),
  q: z.string().trim().max(100).optional(),
  serviceType: z.enum(SERVICE_TYPES).optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    latitude: searchParams.get("latitude"),
    longitude: searchParams.get("longitude"),
    radiusKm: searchParams.get("radiusKm") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    serviceType: searchParams.get("serviceType") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const shops = await getNearbyProviders(parsed.data);
  return NextResponse.json({ shops });
}
