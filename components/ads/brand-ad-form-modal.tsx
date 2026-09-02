"use client";

import { useActionState, useEffect } from "react";
import { useSession } from "next-auth/react";
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
import { createBrandAd, updateBrandAd } from "@/app/actions/brand-ad";
import { initialActionState } from "@/app/actions/types";
import { BrandAdTargetingFields } from "./brand-ad-targeting-fields";

export type MyBrandAdDto = {
  id: string;
  title: string;
  productName: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  contactEmail: string;
  contactPhone: string;
  targetLatitude: number | null;
  targetLongitude: number | null;
  targetRadiusKm: number | null;
};

export function BrandAdFormModal({
  open,
  onOpenChange,
  ad,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ad: MyBrandAdDto | null;
  onSaved: () => void;
}) {
  const action = ad ? updateBrandAd.bind(null, ad.id) : createBrandAd;
  const [state, formAction, pending] = useActionState(
    action,
    initialActionState,
  );
  const { data: session } = useSession();

  useEffect(() => {
    if (state.success) {
      toast.success(ad ? "Ad updated." : "Ad created.");
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
          <DialogTitle>{ad ? "Edit ad" : "Create brand ad"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" defaultValue={ad?.title} required />
            {state.fieldErrors?.title && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.title[0]}
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="productName">Product name</Label>
            <Input
              id="productName"
              name="productName"
              placeholder="e.g. brake-boxer"
              defaultValue={ad?.productName}
              required
            />
            <p className="text-xs text-muted-foreground">
              Use a &ldquo;category-brand&rdquo; format (e.g. &ldquo;brake-boxer&rdquo;)
              — this is what &quot;Find nearby shops&quot; searches for across
              every shop&apos;s products.
            </p>
            {state.fieldErrors?.productName && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.productName[0]}
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={ad?.description ?? ""}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="image">
              Poster image{ad ? " (leave empty to keep current)" : ""}
            </Label>
            <Input
              id="image"
              name="image"
              type="file"
              accept="image/*"
              required={!ad?.imageUrl}
            />
            {state.fieldErrors?.image && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.image[0]}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="contactEmail">Contact email</Label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                defaultValue={ad?.contactEmail ?? session?.user?.email ?? ""}
                required
              />
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
                defaultValue={ad?.contactPhone}
                required
              />
              {state.fieldErrors?.contactPhone && (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.contactPhone[0]}
                </p>
              )}
            </div>
          </div>
          <BrandAdTargetingFields
            initial={
              ad?.targetLatitude != null &&
              ad?.targetLongitude != null &&
              ad?.targetRadiusKm != null
                ? {
                    targetLatitude: ad.targetLatitude,
                    targetLongitude: ad.targetLongitude,
                    targetRadiusKm: ad.targetRadiusKm,
                  }
                : null
            }
          />
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
