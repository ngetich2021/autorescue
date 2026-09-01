"use client";

import { useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LocationPickerModal } from "./location-picker-modal";

type Coords = { lat: number; lng: number };

export function LocationTrigger({
  location,
  onLocationChange,
}: {
  location: Coords | null;
  onLocationChange: (location: Coords) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [locating, setLocating] = useState(false);

  function handleAutoPick() {
    if (!("geolocation" in navigator)) {
      toast.error("Your browser doesn't support location access.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocationChange({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocating(false);
      },
      () => {
        toast.error(
          "Couldn't get your location. Try entering coordinates instead.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="outline"
          onClick={handleAutoPick}
          disabled={locating}
        >
          {locating ? (
            <Loader2 className="animate-spin" />
          ) : (
            <MapPin className="text-destructive" />
          )}
          Auto pick
        </Button>
        <span className="text-sm text-muted-foreground">or</span>
        <Button variant="secondary" onClick={() => setPickerOpen(true)}>
          Enter coordinates
        </Button>
      </div>
      {location && (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          {location.lat.toFixed(4)}, {location.lng.toFixed(4)} — change
          location
        </button>
      )}
      <LocationPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        initialPosition={location ?? undefined}
        onConfirm={onLocationChange}
      />
    </div>
  );
}
