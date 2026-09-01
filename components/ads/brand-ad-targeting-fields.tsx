"use client";

import { useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationPickerModal } from "@/components/location/location-picker-modal";
import { parseRadiusKm } from "@/lib/validations";

type Coords = { lat: number; lng: number };

export type BrandAdTargeting = {
  targetLatitude: number;
  targetLongitude: number;
  targetRadiusKm: number;
} | null;

// A universal ad always shows in the carousel; a localised one only shows to
// a customer whose search location falls within the target radius. This is
// shared between the authenticated "My ads" form and the public advertise
// form — both post the same three hidden inputs, present only when a target
// area is actually set.
export function BrandAdTargetingFields({
  initial,
}: {
  initial: BrandAdTargeting;
}) {
  const [enabled, setEnabled] = useState(initial !== null);
  const [position, setPosition] = useState<Coords | null>(
    initial ? { lat: initial.targetLatitude, lng: initial.targetLongitude } : null,
  );
  const [radiusRaw, setRadiusRaw] = useState(
    initial ? String(initial.targetRadiusKm) : "",
  );
  const [radiusError, setRadiusError] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [locating, setLocating] = useState(false);

  const radiusResult = enabled ? parseRadiusKm(radiusRaw, { min: 1, max: 500 }) : null;
  const validTargeting = enabled && position && radiusResult && "value" in radiusResult;

  function handleUseCurrentLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Your browser doesn't support location access.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        toast.error("Couldn't get your location. Try picking on the map instead.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="grid gap-2 rounded-lg border p-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="size-4"
        />
        Target this ad to an area (leave off for universal)
      </label>

      {enabled && (
        <div className="grid gap-2 pl-6">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUseCurrentLocation}
              disabled={locating}
            >
              {locating ? (
                <Loader2 className="animate-spin" />
              ) : (
                <MapPin className="text-destructive" />
              )}
              Use current location
            </Button>
            <span className="text-xs text-muted-foreground">or</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setMapOpen(true)}
            >
              Pick on map
            </Button>
          </div>
          {position && (
            <button
              type="button"
              onClick={() => setMapOpen(true)}
              className="w-fit text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              {position.lat.toFixed(4)}, {position.lng.toFixed(4)} — change
            </button>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="targetRadiusKm">Radius (km)</Label>
            <Input
              id="targetRadiusKm"
              value={radiusRaw}
              onChange={(e) => {
                setRadiusRaw(e.target.value);
                setRadiusError(null);
              }}
              onBlur={() => {
                if (!radiusRaw.trim()) return;
                const result = parseRadiusKm(radiusRaw, { min: 1, max: 500 });
                setRadiusError("error" in result ? result.error : null);
              }}
              placeholder="e.g. 20"
              inputMode="decimal"
            />
            {radiusError && (
              <p className="text-xs text-destructive">{radiusError}</p>
            )}
          </div>
        </div>
      )}

      {validTargeting && (
        <>
          <input type="hidden" name="targetLatitude" value={position!.lat} />
          <input type="hidden" name="targetLongitude" value={position!.lng} />
          <input
            type="hidden"
            name="targetRadiusKm"
            value={(radiusResult as { value: number }).value}
          />
        </>
      )}

      <LocationPickerModal
        open={mapOpen}
        onOpenChange={setMapOpen}
        initialPosition={position ?? undefined}
        onConfirm={setPosition}
      />
    </div>
  );
}
