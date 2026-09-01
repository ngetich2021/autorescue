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
import { Textarea } from "@/components/ui/textarea";
import { createService, updateService } from "@/app/actions/service";
import { initialActionState } from "@/app/actions/types";

export type MyServiceDto = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
};

export function ServiceFormModal({
  open,
  onOpenChange,
  service,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: MyServiceDto | null;
  onSaved: () => void;
}) {
  const action = service
    ? updateService.bind(null, service.id)
    : createService;
  const [state, formAction, pending] = useActionState(
    action,
    initialActionState,
  );

  useEffect(() => {
    if (state.success) {
      toast.success(service ? "Service updated." : "Service added.");
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
          <DialogTitle>{service ? "Edit service" : "Add service"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={service?.name} required />
            {state.fieldErrors?.name && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.name[0]}
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={service?.description ?? ""}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="price">Price (KES)</Label>
            <Input
              id="price"
              name="price"
              type="number"
              min={1}
              defaultValue={service?.price}
              required
            />
            {state.fieldErrors?.price && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.price[0]}
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="image">
              Photo{" "}
              {service?.imageUrl ? "(leave empty to keep current)" : "(optional)"}
            </Label>
            <Input id="image" name="image" type="file" accept="image/*" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isAvailable"
              defaultChecked={service?.isAvailable ?? true}
              className="size-4"
            />
            Available
          </label>
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
