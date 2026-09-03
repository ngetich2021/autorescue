"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DetailField } from "./detail-field";
import { PhoneReveal } from "@/components/phone-reveal";

export type UserDetailRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string | Date;
  providerProfiles: { businessName: string }[];
  platformMember: { role: { name: string } } | null;
  shopMemberships: { role: { name: string }; provider: { businessName: string } }[];
};

// View-only — there's no moderation field on User in the schema (banning
// etc. isn't modeled); staff/role changes happen in the Staff tab, and shop
// team changes happen in each shop's own Team management.
export function UserDetailModal({
  user,
  open,
  onOpenChange,
}: {
  user: UserDetailRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{user.name ?? user.email ?? "Unnamed account"}</DialogTitle>
          <DialogDescription>
            Signed up {new Date(user.createdAt).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <DetailField label="Email">{user.email ?? "—"}</DetailField>
          <DetailField label="Phone">
            {user.phone ? <PhoneReveal phone={user.phone} /> : "—"}
          </DetailField>
          <DetailField label="Platform role">
            {user.platformMember?.role.name ?? "—"}
          </DetailField>
          <DetailField label="Shops owned" full>
            {user.providerProfiles.length === 0 ? (
              "—"
            ) : (
              <div className="flex flex-wrap gap-1">
                {user.providerProfiles.map((shop) => (
                  <Badge key={shop.businessName} variant="secondary" className="text-xs">
                    {shop.businessName}
                  </Badge>
                ))}
              </div>
            )}
          </DetailField>
          <DetailField label="Team memberships" full>
            {user.shopMemberships.length === 0 ? (
              "—"
            ) : (
              <div className="flex flex-col gap-1">
                {user.shopMemberships.map((m, i) => (
                  <span key={i}>
                    {m.provider.businessName} · {m.role.name}
                  </span>
                ))}
              </div>
            )}
          </DetailField>
        </dl>
      </DialogContent>
    </Dialog>
  );
}
