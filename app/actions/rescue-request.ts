"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateId } from "@/lib/id";
import {
  rescueRequestSchema,
  updateRequestStatusSchema,
} from "@/lib/validations";
import { getMyShopId, hasShopPermission } from "@/lib/authz";
import type { ActionState } from "@/app/actions/types";

// Intentionally no auth check: a stranded driver never has to sign in to ask
// for help. Ownership of the target provider is irrelevant here — anyone may
// request any active provider — but we still re-validate the provider exists
// server-side rather than trusting the client's copy of it.
export async function createRescueRequest(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = rescueRequestSchema.safeParse({
    providerId: formData.get("providerId"),
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    description: formData.get("description"),
    serviceType: formData.get("serviceType"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const provider = await db.providerProfile.findUnique({
    where: { id: parsed.data.providerId },
  });
  if (!provider || !provider.isActive) {
    return { error: "This provider is no longer available." };
  }

  const { description, ...rest } = parsed.data;
  await db.rescueRequest.create({
    data: { id: generateId(), ...rest, description: description || null },
  });

  return { success: true };
}

// For a status Select in a table row — see components/shops/shop-manage-dashboard.tsx.
export async function setRequestStatus(
  requestId: string,
  status: string,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const parsed = updateRequestStatusSchema.safeParse({ requestId, status });
  if (!parsed.success) {
    return { error: "Invalid status." };
  }

  const providerId = await getMyShopId(session.user.id);
  if (!providerId) return { error: "Create your provider listing first." };
  if (!(await hasShopPermission(session.user.id, providerId, "MANAGE_REQUESTS"))) {
    return { error: "You don't have permission to manage this shop's requests." };
  }

  const request = await db.rescueRequest.findFirst({
    where: { id: parsed.data.requestId, providerId },
  });
  if (!request) return { error: "Request not found." };

  await db.rescueRequest.update({
    where: { id: parsed.data.requestId },
    data: { status: parsed.data.status },
  });

  revalidatePath("/");
  return { success: true };
}
