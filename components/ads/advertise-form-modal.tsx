"use client";

import { useActionState, useEffect } from "react";
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
import { submitPublicBrandAd } from "@/app/actions/brand-ad";
import { initialActionState } from "@/app/actions/types";
import { BrandAdTargetingFields } from "./brand-ad-targeting-fields";

export function AdvertiseFormModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(
    submitPublicBrandAd,
    initialActionState,
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Thanks! Your ad is in review and will go live once approved.");
      onOpenChange(false);
    }
    if (state.error) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Advertise with AutoRescue</DialogTitle>
          <DialogDescription>
            No account needed. Submit your ad and we&apos;ll review it before it
            goes live.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="advertiserName">Your name / brand</Label>
            <Input id="advertiserName" name="advertiserName" required />
            {state.fieldErrors?.advertiserName && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.advertiserName[0]}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="contactEmail">Contact email</Label>
              <Input id="contactEmail" name="contactEmail" type="email" required />
              {state.fieldErrors?.contactEmail && (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.contactEmail[0]}
                </p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="contactPhone">Contact phone</Label>
              <Input
                id="contactPhone"
                name="contactPhone"
                type="tel"
                inputMode="tel"
                pattern="[0-9+\-\s]{7,20}"
                title="Enter a valid phone number"
                maxLength={20}
                required
              />
              {state.fieldErrors?.contactPhone && (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.contactPhone[0]}
                </p>
              )}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="title">Ad title</Label>
            <Input id="title" name="title" required />
            {state.fieldErrors?.title && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.title[0]}
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="productName">Product name</Label>
            <Input id="productName" name="productName" placeholder="e.g. Skygo Oil" required />
            <p className="text-xs text-muted-foreground">
              The exact item name — this is what &quot;Find nearby shops&quot;
              searches for across every shop&apos;s products.
            </p>
            {state.fieldErrors?.productName && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.productName[0]}
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" name="description" rows={2} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="image">Poster image</Label>
            <Input id="image" name="image" type="file" accept="image/*" required />
            {state.fieldErrors?.image && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.image[0]}
              </p>
            )}
          </div>
          <BrandAdTargetingFields initial={null} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Submitting…" : "Submit for review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
