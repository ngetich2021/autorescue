"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DetailField } from "./detail-field";
import { HeroSlideVisual, type SlideView } from "@/components/ads/hero-slide";
import { AD_COLOR_GRADIENTS } from "@/components/ads/ad-colors";
import {
  adminUpdateBrandAdAppearance,
  adminSetAdActive,
} from "@/app/actions/admin";
import { useAsyncAction } from "@/lib/use-async-action";
import {
  AD_COLORS,
  AD_COLOR_LABELS,
  AD_TEXT_COLORS,
  AD_TEXT_COLOR_LABELS,
  type AdColor,
  type AdTextColor,
} from "@/lib/validations";

export type AdDetailRow = {
  id: string;
  title: string;
  productName: string;
  description: string | null;
  imageUrl: string | null;
  contactEmail: string;
  contactPhone: string;
  advertiserName: string | null;
  textColor: AdTextColor;
  ctaColor: AdColor;
  targetLatitude: number | null;
  targetLongitude: number | null;
  targetRadiusKm: number | null;
  isActive: boolean;
  // Date on the server-rendered initial load (app/admin/page.tsx), string
  // once refreshed via the JSON poll (/api/admin/data) — new Date() below
  // handles either.
  createdAt: string | Date;
  user: { name: string | null; email: string | null } | null;
};

// Shows every field captured by the brand-ad forms (components/ads/brand-ad-form-modal.tsx,
// components/ads/advertise-form-modal.tsx) plus a pixel-accurate hero preview
// (same HeroSlideVisual the live carousel renders) so the admin can dial in
// text/CTA color against the real poster before saving.
export function AdDetailModal({
  ad,
  open,
  onOpenChange,
  onChanged,
}: {
  ad: AdDetailRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  // The parent remounts this component (key={ad.id}) whenever a different
  // ad is opened, so these initial values are never stale — no effect
  // needed to "reset" them.
  const [textColor, setTextColor] = useState<AdTextColor>(ad?.textColor ?? "light");
  const [ctaColor, setCtaColor] = useState<AdColor>(ad?.ctaColor ?? "green");

  const [savingAppearance, saveAppearance] = useAsyncAction(async () => {
    if (!ad) return;
    const result = await adminUpdateBrandAdAppearance(ad.id, textColor, ctaColor);
    if (result.success) {
      toast.success("Appearance updated.");
      onChanged();
    } else if (result.error) toast.error(result.error);
  });

  const [togglingActive, toggleActive] = useAsyncAction(async () => {
    if (!ad) return;
    const result = await adminSetAdActive(ad.id, !ad.isActive);
    if (result.success) onChanged();
    else if (result.error) toast.error(result.error);
  });

  if (!ad) return null;

  const dirty = textColor !== ad.textColor || ctaColor !== ad.ctaColor;
  const isLocalised = ad.targetRadiusKm != null;

  const previewView: SlideView = {
    title: ad.title,
    description: ad.description,
    imageUrl: ad.imageUrl,
    bgGradient: AD_COLOR_GRADIENTS.green,
    isDarkText: textColor === "dark",
    ctaColor,
    ctaLabel: "Find nearby shops",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{ad.title}</DialogTitle>
          <DialogDescription>
            Submitted {new Date(ad.createdAt).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Hero preview — exactly how this renders on the live site
          </p>
          <div className="relative h-36 w-full overflow-hidden rounded-xl border sm:h-44">
            <HeroSlideVisual view={previewView} />
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Select
              value={textColor}
              onValueChange={(value) => value && setTextColor(value as AdTextColor)}
            >
              <SelectTrigger size="sm" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AD_TEXT_COLORS.map((color) => (
                  <SelectItem key={color} value={color}>
                    {AD_TEXT_COLOR_LABELS[color]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={ctaColor}
              onValueChange={(value) => value && setCtaColor(value as AdColor)}
            >
              <SelectTrigger size="sm" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AD_COLORS.map((color) => (
                  <SelectItem key={color} value={color}>
                    {AD_COLOR_LABELS[color]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {dirty && (
              <Button size="sm" disabled={savingAppearance} onClick={() => saveAppearance()}>
                {savingAppearance && <Loader2 className="animate-spin" />} Save appearance
              </Button>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <DetailField label="Status">
            <Badge variant={ad.isActive ? "secondary" : "outline"}>
              {ad.isActive ? "Active" : ad.user ? "Deactivated" : "Pending review"}
            </Badge>
          </DetailField>
          <DetailField label="Product name">{ad.productName}</DetailField>
          <DetailField label="Advertiser">{ad.advertiserName ?? "—"}</DetailField>
          <DetailField label="Contact email">{ad.contactEmail}</DetailField>
          <DetailField label="Contact phone">{ad.contactPhone}</DetailField>
          <DetailField label="Submitted by" full>
            {ad.user
              ? `${ad.user.name ?? "—"} (${ad.user.email ?? "no email"})`
              : "Anonymous — public advertise form"}
          </DetailField>
          <DetailField label="Targeting" full>
            {isLocalised
              ? `Within ${ad.targetRadiusKm} km of ${ad.targetLatitude?.toFixed(4)}, ${ad.targetLongitude?.toFixed(4)}`
              : "Universal — shown to everyone"}
          </DetailField>
          <DetailField label="Description" full>
            {ad.description ?? "—"}
          </DetailField>
        </dl>

        <DialogFooter>
          <Button variant="outline" disabled={togglingActive} onClick={() => toggleActive()}>
            {togglingActive && <Loader2 className="animate-spin" />}
            {ad.isActive ? "Deactivate" : "Activate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
