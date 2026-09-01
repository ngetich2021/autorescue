"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RoleList } from "@/components/roles/role-list";
import { MemberList, type MemberDto } from "@/components/roles/member-list";
import { MemberInviteForm } from "@/components/roles/member-invite-form";
import type { RoleDto } from "@/components/roles/role-form-modal";
import { SHOP_PERMISSIONS, SHOP_PERMISSION_LABELS } from "@/lib/permissions";
import {
  createShopRole,
  updateShopRole,
  deleteShopRole,
  inviteShopMember,
  updateShopMemberRole,
  removeShopMember,
} from "@/app/actions/roles";

const PERMISSION_CATALOG = SHOP_PERMISSIONS.map((key) => ({
  key,
  label: SHOP_PERMISSION_LABELS[key],
}));

export function TeamModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [loading, startLoading] = useTransition();
  const [providerId, setProviderId] = useState<string | null>(null);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [members, setMembers] = useState<MemberDto[]>([]);

  async function load() {
    const res = await fetch("/api/shop/team");
    const data = res.ok ? await res.json() : null;
    if (data) {
      setProviderId(data.providerId);
      setRoles(data.roles ?? []);
      setMembers(data.members ?? []);
    } else {
      setProviderId(null);
    }
  }

  useEffect(() => {
    if (open) startLoading(load);
     
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Shop team</DialogTitle>
          <DialogDescription>
            Create roles and invite teammates to help manage this shop.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : !providerId ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            You don&apos;t have permission to manage this shop&apos;s team.
          </p>
        ) : (
          <Tabs defaultValue="members">
            <TabsList>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="roles">Roles</TabsTrigger>
            </TabsList>
            <TabsContent value="members" className="flex flex-col gap-3 pt-2">
              <MemberInviteForm
                roles={roles}
                action={inviteShopMember.bind(null, providerId)}
                onInvited={load}
              />
              <MemberList
                members={members}
                roles={roles}
                updateRoleAction={updateShopMemberRole}
                removeAction={removeShopMember}
                onChanged={load}
              />
            </TabsContent>
            <TabsContent value="roles" className="pt-2">
              <RoleList
                roles={roles}
                permissionCatalog={PERMISSION_CATALOG}
                createAction={createShopRole.bind(null, providerId)}
                updateAction={(roleId) => updateShopRole.bind(null, roleId)}
                deleteAction={deleteShopRole}
                onChanged={load}
              />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
