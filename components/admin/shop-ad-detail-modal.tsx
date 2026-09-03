"use client";

import Image from "next/image";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { adminSetShopAdActive } from "@/app/actions/admin";
import { useAsyncAction } from "@/lib/use-async-action";

export type ShopAdDetailRow = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  radiusKm: number | null;
  expiresAt: string | Date | null;
  isActive: boolean;
  product: { name: string } | null;
  createdAt: string | Date;
  providerId: string;
  provider: { businessName: string; user: { name: string | null; email: string | null } };
};

export function ShopAdDetailModal({
  ad,
  open,
  onOpenChange,
  onChanged,
}: {
  ad: ShopAdDetailRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [togglingActive, toggleActive] = useAsyncAction(async () => {
    if (!ad) return;
    const result = await adminSetShopAdActive(ad.id, !ad.isActive);
    if (result.success) onChanged();
    else if (result.error) toast.error(result.error);
  });

  if (!ad) return null;

  const paidThrough = ad.expiresAt ? new Date(ad.expiresAt) : null;
  const live = paidThrough != null && paidThrough > new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{ad.title}</DialogTitle>
          <DialogDescription>
            Promoted by {ad.provider.businessName} (
            {ad.provider.user.name ?? ad.provider.user.email ?? "Unknown"})
          </DialogDescription>
        </DialogHeader>

        {ad.imageUrl && (
          <Image
            src={ad.imageUrl}
            alt={ad.title}
            width={640}
            height={360}
            className="h-40 w-full rounded-lg object-cover"
          />
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <DetailField label="Status">
            <Badge variant={ad.isActive ? "secondary" : "outline"}>
              {ad.isActive ? "Active" : "Paused"}
            </Badge>
          </DetailField>
          <DetailField label="Payment">
            {live
              ? `Paid until ${paidThrough!.toLocaleDateString()}`
              : paidThrough
                ? "Expired"
                : "Not paid"}
          </DetailField>
          <DetailField label="Reach">
            {ad.radiusKm == null ? "Universal" : `Within ${ad.radiusKm} km`}
          </DetailField>
          <DetailField label="Linked product">{ad.product?.name ?? "—"}</DetailField>
          <DetailField label="Description" full>
            {ad.description ?? "—"}
          </DetailField>
          <DetailField label="Created">
            {new Date(ad.createdAt).toLocaleDateString()}
          </DetailField>
        </dl>

        <DialogFooter>
          <Button variant="outline" disabled={togglingActive} onClick={() => toggleActive()}>
            {togglingActive && <Loader2 className="animate-spin" />}
            {ad.isActive ? "Pause" : "Activate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
