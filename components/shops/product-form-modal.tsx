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
import { createProduct, updateProduct } from "@/app/actions/product";
import { initialActionState } from "@/app/actions/types";

export type MyProductDto = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  quantity: number;
};

export function ProductFormModal({
  open,
  onOpenChange,
  product,
  providerId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: MyProductDto | null;
  providerId: string;
  onSaved: () => void;
}) {
  const action = product
    ? updateProduct.bind(null, product.id)
    : createProduct.bind(null, providerId);
  const [state, formAction, pending] = useActionState(
    action,
    initialActionState,
  );

  useEffect(() => {
    if (state.success) {
      toast.success(product ? "Product updated." : "Product added.");
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
          <DialogTitle>{product ? "Edit product" : "Add product"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={product?.name}
              placeholder="e.g. brake-boxer"
              required
            />
            <p className="text-xs text-muted-foreground">
              Use a &ldquo;category-brand&rdquo; format (e.g. &ldquo;brake-boxer&rdquo;)
              so customers searching by category or brand can find it.
            </p>
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
              defaultValue={product?.description ?? ""}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="price">Price (KES)</Label>
            <Input
              id="price"
              name="price"
              type="number"
              min={1}
              defaultValue={product?.price}
              required
            />
            {state.fieldErrors?.price && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.price[0]}
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="quantity">Quantity in stock</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min={0}
              defaultValue={product?.quantity ?? 0}
              required
            />
            {state.fieldErrors?.quantity && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.quantity[0]}
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="image">
              Photo{" "}
              {product?.imageUrl ? "(leave empty to keep current)" : "(optional)"}
            </Label>
            <Input id="image" name="image" type="file" accept="image/*" />
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
