import { db } from "@/lib/db";
import { generateId } from "@/lib/id";
import {
  PLATFORM_PERMISSIONS,
  SHOP_PERMISSIONS,
  type PlatformPermission,
  type ShopPermission,
} from "@/lib/permissions";

function parsePermissions(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ProviderProfile.serviceTypes is stored the same way as the permissions
// fields above: a JSON-encoded string array.
export function parseServiceTypes(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getPlatformPermissions(
  userId: string,
): Promise<Set<string>> {
  const member = await db.platformMember.findFirst({
    where: { userId, status: "ACTIVE" },
    include: { role: true },
  });
  if (!member) return new Set();
  return new Set(parsePermissions(member.role.permissions));
}

export async function hasPlatformPermission(
  userId: string,
  permission: PlatformPermission,
): Promise<boolean> {
  const perms = await getPlatformPermissions(userId);
  return perms.has(permission);
}

export async function isPlatformMember(userId: string): Promise<boolean> {
  const perms = await getPlatformPermissions(userId);
  return perms.size > 0;
}

export async function getShopPermissions(
  userId: string,
  providerId: string,
): Promise<Set<string>> {
  const provider = await db.providerProfile.findUnique({
    where: { id: providerId },
    select: { userId: true },
  });
  if (!provider) return new Set();
  if (provider.userId === userId) {
    return new Set(SHOP_PERMISSIONS);
  }

  const member = await db.shopMember.findFirst({
    where: { providerId, userId, status: "ACTIVE" },
    include: { role: true },
  });
  if (!member) return new Set();
  return new Set(parsePermissions(member.role.permissions));
}

export async function hasShopPermission(
  userId: string,
  providerId: string,
  permission: ShopPermission,
): Promise<boolean> {
  const perms = await getShopPermissions(userId, providerId);
  return perms.has(permission);
}

// Resolves which shop a user acts on: the shop they own, else the first shop
// they're an active member of. Returns null if neither applies.
export async function getMyShopId(userId: string): Promise<string | null> {
  const owned = await db.providerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (owned) return owned.id;

  const membership = await db.shopMember.findFirst({
    where: { userId, status: "ACTIVE" },
    select: { providerId: true },
    orderBy: { createdAt: "asc" },
  });
  return membership?.providerId ?? null;
}

const SUPER_ADMIN_ROLE_NAME = "Super Admin";

// Called from the NextAuth `signIn` event on every sign-in. Idempotent: safe to
// call for both brand-new and returning users.
export async function bootstrapOrReconcileUser(
  userId: string,
  email?: string | null,
) {
  const platformMemberCount = await db.platformMember.count();

  if (platformMemberCount === 0) {
    // The very first person to ever sign in becomes the platform's Super Admin.
    let superAdminRole = await db.platformRole.findFirst({
      where: { name: SUPER_ADMIN_ROLE_NAME },
    });
    if (!superAdminRole) {
      superAdminRole = await db.platformRole.create({
        data: {
          id: generateId(),
          name: SUPER_ADMIN_ROLE_NAME,
          permissions: JSON.stringify(PLATFORM_PERMISSIONS),
          isSystem: true,
        },
      });
    }
    if (email) {
      await db.platformMember.create({
        data: {
          id: generateId(),
          userId,
          inviteEmail: email,
          roleId: superAdminRole.id,
          status: "ACTIVE",
        },
      });
    }
    return;
  }

  if (!email) return;

  // Activate any pending platform invite for this email.
  const pendingPlatformInvite = await db.platformMember.findFirst({
    where: { inviteEmail: email, userId: null },
  });
  if (pendingPlatformInvite) {
    await db.platformMember.update({
      where: { id: pendingPlatformInvite.id },
      data: { userId, status: "ACTIVE" },
    });
  }

  // Activate any pending shop invites for this email.
  await db.shopMember.updateMany({
    where: { inviteEmail: email, userId: null },
    data: { userId, status: "ACTIVE" },
  });
}
