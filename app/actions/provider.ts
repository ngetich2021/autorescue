"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateId } from "@/lib/id";
import { providerProfileSchema } from "@/lib/validations";
import { hasShopPermission } from "@/lib/authz";
import type { ActionState } from "@/app/actions/types";

export type ProviderActionState = ActionState & { providerId?: string };

// `providerId` non-null edits that specific shop (the owner always has
// MANAGE_LISTING; a team member needs it granted). `providerId` null always
// creates a brand-new shop owned by the signed-in user — a user can own
// several, see lib/authz.ts#getMyShops.
export async function upsertProviderProfile(
  providerId: string | null,
  _prevState: ProviderActionState,
  formData: FormData,
): Promise<ProviderActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "You must be signed in." };
  }

  if (providerId) {
    const allowed = await hasShopPermission(
      session.user.id,
      providerId,
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

  let id = providerId;
  if (id) {
    await db.providerProfile.update({ where: { id }, data });
  } else {
    id = generateId();
    await db.providerProfile.create({
      data: { id, userId: session.user.id, ...data },
    });
  }

  revalidatePath("/");
  return { success: true, providerId: id };
}

// Deletion is irreversible, so this requires actual ownership (not just the
// MANAGE_LISTING grant a team member could hold).
export async function deleteProviderProfile(providerId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "You must be signed in." };
  }

  const profile = await db.providerProfile.findUnique({
    where: { id: providerId },
  });
  if (!profile || profile.userId !== session.user.id) {
    return { error: "No provider listing found." };
  }

  await db.providerProfile.delete({ where: { id: profile.id } });

  revalidatePath("/");
  return { success: true };
}
