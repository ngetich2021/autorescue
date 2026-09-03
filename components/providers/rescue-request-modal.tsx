"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createRescueRequest } from "@/app/actions/rescue-request";
import { initialActionState } from "@/app/actions/types";
import { SERVICE_TYPE_LABELS, type ServiceType } from "@/lib/validations";

export function RescueRequestModal({
  open,
  onOpenChange,
  provider,
  location,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: { id: string; businessName: string; serviceTypes: string[] };
  location: { lat: number; lng: number };
}) {
  const [state, formAction, pending] = useActionState(
    createRescueRequest,
    initialActionState,
  );
  const [serviceType, setServiceType] = useState(
    provider.serviceTypes[0] ?? "OTHER",
  );

  useEffect(() => {
    if (state.success) {
      toast.success(
        `Request sent to ${provider.businessName}. They'll call you shortly.`,
      );
      onOpenChange(false);
    }
    if (state.error) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request rescue from {provider.businessName}</DialogTitle>
          <DialogDescription>
            Share your details so they can reach you. No account needed.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="providerId" value={provider.id} />
          <input type="hidden" name="serviceType" value={serviceType} />
          <input type="hidden" name="latitude" value={location.lat} />
          <input type="hidden" name="longitude" value={location.lng} />

          {provider.serviceTypes.length > 1 && (
            <div className="grid gap-1.5">
              <Label>What do you need?</Label>
              <Select
                value={serviceType}
                onValueChange={(value) => setServiceType(value ?? serviceType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string) => SERVICE_TYPE_LABELS[value as ServiceType] ?? value}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {provider.serviceTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {SERVICE_TYPE_LABELS[type as ServiceType] ?? type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="customerName">Your name</Label>
            <Input id="customerName" name="customerName" required />
            {state.fieldErrors?.customerName && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.customerName[0]}
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="customerPhone">Phone number</Label>
            <Input
              id="customerPhone"
              name="customerPhone"
              type="tel"
              inputMode="tel"
              pattern="[0-9+\-\s]{7,20}"
              title="Enter a valid phone number"
              maxLength={20}
              required
            />
            {state.fieldErrors?.customerPhone && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.customerPhone[0]}
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="description">What&apos;s going on? (optional)</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Sending…" : "Send request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
