"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateId } from "@/lib/id";
import { providerProfileSchema } from "@/lib/validations";
import { getMyShopId, hasShopPermission } from "@/lib/authz";
import type { ActionState } from "@/app/actions/types";

// If the signed-in user already has a shop context (they own one, or are a
// team member with MANAGE_LISTING), this edits that shop. Otherwise it
// creates a brand-new shop owned by them.
export async function upsertProviderProfile(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "You must be signed in." };
  }

  const existingId = await getMyShopId(session.user.id);
  if (existingId) {
    const allowed = await hasShopPermission(
      session.user.id,
      existingId,
      "MANAGE_LISTING",
    );
    if (!allowed) {
      return { error: "You don't have permission to edit this listing." };
    }
  }

  let serviceTypes: unknown;
  try {
    serviceTypes = JSON.parse(String(formData.get("serviceTypes") ?? "[]"));
  } catch {
    serviceTypes = [];
  }

  const parsed = providerProfileSchema.safeParse({
    businessName: formData.get("businessName"),
    serviceTypes,
    phone: formData.get("phone"),
    email: formData.get("email"),
    description: formData.get("description"),
    address: formData.get("address"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { description, address, serviceTypes: types, ...rest } = parsed.data;
  const data = {
    description: description || null,
    address: address || null,
    serviceTypes: JSON.stringify(types),
    ...rest,
  };

  if (existingId) {
    await db.providerProfile.update({ where: { id: existingId }, data });
  } else {
    await db.providerProfile.create({
      data: { id: generateId(), userId: session.user.id, ...data },
    });
  }

  revalidatePath("/");
  return { success: true };
}

export async function deleteProviderProfile(): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "You must be signed in." };
  }

  const profile = await db.providerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) {
    return { error: "No provider listing found." };
  }

  await db.providerProfile.delete({ where: { id: profile.id } });

  revalidatePath("/");
  return { success: true };
}
