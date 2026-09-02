"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateId } from "@/lib/id";
import { getMyShopId, hasShopPermission } from "@/lib/authz";
import { formatMpesaPhone, initiateStkPush } from "@/lib/mpesa";
import {
  promotionPaymentSchema,
  badgePaymentSchema,
  PROMOTION_LOCAL_RATE_KES,
  PROMOTION_UNIVERSAL_RATE_KES,
  VERIFICATION_BADGE_FEE_KES,
} from "@/lib/validations";
import type { ActionState } from "@/app/actions/types";

type PaymentActionState = ActionState & { paymentId?: string };

// Starts an STK push to pay for keeping one promotion live — KES 25/day if
// it's radius-limited ("local"), KES 50/day if universal (radiusKm null).
// The Payment row stays PENDING until the customer approves on their phone
// and Safaricom posts the result to app/api/mpesa/callback/route.ts, which
// is what actually sets ShopAd.expiresAt.
export async function initiatePromotionPayment(
  _prevState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const parsed = promotionPaymentSchema.safeParse({
    shopAdId: formData.get("shopAdId"),
    days: formData.get("days"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const providerId = await getMyShopId(session.user.id);
  if (!providerId) return { error: "Create your provider listing first." };
  if (!(await hasShopPermission(session.user.id, providerId, "MANAGE_PRODUCTS"))) {
    return { error: "You don't have permission to manage this shop's promotions." };
  }

  const shopAd = await db.shopAd.findFirst({
    where: { id: parsed.data.shopAdId, providerId },
  });
  if (!shopAd) return { error: "Promotion not found." };

  const phone = formatMpesaPhone(parsed.data.phone);
  if (!phone) return { error: "Enter a valid Kenyan M-Pesa number." };

  const rate = shopAd.radiusKm == null ? PROMOTION_UNIVERSAL_RATE_KES : PROMOTION_LOCAL_RATE_KES;
  const amount = rate * parsed.data.days;

  const payment = await db.payment.create({
    data: {
      id: generateId(),
      providerId,
      purpose: "PROMOTION",
      shopAdId: shopAd.id,
      days: parsed.data.days,
      amount,
      phone,
      status: "PENDING",
    },
  });

  try {
    const { checkoutRequestId, merchantRequestId } = await initiateStkPush({
      phone,
      amount,
      accountReference: shopAd.title,
      transactionDesc: "Promotion",
    });
    await db.payment.update({
      where: { id: payment.id },
      data: { checkoutRequestId, merchantRequestId },
    });
  } catch (err) {
    await db.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", resultDesc: err instanceof Error ? err.message : "STK push failed." },
    });
    return { error: "Couldn't start the M-Pesa payment. Try again." };
  }

  return { success: true, paymentId: payment.id };
}

// Starts an STK push for the one-off KES 20 verification badge, which lifts
// the shop out of the 100m unverified visibility cap once paid — see
// lib/queries.ts#withDistanceAndServiceTypes.
export async function initiateBadgePayment(
  _prevState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const parsed = badgePaymentSchema.safeParse({ phone: formData.get("phone") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const providerId = await getMyShopId(session.user.id);
  if (!providerId) return { error: "Create your provider listing first." };
  if (!(await hasShopPermission(session.user.id, providerId, "MANAGE_LISTING"))) {
    return { error: "You don't have permission to manage this shop's listing." };
  }

  const provider = await db.providerProfile.findUnique({ where: { id: providerId } });
  if (!provider) return { error: "Shop not found." };
  if (provider.isVerified) return { error: "This shop is already verified." };

  const phone = formatMpesaPhone(parsed.data.phone);
  if (!phone) return { error: "Enter a valid Kenyan M-Pesa number." };

  const payment = await db.payment.create({
    data: {
      id: generateId(),
      providerId,
      purpose: "BADGE",
      amount: VERIFICATION_BADGE_FEE_KES,
      phone,
      status: "PENDING",
    },
  });

  try {
    const { checkoutRequestId, merchantRequestId } = await initiateStkPush({
      phone,
      amount: VERIFICATION_BADGE_FEE_KES,
      accountReference: provider.businessName,
      transactionDesc: "Verify",
    });
    await db.payment.update({
      where: { id: payment.id },
      data: { checkoutRequestId, merchantRequestId },
    });
  } catch (err) {
    await db.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", resultDesc: err instanceof Error ? err.message : "STK push failed." },
    });
    return { error: "Couldn't start the M-Pesa payment. Try again." };
  }

  return { success: true, paymentId: payment.id };
}
