"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2 } from "lucide-react";
import {
  upsertProviderProfile,
  deleteProviderProfile,
  type ProviderActionState,
} from "@/app/actions/provider";
import { SERVICE_TYPES, SERVICE_TYPE_LABELS } from "@/lib/validations";
import { LocationTrigger } from "@/components/location/location-trigger";
import { useAsyncAction } from "@/lib/use-async-action";

const initialState: ProviderActionState = {};

type ProviderProfileDto = {
  businessName: string;
  serviceTypes: string[];
  phone: string;
  email: string;
  description: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
} | null;

export function ProviderProfileFormModal({
  open,
  onOpenChange,
  providerId,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Non-null edits that specific shop; null creates a brand-new one.
  providerId: string | null;
  onSaved: (providerId: string) => void;
  onDeleted: (providerId: string) => void;
}) {
  const action = upsertProviderProfile.bind(null, providerId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [deleting, handleDelete] = useAsyncAction(async () => {
    if (
      !providerId ||
      !confirm(
        "Delete this shop? Customers won't be able to find it, and its products, services, and promotions go with it.",
      )
    ) {
      return;
    }
    const result = await deleteProviderProfile(providerId);
    if (result.success) {
      toast.success("Shop deleted.");
      onOpenChange(false);
      onDeleted(providerId);
    } else if (result.error) {
      toast.error(result.error);
    }
  });
  const [loading, startLoading] = useTransition();
  const [profile, setProfile] = useState<ProviderProfileDto>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const [serviceTypes, setServiceTypes] = useState<string[]>(["MECHANIC"]);
  // Unlike editing (which preloads the shop's real saved coordinates), a
  // brand-new listing starts with no location at all — the owner has to
  // actively pick Auto or Maps, never a silent default.
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    startLoading(async () => {
      if (!providerId) {
        // Creating a new shop — always starts blank, never prefilled from
        // whichever shop happens to be selected elsewhere.
        setProfile(null);
        setServiceTypes(["MECHANIC"]);
        setPosition(null);
        return;
      }
      const res = await fetch(`/api/me/provider?shop=${providerId}`);
      const data = await res.json();
      setProfile(data.profile ?? null);
      setAccountEmail(data.accountEmail ?? "");
      if (data.profile) {
        setServiceTypes(data.profile.serviceTypes);
        setPosition({
          lat: data.profile.latitude,
          lng: data.profile.longitude,
        });
      }
    });
  }, [open, providerId]);

  useEffect(() => {
    if (state.success && state.providerId) {
      toast.success("Your listing is live.");
      onOpenChange(false);
      onSaved(state.providerId);
    }
    if (state.error) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function toggleServiceType(type: string, checked: boolean) {
    setServiceTypes((prev) =>
      checked ? [...prev, type] : prev.filter((t) => t !== type),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {providerId ? "Edit your listing" : "Post your service"}
          </DialogTitle>
          <DialogDescription>
            This is what stranded drivers see when they search nearby.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : (
          <form action={formAction} className="flex flex-col gap-3">
            <input
              type="hidden"
              name="serviceTypes"
              value={JSON.stringify(serviceTypes)}
            />
            <input type="hidden" name="latitude" value={position?.lat ?? ""} />
            <input type="hidden" name="longitude" value={position?.lng ?? ""} />

            <div className="grid gap-1.5">
              <Label htmlFor="businessName">Business name</Label>
              <Input
                id="businessName"
                name="businessName"
                defaultValue={profile?.businessName}
                required
              />
              {state.fieldErrors?.businessName && (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.businessName[0]}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Services offered (a shop can offer more than one)</Label>
              {SERVICE_TYPES.map((type) => (
                <label key={type} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={serviceTypes.includes(type)}
                    onChange={(e) => toggleServiceType(type, e.target.checked)}
                    className="size-4"
                  />
                  {SERVICE_TYPE_LABELS[type]}
                </label>
              ))}
              {state.fieldErrors?.serviceTypes && (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.serviceTypes[0]}
                </p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                pattern="[0-9+\-\s]{7,20}"
                title="Enter a valid phone number"
                maxLength={20}
                defaultValue={profile?.phone}
                required
              />
              {state.fieldErrors?.phone && (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.phone[0]}
                </p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="email">Contact email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={profile?.email ?? accountEmail}
                required
              />
              {state.fieldErrors?.email && (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.email[0]}
                </p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                name="description"
                rows={2}
                defaultValue={profile?.description ?? ""}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="address">Address (optional)</Label>
              <Input
                id="address"
                name="address"
                defaultValue={profile?.address ?? ""}
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Location</Label>
              <LocationTrigger
                location={position}
                onLocationChange={setPosition}
              />
            </div>

            <DialogFooter className="sm:justify-between">
              {providerId && (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={pending || deleting}
                  onClick={() => handleDelete()}
                >
                  {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                  Delete shop
                </Button>
              )}
              <Button type="submit" disabled={pending || deleting || !position}>
                {pending ? "Saving…" : "Save listing"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
