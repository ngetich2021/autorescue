"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateId } from "@/lib/id";
import { productSchema } from "@/lib/validations";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { getMyShopId, hasShopPermission } from "@/lib/authz";
import type { ActionState } from "@/app/actions/types";

// Resolves the shop this user manages and confirms they hold MANAGE_PRODUCTS
// (the owner always does; a team member needs the permission granted).
async function requireProductAccess(
  userId: string,
): Promise<{ providerId: string } | { error: string }> {
  const providerId = await getMyShopId(userId);
  if (!providerId) return { error: "Create your provider listing first." };
  const allowed = await hasShopPermission(userId, providerId, "MANAGE_PRODUCTS");
  if (!allowed) {
    return { error: "You don't have permission to manage this shop's products." };
  }
  return { providerId };
}

function parseProduct(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    inStock: formData.get("inStock") === "on" ? "true" : "false",
  });
}

export async function createProduct(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const access = await requireProductAccess(session.user.id);
  if ("error" in access) return { error: access.error };

  const parsed = parseProduct(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let imageUrl: string | null = null;
  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    imageUrl = await uploadImageToCloudinary(image, "products");
  }

  const { description, ...rest } = parsed.data;
  await db.product.create({
    data: {
      id: generateId(),
      providerId: access.providerId,
      description: description || null,
      imageUrl,
      ...rest,
    },
  });

  return { success: true };
}

export async function updateProduct(
  productId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const access = await requireProductAccess(session.user.id);
  if ("error" in access) return { error: access.error };

  const existing = await db.product.findFirst({
    where: { id: productId, providerId: access.providerId },
  });
  if (!existing) return { error: "Product not found." };

  const parsed = parseProduct(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let imageUrl = existing.imageUrl;
  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    imageUrl = await uploadImageToCloudinary(image, "products");
  }

  const { description, ...rest } = parsed.data;
  await db.product.update({
    where: { id: productId },
    data: { description: description || null, imageUrl, ...rest },
  });

  return { success: true };
}

export async function deleteProduct(productId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const access = await requireProductAccess(session.user.id);
  if ("error" in access) return { error: access.error };

  const existing = await db.product.findFirst({
    where: { id: productId, providerId: access.providerId },
  });
  if (!existing) return { error: "Product not found." };

  await db.product.delete({ where: { id: productId } });
  return { success: true };
}
