import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMyShopId } from "@/lib/authz";

// Polled by the client after starting an STK push (components/shops/mpesa-pay-modal.tsx)
// while the customer approves on their phone — the real status update comes
// from app/api/mpesa/callback/route.ts, this just reads the current row.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providerId = await getMyShopId(session.user.id);
  if (!providerId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { id } = await params;
  const payment = await db.payment.findFirst({
    where: { id, providerId },
    select: { id: true, status: true, resultDesc: true },
  });
  if (!payment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ payment });
}
