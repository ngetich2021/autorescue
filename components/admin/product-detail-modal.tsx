"use client";

import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DetailField } from "./detail-field";
import { adminDeleteProduct } from "@/app/actions/admin";
import { useAsyncAction } from "@/lib/use-async-action";

export type ProductDetailRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  imageUrl: string | null;
  // Date on the server-rendered initial load, string once refreshed via the
  // JSON poll — new Date() below handles either.
  createdAt: string | Date;
  providerId: string;
  provider: { businessName: string; user: { name: string | null; email: string | null } };
};

export function ProductDetailModal({
  product,
  open,
  onOpenChange,
  onChanged,
}: {
  product: ProductDetailRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [deleting, remove] = useAsyncAction(async () => {
    if (!product) return;
    if (!confirm(`Remove "${product.name}"? This can't be undone.`)) return;
    const result = await adminDeleteProduct(product.id);
    if (result.success) {
      toast.success("Product removed.");
      onOpenChange(false);
      onChanged();
    } else if (result.error) {
      toast.error(result.error);
    }
  });

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>
            Sold by {product.provider.businessName} (
            {product.provider.user.name ?? product.provider.user.email ?? "Unknown"})
          </DialogDescription>
        </DialogHeader>

        {product.imageUrl && (
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={640}
            height={360}
            className="h-40 w-full rounded-lg object-cover"
          />
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <DetailField label="Price">KES {product.price.toLocaleString()}</DetailField>
          <DetailField label="Stock">
            <Badge variant={product.quantity > 0 ? "secondary" : "outline"}>
              {product.quantity > 0 ? `${product.quantity} in stock` : "Out of stock"}
            </Badge>
          </DetailField>
          <DetailField label="Description" full>
            {product.description ?? "—"}
          </DetailField>
          <DetailField label="Listed since">
            {new Date(product.createdAt).toLocaleDateString()}
          </DetailField>
        </dl>

        <DialogFooter>
          <Button variant="destructive" disabled={deleting} onClick={() => remove()}>
            {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
            Remove listing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
