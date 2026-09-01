"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState, type ActionState } from "@/app/actions/types";

export type RoleDto = {
  id: string;
  name: string;
  permissions: string; // JSON-encoded string[]
  isSystem: boolean;
};

export function RoleFormModal({
  open,
  onOpenChange,
  role,
  permissionCatalog,
  action,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleDto | null;
  permissionCatalog: { key: string; label: string }[];
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialActionState,
  );
  const currentPermissions: string[] = role
    ? (JSON.parse(role.permissions) as string[])
    : [];

  useEffect(() => {
    if (state.success) {
      toast.success(role ? "Role updated." : "Role created.");
      onOpenChange(false);
      onSaved();
    }
    if (state.error) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{role ? "Edit role" : "Create role"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Role name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={role?.name}
              required
              disabled={role?.isSystem}
            />
            {state.fieldErrors?.name && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.name[0]}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Permissions</Label>
            {permissionCatalog.map((perm) => (
              <label
                key={perm.key}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="permissions"
                  value={perm.key}
                  defaultChecked={currentPermissions.includes(perm.key)}
                  className="size-4"
                />
                {perm.label}
              </label>
            ))}
            {state.fieldErrors?.permissions && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.permissions[0]}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
