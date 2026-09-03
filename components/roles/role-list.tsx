"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RoleFormModal, type RoleDto } from "./role-form-modal";
import { useAsyncAction } from "@/lib/use-async-action";
import type { ActionState } from "@/app/actions/types";

export function RoleList({
  roles,
  permissionCatalog,
  createAction,
  updateAction,
  deleteAction,
  onChanged,
}: {
  roles: RoleDto[];
  permissionCatalog: { key: string; label: string }[];
  createAction: (
    prevState: ActionState,
    formData: FormData,
  ) => Promise<ActionState>;
  updateAction: (
    roleId: string,
  ) => (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  deleteAction: (roleId: string) => Promise<ActionState>;
  onChanged: () => void;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RoleDto | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="outline"
        onClick={() => {
          setEditing(null);
          setFormOpen(true);
        }}
      >
        <Plus /> Create role
      </Button>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={3}
                className="py-4 text-center text-sm text-muted-foreground"
              >
                No roles yet.
              </TableCell>
            </TableRow>
          ) : (
            roles.map((role) => (
              <RoleRow
                key={role.id}
                role={role}
                permissionCatalog={permissionCatalog}
                deleteAction={deleteAction}
                onChanged={onChanged}
                onEdit={() => {
                  setEditing(role);
                  setFormOpen(true);
                }}
              />
            ))
          )}
        </TableBody>
      </Table>

      <RoleFormModal
        key={editing?.id ?? "create"}
        open={formOpen}
        onOpenChange={setFormOpen}
        role={editing}
        permissionCatalog={permissionCatalog}
        action={editing ? updateAction(editing.id) : createAction}
        onSaved={onChanged}
      />
    </div>
  );
}

function RoleRow({
  role,
  permissionCatalog,
  deleteAction,
  onChanged,
  onEdit,
}: {
  role: RoleDto;
  permissionCatalog: { key: string; label: string }[];
  deleteAction: (roleId: string) => Promise<ActionState>;
  onChanged: () => void;
  onEdit: () => void;
}) {
  const perms: string[] = JSON.parse(role.permissions);
  const [deleting, remove] = useAsyncAction(async () => {
    const result = await deleteAction(role.id);
    if (result.success) {
      toast.success("Role removed.");
      onChanged();
    } else if (result.error) {
      toast.error(result.error);
    }
  });

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {role.name}
          {role.isSystem && <Badge variant="outline">System</Badge>}
        </div>
      </TableCell>
      <TableCell className="whitespace-normal">
        <div className="flex flex-wrap gap-1">
          {perms.map((p) => (
            <Badge key={p} variant="secondary" className="text-xs">
              {permissionCatalog.find((c) => c.key === p)?.label ?? p}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon-sm" disabled={deleting} onClick={onEdit}>
            <Pencil />
          </Button>
          {!role.isSystem && (
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={deleting}
              onClick={() => remove()}
            >
              {deleting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Trash2 className="text-destructive" />
              )}
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
