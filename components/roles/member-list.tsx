"use client";

import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAsyncAction } from "@/lib/use-async-action";
import type { ActionState } from "@/app/actions/types";

export type MemberDto = {
  id: string;
  inviteEmail: string;
  status: string;
  roleId: string;
  role: { id: string; name: string };
  user: { name: string | null; email: string | null } | null;
};

export function MemberList({
  members,
  roles,
  updateRoleAction,
  removeAction,
  onChanged,
}: {
  members: MemberDto[];
  roles: { id: string; name: string }[];
  updateRoleAction: (memberId: string, roleId: string) => Promise<ActionState>;
  removeAction: (memberId: string) => Promise<ActionState>;
  onChanged: () => void;
}) {
  if (members.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No one here yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {members.map((member) => (
        <MemberRow
          key={member.id}
          member={member}
          roles={roles}
          updateRoleAction={updateRoleAction}
          removeAction={removeAction}
          onChanged={onChanged}
        />
      ))}
    </div>
  );
}

function MemberRow({
  member,
  roles,
  updateRoleAction,
  removeAction,
  onChanged,
}: {
  member: MemberDto;
  roles: { id: string; name: string }[];
  updateRoleAction: (memberId: string, roleId: string) => Promise<ActionState>;
  removeAction: (memberId: string) => Promise<ActionState>;
  onChanged: () => void;
}) {
  const [roleChanging, changeRole] = useAsyncAction(async (roleId: string) => {
    const result = await updateRoleAction(member.id, roleId);
    if (result.success) onChanged();
    else if (result.error) toast.error(result.error);
  });

  const [removing, remove] = useAsyncAction(async () => {
    const result = await removeAction(member.id);
    if (result.success) {
      toast.success("Removed.");
      onChanged();
    } else if (result.error) {
      toast.error(result.error);
    }
  });

  const busy = roleChanging || removing;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">
          {member.user?.name ?? member.inviteEmail}
        </span>
        <span className="text-xs text-muted-foreground">
          {member.inviteEmail}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {member.status === "PENDING" && (
          <Badge variant="outline">Pending</Badge>
        )}
        <Select
          value={member.roleId}
          onValueChange={(value) => value && changeRole(value)}
          disabled={busy}
        >
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={busy}
          onClick={() => remove()}
        >
          {removing ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Trash2 className="text-destructive" />
          )}
        </Button>
      </div>
    </div>
  );
}
