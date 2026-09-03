"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateId } from "@/lib/id";
import { serviceSchema } from "@/lib/validations";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { hasShopPermission } from "@/lib/authz";
import type { ActionState } from "@/app/actions/types";

// Same permission as products — a shop's itemized services are managed
// alongside its products, not a separate grant.
async function requireServiceAccess(
  userId: string,
  providerId: string,
): Promise<{ providerId: string } | { error: string }> {
  const allowed = await hasShopPermission(userId, providerId, "MANAGE_PRODUCTS");
  if (!allowed) {
    return { error: "You don't have permission to manage this shop's services." };
  }
  return { providerId };
}

function parseService(formData: FormData) {
  return serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    isAvailable: formData.get("isAvailable") === "on" ? "true" : "false",
  });
}

export async function createService(
  providerId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const access = await requireServiceAccess(session.user.id, providerId);
  if ("error" in access) return { error: access.error };

  const parsed = parseService(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let imageUrl: string | null = null;
  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    imageUrl = await uploadImageToCloudinary(image, "services");
  }

  const { description, ...rest } = parsed.data;
  await db.service.create({
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

export async function updateService(
  serviceId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const existing = await db.service.findUnique({ where: { id: serviceId } });
  if (!existing) return { error: "Service not found." };

  const access = await requireServiceAccess(session.user.id, existing.providerId);
  if ("error" in access) return { error: access.error };

  const parsed = parseService(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let imageUrl = existing.imageUrl;
  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    imageUrl = await uploadImageToCloudinary(image, "services");
  }

  const { description, ...rest } = parsed.data;
  await db.service.update({
    where: { id: serviceId },
    data: { description: description || null, imageUrl, ...rest },
  });

  return { success: true };
}

export async function deleteService(serviceId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const existing = await db.service.findUnique({ where: { id: serviceId } });
  if (!existing) return { error: "Service not found." };

  const access = await requireServiceAccess(session.user.id, existing.providerId);
  if ("error" in access) return { error: access.error };

  await db.service.delete({ where: { id: serviceId } });
  return { success: true };
}
