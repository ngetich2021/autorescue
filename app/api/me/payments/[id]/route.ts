import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getShopPermissions } from "@/lib/authz";

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

  const { id } = await params;
  const payment = await db.payment.findUnique({
    where: { id },
    select: { id: true, providerId: true, status: true, resultDesc: true },
  });
  if (!payment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const perms = await getShopPermissions(session.user.id, payment.providerId);
  if (perms.size === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { id: paymentId, status, resultDesc } = payment;
  return NextResponse.json({ payment: { id: paymentId, status, resultDesc } });
}
