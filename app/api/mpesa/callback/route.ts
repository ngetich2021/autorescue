import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseStkCallback, type StkCallbackPayload } from "@/lib/mpesa";

// Public webhook — Safaricom's servers call this directly, no session to
// check. Trust is rooted in the CheckoutRequestID matching a Payment row we
// created ourselves; always ack 200 (Daraja retries on non-200) even for a
// request we can't match, so a stray/replayed callback doesn't loop forever.
export async function POST(request: Request) {
  let payload: StkCallbackPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  const result = parseStkCallback(payload);
  const payment = await db.payment.findUnique({
    where: { checkoutRequestId: result.checkoutRequestId },
  });
  if (!payment || payment.status !== "PENDING") {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: result.success ? "COMPLETED" : "FAILED",
      resultDesc: result.resultDesc,
      mpesaReceiptNumber: result.mpesaReceiptNumber,
    },
  });

  if (result.success) {
    if (payment.purpose === "PROMOTION" && payment.shopAdId && payment.days) {
      const shopAd = await db.shopAd.findUnique({ where: { id: payment.shopAdId } });
      if (shopAd) {
        // Stacks onto whatever time is left rather than always resetting
        // from "now" — paying again before expiry extends the promotion
        // instead of wasting the remaining paid days.
        const base =
          shopAd.expiresAt && shopAd.expiresAt > new Date() ? shopAd.expiresAt : new Date();
        const expiresAt = new Date(base.getTime() + payment.days * 24 * 60 * 60 * 1000);
        await db.shopAd.update({
          where: { id: shopAd.id },
          data: { expiresAt, isActive: true },
        });
      }
    } else if (payment.purpose === "BADGE" && payment.days) {
      const provider = await db.providerProfile.findUnique({
        where: { id: payment.providerId },
      });
      if (provider) {
        // Stacks onto whatever time is left, same as a ShopAd promotion
        // (see the PROMOTION branch above) — paying again before expiry
        // extends verification instead of wasting the remaining paid days.
        const base =
          provider.verifiedUntil && provider.verifiedUntil > new Date()
            ? provider.verifiedUntil
            : new Date();
        const verifiedUntil = new Date(base.getTime() + payment.days * 24 * 60 * 60 * 1000);
        await db.providerProfile.update({
          where: { id: provider.id },
          data: { isVerified: true, verifiedAt: new Date(), verifiedUntil },
        });
      }
    }
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
