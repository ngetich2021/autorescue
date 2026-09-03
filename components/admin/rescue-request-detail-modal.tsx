"use client";

import { toast } from "sonner";
import { Loader2, MapPin, Trash2 } from "lucide-react";
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
import { PhoneReveal } from "@/components/phone-reveal";
import { adminDeleteRescueRequest } from "@/app/actions/admin";
import { useAsyncAction } from "@/lib/use-async-action";
import { SERVICE_TYPE_LABELS, type ServiceType } from "@/lib/validations";

export type RescueRequestDetailRow = {
  id: string;
  customerName: string;
  customerPhone: string;
  description: string | null;
  serviceType: string;
  status: string;
  latitude: number;
  longitude: number;
  createdAt: string | Date;
  providerId: string;
  provider: { businessName: string; user: { name: string | null; email: string | null } };
};

export function RescueRequestDetailModal({
  request,
  open,
  onOpenChange,
  onChanged,
}: {
  request: RescueRequestDetailRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [deleting, remove] = useAsyncAction(async () => {
    if (!request) return;
    if (!confirm(`Remove this request from ${request.customerName}? This can't be undone.`)) {
      return;
    }
    const result = await adminDeleteRescueRequest(request.id);
    if (result.success) {
      toast.success("Request removed.");
      onOpenChange(false);
      onChanged();
    } else if (result.error) {
      toast.error(result.error);
    }
  });

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{request.customerName}</DialogTitle>
          <DialogDescription>
            Sent to {request.provider.businessName} (
            {request.provider.user.name ?? request.provider.user.email ?? "Unknown"})
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <DetailField label="Status">
            <Badge variant="secondary">{request.status}</Badge>
          </DetailField>
          <DetailField label="Needs">
            <Badge variant="secondary">
              {SERVICE_TYPE_LABELS[request.serviceType as ServiceType] ?? request.serviceType}
            </Badge>
          </DetailField>
          <DetailField label="Phone">
            <PhoneReveal phone={request.customerPhone} />
          </DetailField>
          <DetailField label="Location">
            <a
              href={`https://www.google.com/maps?q=${request.latitude},${request.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <MapPin className="size-3.5" /> Open in Maps
            </a>
          </DetailField>
          <DetailField label="Details" full>
            {request.description ?? "—"}
          </DetailField>
          <DetailField label="Received">
            {new Date(request.createdAt).toLocaleString()}
          </DetailField>
        </dl>

        <DialogFooter>
          <Button variant="destructive" disabled={deleting} onClick={() => remove()}>
            {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
            Remove request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
