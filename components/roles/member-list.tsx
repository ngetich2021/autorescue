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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={5}
              className="py-4 text-center text-sm text-muted-foreground"
            >
              No one here yet.
            </TableCell>
          </TableRow>
        ) : (
          members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              roles={roles}
              updateRoleAction={updateRoleAction}
              removeAction={removeAction}
              onChanged={onChanged}
            />
          ))
        )}
      </TableBody>
    </Table>
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
    <TableRow>
      <TableCell className="font-medium">
        {member.user?.name ?? "—"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {member.inviteEmail}
      </TableCell>
      <TableCell>
        {member.status === "PENDING" ? (
          <Badge variant="outline">Pending</Badge>
        ) : (
          <Badge variant="secondary">Active</Badge>
        )}
      </TableCell>
      <TableCell>
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
      </TableCell>
      <TableCell className="text-right">
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
      </TableCell>
    </TableRow>
  );
}
