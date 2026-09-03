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
import { adminDeleteService } from "@/app/actions/admin";
import { useAsyncAction } from "@/lib/use-async-action";

export type ServiceDetailRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  isAvailable: boolean;
  imageUrl: string | null;
  createdAt: string | Date;
  providerId: string;
  provider: { businessName: string; user: { name: string | null; email: string | null } };
};

export function ServiceDetailModal({
  service,
  open,
  onOpenChange,
  onChanged,
}: {
  service: ServiceDetailRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [deleting, remove] = useAsyncAction(async () => {
    if (!service) return;
    if (!confirm(`Remove "${service.name}"? This can't be undone.`)) return;
    const result = await adminDeleteService(service.id);
    if (result.success) {
      toast.success("Service removed.");
      onOpenChange(false);
      onChanged();
    } else if (result.error) {
      toast.error(result.error);
    }
  });

  if (!service) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{service.name}</DialogTitle>
          <DialogDescription>
            Offered by {service.provider.businessName} (
            {service.provider.user.name ?? service.provider.user.email ?? "Unknown"})
          </DialogDescription>
        </DialogHeader>

        {service.imageUrl && (
          <Image
            src={service.imageUrl}
            alt={service.name}
            width={640}
            height={360}
            className="h-40 w-full rounded-lg object-cover"
          />
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <DetailField label="Price">KES {service.price.toLocaleString()}</DetailField>
          <DetailField label="Status">
            <Badge variant={service.isAvailable ? "secondary" : "outline"}>
              {service.isAvailable ? "Available" : "Unavailable"}
            </Badge>
          </DetailField>
          <DetailField label="Description" full>
            {service.description ?? "—"}
          </DetailField>
          <DetailField label="Listed since">
            {new Date(service.createdAt).toLocaleDateString()}
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
