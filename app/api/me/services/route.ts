import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMyServices } from "@/lib/queries";
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
    return NextResponse.json({ services: [], hasProvider: false });
  }

  const services = await getMyServices(providerId);
  return NextResponse.json({ services, hasProvider: true });
}
