"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateId } from "@/lib/id";
import { shopAdSchema } from "@/lib/validations";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { getMyShopId, hasShopPermission } from "@/lib/authz";
import type { ActionState } from "@/app/actions/types";

async function requireShopAdAccess(
  userId: string,
): Promise<{ providerId: string } | { error: string }> {
  const providerId = await getMyShopId(userId);
  if (!providerId) return { error: "Create your provider listing first." };
  const allowed = await hasShopPermission(userId, providerId, "MANAGE_PRODUCTS");
  if (!allowed) {
    return { error: "You don't have permission to manage this shop's ads." };
  }
  return { providerId };
}

function parseShopAd(formData: FormData) {
  return shopAdSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    productId: formData.get("productId"),
    radiusKm: formData.get("radiusKm") || undefined,
  });
}

export async function createShopAd(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const access = await requireShopAdAccess(session.user.id);
  if ("error" in access) return { error: access.error };

  const parsed = parseShopAd(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let imageUrl: string | null = null;
  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    imageUrl = await uploadImageToCloudinary(image, "shop-ads");
  }

  const { description, productId, ...rest } = parsed.data;
  await db.shopAd.create({
    data: {
      id: generateId(),
      providerId: access.providerId,
      description: description || null,
      productId: productId || null,
      imageUrl,
      ...rest,
    },
  });

  return { success: true };
}

export async function updateShopAd(
  adId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const access = await requireShopAdAccess(session.user.id);
  if ("error" in access) return { error: access.error };

  const existing = await db.shopAd.findFirst({
    where: { id: adId, providerId: access.providerId },
  });
  if (!existing) return { error: "Ad not found." };

  const parsed = parseShopAd(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let imageUrl = existing.imageUrl;
  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    imageUrl = await uploadImageToCloudinary(image, "shop-ads");
  }

  const { description, productId, title, radiusKm } = parsed.data;
  await db.shopAd.update({
    where: { id: adId },
    data: {
      title,
      description: description || null,
      productId: productId || null,
      imageUrl,
      radiusKm: radiusKm ?? null,
    },
  });

  return { success: true };
}

export async function deleteShopAd(adId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const access = await requireShopAdAccess(session.user.id);
  if ("error" in access) return { error: access.error };

  const existing = await db.shopAd.findFirst({
    where: { id: adId, providerId: access.providerId },
  });
  if (!existing) return { error: "Ad not found." };

  await db.shopAd.delete({ where: { id: adId } });
  return { success: true };
}

export async function toggleShopAdActive(
  adId: string,
  isActive: boolean,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const access = await requireShopAdAccess(session.user.id);
  if ("error" in access) return { error: access.error };

  const existing = await db.shopAd.findFirst({
    where: { id: adId, providerId: access.providerId },
  });
  if (!existing) return { error: "Ad not found." };

  await db.shopAd.update({ where: { id: adId }, data: { isActive } });
  return { success: true };
}
