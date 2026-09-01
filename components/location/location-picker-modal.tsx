"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { XIcon } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_CENTER } from "@/lib/geo";
import { cn } from "@/lib/utils";

const LocationPickerMapCanvas = dynamic(
  () =>
    import("./location-picker-map-canvas").then(
      (m) => m.LocationPickerMapCanvas,
    ),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> },
);

type Coords = { lat: number; lng: number };

export function LocationPickerModal({
  open,
  onOpenChange,
  initialPosition,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPosition?: Coords;
  onConfirm: (position: Coords) => void;
}) {
  const [position, setPosition] = useState<Coords>(
    initialPosition ?? DEFAULT_CENTER,
  );
  const [mapType, setMapType] = useState<"street" | "satellite">(
    "satellite",
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setPosition(initialPosition ?? DEFAULT_CENTER);
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex h-[85vh] max-w-2xl flex-col gap-0 p-0 sm:h-[600px] sm:max-w-2xl"
      >
        <DialogClose
          render={
            <Button
              variant="outline"
              size="icon-sm"
              className="absolute top-3 right-3 z-20 rounded-full bg-background/90 shadow-sm backdrop-blur-sm"
            />
          }
        >
          <XIcon />
          <span className="sr-only">Close</span>
        </DialogClose>
        <DialogHeader className="flex-row items-center justify-between gap-2 space-y-0 border-b py-3 pr-12 pl-4">
          <DialogTitle className="text-sm font-normal text-muted-foreground">
            Tap the map, then drag the pin to fine-tune
          </DialogTitle>
          <div className="flex overflow-hidden rounded-md border">
            <button
              type="button"
              onClick={() => setMapType("satellite")}
              className={cn(
                "px-3 py-1 text-xs font-medium",
                mapType === "satellite"
                  ? "bg-foreground text-background"
                  : "bg-background text-foreground",
              )}
            >
              Satellite
            </button>
            <button
              type="button"
              onClick={() => setMapType("street")}
              className={cn(
                "px-3 py-1 text-xs font-medium",
                mapType === "street"
                  ? "bg-foreground text-background"
                  : "bg-background text-foreground",
              )}
            >
              Street
            </button>
          </div>
        </DialogHeader>
        <div className="relative min-h-0 flex-1">
          <LocationPickerMapCanvas
            position={position}
            onChange={setPosition}
            mapType={mapType}
          />
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <Button
            onClick={() => {
              onConfirm(position);
              onOpenChange(false);
            }}
          >
            Confirm location
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
