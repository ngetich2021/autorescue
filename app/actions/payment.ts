"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateId } from "@/lib/id";
import { hasShopPermission } from "@/lib/authz";
import { formatMpesaPhone, initiateStkPush } from "@/lib/mpesa";
import {
  promotionPaymentSchema,
  badgePaymentSchema,
  PROMOTION_LOCAL_RATE_KES,
  PROMOTION_UNIVERSAL_RATE_KES,
  VERIFICATION_BADGE_RATE_KES,
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

  const shopAd = await db.shopAd.findUnique({
    where: { id: parsed.data.shopAdId },
  });
  if (!shopAd) return { error: "Promotion not found." };
  const providerId = shopAd.providerId;
  if (!(await hasShopPermission(session.user.id, providerId, "MANAGE_PRODUCTS"))) {
    return { error: "You don't have permission to manage this shop's promotions." };
  }

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

// Starts an STK push for the verification badge — KES 20/day, lifting the
// shop out of the 100m unverified visibility cap for as long as it stays
// paid up. Days stack onto whatever's left (app/api/mpesa/callback/route.ts),
// same as a promotion, so this doubles as the "renew" flow too.
export async function initiateBadgePayment(
  _prevState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const parsed = badgePaymentSchema.safeParse({
    providerId: formData.get("providerId"),
    days: formData.get("days"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { providerId } = parsed.data;

  if (!(await hasShopPermission(session.user.id, providerId, "MANAGE_LISTING"))) {
    return { error: "You don't have permission to manage this shop's listing." };
  }

  const provider = await db.providerProfile.findUnique({ where: { id: providerId } });
  if (!provider) return { error: "Shop not found." };

  const phone = formatMpesaPhone(parsed.data.phone);
  if (!phone) return { error: "Enter a valid Kenyan M-Pesa number." };

  const amount = VERIFICATION_BADGE_RATE_KES * parsed.data.days;

  const payment = await db.payment.create({
    data: {
      id: generateId(),
      providerId,
      purpose: "BADGE",
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
