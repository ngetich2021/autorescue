"use client";

import { useActionState, useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createShopAd, updateShopAd } from "@/app/actions/shop-ad";
import { initialActionState } from "@/app/actions/types";
import { parseRadiusKm } from "@/lib/validations";

export type MyShopAdDto = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  productId: string | null;
  isActive: boolean;
  radiusKm: number | null;
  expiresAt: string | Date | null;
};

export function ShopAdFormModal({
  open,
  onOpenChange,
  ad,
  products,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ad: MyShopAdDto | null;
  products: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const action = ad ? updateShopAd.bind(null, ad.id) : createShopAd;
  const [state, formAction, pending] = useActionState(
    action,
    initialActionState,
  );
  const [productId, setProductId] = useState(ad?.productId ?? "");
  const [radiusRaw, setRadiusRaw] = useState(
    ad?.radiusKm != null ? String(ad.radiusKm) : "",
  );
  const [radiusError, setRadiusError] = useState<string | null>(null);

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
          <DialogTitle>{ad ? "Edit promo" : "Promote a product"}</DialogTitle>
        </DialogHeader>
        <form
          action={formAction}
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            if (radiusRaw.trim()) {
              const result = parseRadiusKm(radiusRaw, { min: 1, max: 500 });
              if ("error" in result) {
                e.preventDefault();
                setRadiusError(result.error);
              }
            }
          }}
        >
          <input type="hidden" name="productId" value={productId} />
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
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={ad?.description ?? ""}
            />
          </div>
          {products.length > 0 && (
            <div className="grid gap-1.5">
              <Label>Link to a product (optional)</Label>
              <Select
                value={productId || undefined}
                onValueChange={(value) => setProductId(value ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No linked product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="image">
              Photo {ad?.imageUrl ? "(leave empty to keep current)" : "(optional)"}
            </Label>
            <Input id="image" name="image" type="file" accept="image/*" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="radiusKm">
              Radius in km (leave empty to show to everyone who opens your shop)
            </Label>
            <Input
              id="radiusKm"
              name="radiusKm"
              value={radiusRaw}
              onChange={(e) => {
                setRadiusRaw(e.target.value);
                setRadiusError(null);
              }}
              placeholder="e.g. 10"
              inputMode="decimal"
            />
            {radiusError && (
              <p className="text-xs text-destructive">{radiusError}</p>
            )}
            {state.fieldErrors?.radiusKm && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.radiusKm[0]}
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
