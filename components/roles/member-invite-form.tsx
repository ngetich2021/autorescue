"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { initialActionState, type ActionState } from "@/app/actions/types";

export function MemberInviteForm({
  roles,
  action,
  onInvited,
}: {
  roles: { id: string; name: string }[];
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  onInvited: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialActionState,
  );
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");

  useEffect(() => {
    if (state.success) {
      toast.success("Invited.");
      onInvited();
    }
    if (state.error) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (roles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Create a role first before inviting someone.
      </p>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-end"
    >
      <input type="hidden" name="roleId" value={roleId} />
      <div className="grid flex-1 gap-1.5">
        <Label htmlFor="invite-email">Invite by email</Label>
        <Input
          id="invite-email"
          name="email"
          type="email"
          placeholder="teammate@example.com"
          required
        />
        {state.fieldErrors?.email && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.email[0]}
          </p>
        )}
      </div>
      <div className="grid gap-1.5">
        <Label>Role</Label>
        <Select
          value={roleId}
          onValueChange={(value) => setRoleId(value ?? roleId)}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue>
              {(value: string) => roles.find((r) => r.id === value)?.name ?? value}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Inviting…" : "Invite"}
      </Button>
    </form>
  );
}
