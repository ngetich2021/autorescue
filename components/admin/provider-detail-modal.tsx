"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DetailField } from "./detail-field";
import { SERVICE_TYPE_LABELS, type ServiceType } from "@/lib/validations";

export type ProviderDetailRow = {
  id: string;
  businessName: string;
  serviceTypes: string[];
  phone: string;
  email: string;
  description: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  isActive: boolean;
  isVerified: boolean;
  verifiedUntil: string | Date | null;
  // Date on the server-rendered initial load (app/admin/page.tsx), string
  // once refreshed via the JSON poll (/api/admin/data) — new Date() below
  // handles either.
  createdAt: string | Date;
  user: { name: string | null; email: string | null };
};

// Shows every field captured by the "Post your service" form
// (components/providers/provider-profile-form-modal.tsx) — the full record,
// not just the summary columns shown in the admin table row.
export function ProviderDetailModal({
  provider,
  open,
  onOpenChange,
}: {
  provider: ProviderDetailRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!provider) return null;

  const verifiedUntil = provider.verifiedUntil ? new Date(provider.verifiedUntil) : null;
  const verified = provider.isVerified && verifiedUntil != null && verifiedUntil > new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{provider.businessName}</DialogTitle>
          <DialogDescription>
            Owned by {provider.user.name ?? provider.user.email ?? "Unknown"}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <DetailField label="Status">
            <Badge variant={provider.isActive ? "secondary" : "outline"}>
              {provider.isActive ? "Active" : "Deactivated"}
            </Badge>
          </DetailField>
          <DetailField label="Verification">
            <Badge variant={verified ? "secondary" : "outline"}>
              {verified ? `Verified until ${verifiedUntil!.toLocaleDateString()}` : "Unverified"}
            </Badge>
          </DetailField>
          <DetailField label="Owner email">{provider.user.email ?? "—"}</DetailField>
          <DetailField label="Phone">{provider.phone}</DetailField>
          <DetailField label="Email">{provider.email}</DetailField>
          <DetailField label="Services" full>
            <div className="flex flex-wrap gap-1">
              {provider.serviceTypes.map((type) => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {SERVICE_TYPE_LABELS[type as ServiceType] ?? type}
                </Badge>
              ))}
            </div>
          </DetailField>
          <DetailField label="Description" full>
            {provider.description ?? "—"}
          </DetailField>
          <DetailField label="Address" full>
            {provider.address ?? "—"}
          </DetailField>
          <DetailField label="Coordinates">
            {provider.latitude.toFixed(5)}, {provider.longitude.toFixed(5)}
          </DetailField>
          <DetailField label="Listed since">
            {new Date(provider.createdAt).toLocaleDateString()}
          </DetailField>
        </dl>
      </DialogContent>
    </Dialog>
  );
}
