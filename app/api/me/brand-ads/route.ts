import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMyBrandAds } from "@/lib/queries";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ads = await getMyBrandAds(session.user.id);
  return NextResponse.json({ ads });
}
