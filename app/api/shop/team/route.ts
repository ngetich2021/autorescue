import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveRequestedShopId, hasShopPermission } from "@/lib/authz";
import { getShopRoles, getShopMembers } from "@/lib/queries";

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
    return NextResponse.json({ error: "No shop found." }, { status: 404 });
  }
  if (!(await hasShopPermission(session.user.id, providerId, "MANAGE_TEAM"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [roles, members] = await Promise.all([
    getShopRoles(providerId),
    getShopMembers(providerId),
  ]);

  return NextResponse.json({ providerId, roles, members });
}
