"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPlatformPermission } from "@/lib/authz";
import { adAppearanceSchema } from "@/lib/validations";
import type { ActionState } from "@/app/actions/types";

export async function adminSetProviderActive(
  providerId: string,
  isActive: boolean,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };
  if (!(await hasPlatformPermission(session.user.id, "MANAGE_PROVIDERS"))) {
    return { error: "You don't have permission to moderate providers." };
  }

  const provider = await db.providerProfile.findUnique({
    where: { id: providerId },
  });
  if (!provider) return { error: "Provider not found." };

  await db.providerProfile.update({
    where: { id: providerId },
    data: { isActive },
  });

  revalidatePath("/");
  return { success: true };
}

export async function adminSetShopAdActive(
  adId: string,
  isActive: boolean,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };
  if (!(await hasPlatformPermission(session.user.id, "MANAGE_ADS"))) {
    return { error: "You don't have permission to moderate promotions." };
  }

  const ad = await db.shopAd.findUnique({ where: { id: adId } });
  if (!ad) return { error: "Promotion not found." };

  await db.shopAd.update({ where: { id: adId }, data: { isActive } });

  revalidatePath("/");
  return { success: true };
}

export async function adminSetAdActive(
  adId: string,
  isActive: boolean,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };
  if (!(await hasPlatformPermission(session.user.id, "MANAGE_ADS"))) {
    return { error: "You don't have permission to moderate ads." };
  }

  const ad = await db.brandAd.findUnique({ where: { id: adId } });
  if (!ad) return { error: "Ad not found." };

  await db.brandAd.update({ where: { id: adId }, data: { isActive } });

  revalidatePath("/");
  return { success: true };
}

// Lets moderators fix a light poster's illegible on-image text/CTA without
// asking the advertiser to resubmit — see components/ads/hero-banner.tsx.
export async function adminUpdateBrandAdAppearance(
  adId: string,
  textColor: string,
  ctaColor: string,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };
  if (!(await hasPlatformPermission(session.user.id, "MANAGE_ADS"))) {
    return { error: "You don't have permission to moderate ads." };
  }

  const parsed = adAppearanceSchema.safeParse({ textColor, ctaColor });
  if (!parsed.success) return { error: "Invalid appearance values." };

  const ad = await db.brandAd.findUnique({ where: { id: adId } });
  if (!ad) return { error: "Ad not found." };

  await db.brandAd.update({ where: { id: adId }, data: parsed.data });

  revalidatePath("/");
  return { success: true };
}
