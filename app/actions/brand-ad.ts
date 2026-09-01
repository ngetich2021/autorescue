"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateId } from "@/lib/id";
import { brandAdSchema, publicBrandAdSchema } from "@/lib/validations";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import type { ActionState } from "@/app/actions/types";

function targetingFromFormData(formData: FormData) {
  return {
    targetLatitude: formData.get("targetLatitude") || undefined,
    targetLongitude: formData.get("targetLongitude") || undefined,
    targetRadiusKm: formData.get("targetRadiusKm") || undefined,
  };
}

function parseBrandAd(formData: FormData) {
  return brandAdSchema.safeParse({
    title: formData.get("title"),
    productName: formData.get("productName"),
    description: formData.get("description"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
    bgColor: formData.get("bgColor") || undefined,
    ...targetingFromFormData(formData),
  });
}

// A poster image is mandatory — every ad is shown as a photo banner in the
// hero carousel (components/ads/hero-banner.tsx), never as a text-only card.
function getImageFile(formData: FormData): File | null {
  const image = formData.get("image");
  return image instanceof File && image.size > 0 ? image : null;
}

export async function createBrandAd(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const parsed = parseBrandAd(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const image = getImageFile(formData);
  if (!image) {
    return { fieldErrors: { image: ["A poster image is required."] } };
  }
  const imageUrl = await uploadImageToCloudinary(image, "brand-ads");

  const { description, ...rest } = parsed.data;
  await db.brandAd.create({
    data: {
      id: generateId(),
      userId: session.user.id,
      description: description || null,
      imageUrl,
      ...rest,
    },
  });

  revalidatePath("/");
  return { success: true };
}

// No sign-in required: a brand advertising with AutoRescue doesn't need an
// account. Lands inactive pending admin review (MANAGE_ADS) since nobody
// vouches for an anonymous submission.
export async function submitPublicBrandAd(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = publicBrandAdSchema.safeParse({
    title: formData.get("title"),
    productName: formData.get("productName"),
    description: formData.get("description"),
    advertiserName: formData.get("advertiserName"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
    bgColor: formData.get("bgColor") || undefined,
    ...targetingFromFormData(formData),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const image = getImageFile(formData);
  if (!image) {
    return { fieldErrors: { image: ["A poster image is required."] } };
  }
  const imageUrl = await uploadImageToCloudinary(image, "brand-ads");

  const { description, ...rest } = parsed.data;
  await db.brandAd.create({
    data: {
      id: generateId(),
      userId: null,
      description: description || null,
      imageUrl,
      isActive: false,
      ...rest,
    },
  });

  return { success: true };
}

export async function updateBrandAd(
  adId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const existing = await db.brandAd.findFirst({
    where: { id: adId, userId: session.user.id },
  });
  if (!existing) return { error: "Ad not found." };

  const parsed = parseBrandAd(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const image = getImageFile(formData);
  const imageUrl = image
    ? await uploadImageToCloudinary(image, "brand-ads")
    : existing.imageUrl;
  if (!imageUrl) {
    return { fieldErrors: { image: ["A poster image is required."] } };
  }

  const {
    description,
    title,
    productName,
    contactEmail,
    contactPhone,
    bgColor,
    targetLatitude,
    targetLongitude,
    targetRadiusKm,
  } = parsed.data;
  await db.brandAd.update({
    where: { id: adId },
    data: {
      title,
      productName,
      description: description || null,
      imageUrl,
      bgColor,
      contactEmail,
      contactPhone,
      targetLatitude: targetLatitude ?? null,
      targetLongitude: targetLongitude ?? null,
      targetRadiusKm: targetRadiusKm ?? null,
    },
  });

  revalidatePath("/");
  return { success: true };
}

export async function deleteBrandAd(adId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const existing = await db.brandAd.findFirst({
    where: { id: adId, userId: session.user.id },
  });
  if (!existing) return { error: "Ad not found." };

  await db.brandAd.delete({ where: { id: adId } });
  revalidatePath("/");
  return { success: true };
}

export async function toggleBrandAdActive(
  adId: string,
  isActive: boolean,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const existing = await db.brandAd.findFirst({
    where: { id: adId, userId: session.user.id },
  });
  if (!existing) return { error: "Ad not found." };

  await db.brandAd.update({ where: { id: adId }, data: { isActive } });
  revalidatePath("/");
  return { success: true };
}
