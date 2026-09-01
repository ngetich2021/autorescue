"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrandAdFormModal, type MyBrandAdDto } from "./brand-ad-form-modal";
import { deleteBrandAd, toggleBrandAdActive } from "@/app/actions/brand-ad";
import { useAsyncAction } from "@/lib/use-async-action";

export function MyAdsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [loading, startLoading] = useTransition();
  const [ads, setAds] = useState<MyBrandAdDto[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MyBrandAdDto | null>(null);

  async function loadAds() {
    const res = await fetch("/api/me/brand-ads");
    const data = await res.json();
    setAds(data.ads ?? []);
  }

  useEffect(() => {
    if (open) startLoading(loadAds);
     
  }, [open]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>My ads</DialogTitle>
            <DialogDescription>
              Sponsored banners shown to everyone on both home pages.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus /> Create ad
              </Button>

              {ads.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No ads yet.
                </p>
              ) : (
                ads.map((ad) => (
                  <AdRow
                    key={ad.id}
                    ad={ad}
                    onRefresh={() => startLoading(loadAds)}
                    onEdit={() => {
                      setEditing(ad);
                      setFormOpen(true);
                    }}
                  />
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BrandAdFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        ad={editing}
        onSaved={() => startLoading(loadAds)}
      />
    </>
  );
}

function AdRow({
  ad,
  onRefresh,
  onEdit,
}: {
  ad: MyBrandAdDto;
  onRefresh: () => void;
  onEdit: () => void;
}) {
  const [toggling, toggle] = useAsyncAction(async () => {
    const result = await toggleBrandAdActive(ad.id, !ad.isActive);
    if (result.success) onRefresh();
    else if (result.error) toast.error(result.error);
  });

  const [deleting, remove] = useAsyncAction(async () => {
    const result = await deleteBrandAd(ad.id);
    if (result.success) {
      toast.success("Ad removed.");
      onRefresh();
    } else if (result.error) {
      toast.error(result.error);
    }
  });

  const busy = toggling || deleting;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="font-medium">{ad.title}</span>
          <Badge
            variant={ad.isActive ? "secondary" : "outline"}
            className="cursor-pointer"
            onClick={() => !busy && toggle()}
          >
            {toggling ? (
              <Loader2 className="size-3 animate-spin" />
            ) : ad.isActive ? (
              "Active"
            ) : (
              "Paused"
            )}
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" disabled={busy} onClick={onEdit}>
          <Pencil />
        </Button>
        <Button variant="ghost" size="icon-sm" disabled={busy} onClick={() => remove()}>
          {deleting ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Trash2 className="text-destructive" />
          )}
        </Button>
      </div>
    </div>
  );
}
