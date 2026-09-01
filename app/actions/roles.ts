"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateId } from "@/lib/id";
import { hasPlatformPermission, hasShopPermission } from "@/lib/authz";
import { roleFormSchema, inviteMemberSchema } from "@/lib/validations";
import {
  PLATFORM_PERMISSIONS,
  SHOP_PERMISSIONS,
  type PlatformPermission,
  type ShopPermission,
} from "@/lib/permissions";
import type { ActionState } from "@/app/actions/types";

function parseRoleForm(formData: FormData) {
  return roleFormSchema.safeParse({
    name: formData.get("name"),
    permissions: formData.getAll("permissions"),
  });
}

function parseInviteForm(formData: FormData) {
  return inviteMemberSchema.safeParse({
    email: formData.get("email"),
    roleId: formData.get("roleId"),
  });
}

// --- Platform roles & staff -------------------------------------------------

export async function createPlatformRole(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };
  if (!(await hasPlatformPermission(session.user.id, "MANAGE_ROLES"))) {
    return { error: "You don't have permission to manage admin roles." };
  }

  const parsed = parseRoleForm(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const permissions = parsed.data.permissions.filter((p): p is PlatformPermission =>
    (PLATFORM_PERMISSIONS as readonly string[]).includes(p),
  );
  if (permissions.length === 0) {
    return { fieldErrors: { permissions: ["Select at least one permission."] } };
  }

  const existing = await db.platformRole.findFirst({
    where: { name: parsed.data.name },
  });
  if (existing) {
    return { fieldErrors: { name: ["A role with this name already exists."] } };
  }

  await db.platformRole.create({
    data: {
      id: generateId(),
      name: parsed.data.name,
      permissions: JSON.stringify(permissions),
    },
  });

  revalidatePath("/");
  return { success: true };
}

export async function updatePlatformRole(
  roleId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };
  if (!(await hasPlatformPermission(session.user.id, "MANAGE_ROLES"))) {
    return { error: "You don't have permission to manage admin roles." };
  }

  const role = await db.platformRole.findUnique({ where: { id: roleId } });
  if (!role) return { error: "Role not found." };

  const parsed = parseRoleForm(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const permissions = parsed.data.permissions.filter((p): p is PlatformPermission =>
    (PLATFORM_PERMISSIONS as readonly string[]).includes(p),
  );
  if (permissions.length === 0) {
    return { fieldErrors: { permissions: ["Select at least one permission."] } };
  }

  const duplicate = await db.platformRole.findFirst({
    where: { name: parsed.data.name, NOT: { id: roleId } },
  });
  if (duplicate) {
    return { fieldErrors: { name: ["A role with this name already exists."] } };
  }

  await db.platformRole.update({
    where: { id: roleId },
    data: { name: parsed.data.name, permissions: JSON.stringify(permissions) },
  });

  revalidatePath("/");
  return { success: true };
}

export async function deletePlatformRole(roleId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };
  if (!(await hasPlatformPermission(session.user.id, "MANAGE_ROLES"))) {
    return { error: "You don't have permission to manage admin roles." };
  }

  const role = await db.platformRole.findUnique({
    where: { id: roleId },
    include: { _count: { select: { members: true } } },
  });
  if (!role) return { error: "Role not found." };
  if (role.isSystem) return { error: "The Super Admin role can't be deleted." };
  if (role._count.members > 0) {
    return { error: "Reassign or remove staff on this role before deleting it." };
  }

  await db.platformRole.delete({ where: { id: roleId } });
  return { success: true };
}

export async function invitePlatformMember(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };
  if (!(await hasPlatformPermission(session.user.id, "MANAGE_ROLES"))) {
    return { error: "You don't have permission to manage admin staff." };
  }

  const parsed = parseInviteForm(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const role = await db.platformRole.findUnique({
    where: { id: parsed.data.roleId },
  });
  if (!role) return { error: "Role not found." };

  const existing = await db.platformMember.findUnique({
    where: { inviteEmail: parsed.data.email },
  });
  if (existing) {
    return { fieldErrors: { email: ["This person is already platform staff."] } };
  }

  const existingUser = await db.user.findUnique({
    where: { email: parsed.data.email },
  });

  await db.platformMember.create({
    data: {
      id: generateId(),
      inviteEmail: parsed.data.email,
      roleId: role.id,
      userId: existingUser?.id,
      status: existingUser ? "ACTIVE" : "PENDING",
    },
  });

  revalidatePath("/");
  return { success: true };
}

export async function updatePlatformMemberRole(
  memberId: string,
  roleId: string,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };
  if (!(await hasPlatformPermission(session.user.id, "MANAGE_ROLES"))) {
    return { error: "You don't have permission to manage admin staff." };
  }

  const [member, role] = await Promise.all([
    db.platformMember.findUnique({ where: { id: memberId } }),
    db.platformRole.findUnique({ where: { id: roleId } }),
  ]);
  if (!member) return { error: "Staff member not found." };
  if (!role) return { error: "Role not found." };

  await db.platformMember.update({ where: { id: memberId }, data: { roleId } });
  return { success: true };
}

export async function removePlatformMember(memberId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };
  if (!(await hasPlatformPermission(session.user.id, "MANAGE_ROLES"))) {
    return { error: "You don't have permission to manage admin staff." };
  }

  const totalMembers = await db.platformMember.count();
  if (totalMembers <= 1) {
    return { error: "Can't remove the last platform admin." };
  }

  const member = await db.platformMember.findUnique({ where: { id: memberId } });
  if (!member) return { error: "Staff member not found." };

  await db.platformMember.delete({ where: { id: memberId } });
  return { success: true };
}

// --- Shop roles & team -------------------------------------------------

export async function createShopRole(
  providerId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };
  if (!(await hasShopPermission(session.user.id, providerId, "MANAGE_TEAM"))) {
    return { error: "You don't have permission to manage this shop's team." };
  }

  const parsed = parseRoleForm(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const permissions = parsed.data.permissions.filter((p): p is ShopPermission =>
    (SHOP_PERMISSIONS as readonly string[]).includes(p),
  );
  if (permissions.length === 0) {
    return { fieldErrors: { permissions: ["Select at least one permission."] } };
  }

  const existing = await db.shopRole.findFirst({
    where: { providerId, name: parsed.data.name },
  });
  if (existing) {
    return { fieldErrors: { name: ["A role with this name already exists."] } };
  }

  await db.shopRole.create({
    data: {
      id: generateId(),
      providerId,
      name: parsed.data.name,
      permissions: JSON.stringify(permissions),
    },
  });

  return { success: true };
}

export async function updateShopRole(
  roleId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const role = await db.shopRole.findUnique({ where: { id: roleId } });
  if (!role) return { error: "Role not found." };
  if (!(await hasShopPermission(session.user.id, role.providerId, "MANAGE_TEAM"))) {
    return { error: "You don't have permission to manage this shop's team." };
  }

  const parsed = parseRoleForm(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const permissions = parsed.data.permissions.filter((p): p is ShopPermission =>
    (SHOP_PERMISSIONS as readonly string[]).includes(p),
  );
  if (permissions.length === 0) {
    return { fieldErrors: { permissions: ["Select at least one permission."] } };
  }

  const duplicate = await db.shopRole.findFirst({
    where: { providerId: role.providerId, name: parsed.data.name, NOT: { id: roleId } },
  });
  if (duplicate) {
    return { fieldErrors: { name: ["A role with this name already exists."] } };
  }

  await db.shopRole.update({
    where: { id: roleId },
    data: { name: parsed.data.name, permissions: JSON.stringify(permissions) },
  });

  return { success: true };
}

export async function deleteShopRole(roleId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const role = await db.shopRole.findUnique({
    where: { id: roleId },
    include: { _count: { select: { members: true } } },
  });
  if (!role) return { error: "Role not found." };
  if (!(await hasShopPermission(session.user.id, role.providerId, "MANAGE_TEAM"))) {
    return { error: "You don't have permission to manage this shop's team." };
  }
  if (role._count.members > 0) {
    return { error: "Reassign or remove teammates on this role before deleting it." };
  }

  await db.shopRole.delete({ where: { id: roleId } });
  return { success: true };
}

export async function inviteShopMember(
  providerId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };
  if (!(await hasShopPermission(session.user.id, providerId, "MANAGE_TEAM"))) {
    return { error: "You don't have permission to manage this shop's team." };
  }

  const parsed = parseInviteForm(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const provider = await db.providerProfile.findUnique({
    where: { id: providerId },
    include: { user: { select: { email: true } } },
  });
  if (!provider) return { error: "Shop not found." };
  if (provider.user.email === parsed.data.email) {
    return { fieldErrors: { email: ["This person already owns the shop."] } };
  }

  const role = await db.shopRole.findFirst({
    where: { id: parsed.data.roleId, providerId },
  });
  if (!role) return { error: "Role not found." };

  const existing = await db.shopMember.findUnique({
    where: { providerId_inviteEmail: { providerId, inviteEmail: parsed.data.email } },
  });
  if (existing) {
    return { fieldErrors: { email: ["This person is already on the team."] } };
  }

  const existingUser = await db.user.findUnique({
    where: { email: parsed.data.email },
  });

  await db.shopMember.create({
    data: {
      id: generateId(),
      providerId,
      inviteEmail: parsed.data.email,
      roleId: role.id,
      userId: existingUser?.id,
      status: existingUser ? "ACTIVE" : "PENDING",
    },
  });

  return { success: true };
}

export async function updateShopMemberRole(
  memberId: string,
  roleId: string,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const member = await db.shopMember.findUnique({ where: { id: memberId } });
  if (!member) return { error: "Team member not found." };
  if (!(await hasShopPermission(session.user.id, member.providerId, "MANAGE_TEAM"))) {
    return { error: "You don't have permission to manage this shop's team." };
  }

  const role = await db.shopRole.findFirst({
    where: { id: roleId, providerId: member.providerId },
  });
  if (!role) return { error: "Role not found." };

  await db.shopMember.update({ where: { id: memberId }, data: { roleId } });
  return { success: true };
}

export async function removeShopMember(memberId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const member = await db.shopMember.findUnique({ where: { id: memberId } });
  if (!member) return { error: "Team member not found." };
  if (!(await hasShopPermission(session.user.id, member.providerId, "MANAGE_TEAM"))) {
    return { error: "You don't have permission to manage this shop's team." };
  }

  await db.shopMember.delete({ where: { id: memberId } });
  return { success: true };
}
