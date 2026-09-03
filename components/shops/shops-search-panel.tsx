"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShopCard, type ShopDto } from "./shop-card";
import {
  SERVICE_TYPES,
  SERVICE_TYPE_LABELS,
  SHOPS_SEARCH_MAX_RADIUS_KM,
  parseRadiusKm,
} from "@/lib/validations";

// The one search panel for both rescue and shop needs — a provider account
// is both at once, so there's a single result list. A shop-ad or brand-ad
// CTA (components/ads/hero-banner.tsx) lands here via ?q=<product name> or
// ?shop=<providerId>, same as the search box above (components/home/nearby-home.tsx).
export function ShopsSearchPanel({
  location,
}: {
  location: { lat: number; lng: number };
}) {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const shopId = searchParams.get("shop");

  // The radius field itself never gets a value the customer didn't type —
  // it stays blank until they narrow the search themselves.
  const [radiusRaw, setRadiusRaw] = useState("");
  const [serviceType, setServiceType] = useState<string>("ALL");
  const [shops, setShops] = useState<ShopDto[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [pinnedShop, setPinnedShop] = useState<ShopDto | null>(null);

  const radiusResult = parseRadiusKm(radiusRaw);
  const radiusError = radiusRaw.trim() && "error" in radiusResult ? radiusResult.error : null;
  const typedRadiusKm = "value" in radiusResult ? radiusResult.value : null;
  // A text/promoted search shouldn't need the customer to also guess a
  // distance — search as widely as the API allows and let them narrow it
  // with an explicit radius if they want to. Plain "browse what's nearby"
  // (no query, no radius typed) still asks for one.
  const radiusKm = typedRadiusKm ?? ((q || shopId) ? SHOPS_SEARCH_MAX_RADIUS_KM : null);

  useEffect(() => {
    if (radiusKm == null) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({
        latitude: String(location.lat),
        longitude: String(location.lng),
        radiusKm: String(radiusKm),
      });
      if (q) params.set("q", q);
      if (serviceType !== "ALL") params.set("serviceType", serviceType);

      fetch(`/api/shops/nearby?${params}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => setShops(data.shops ?? []))
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setShops([]);
        })
        .finally(() => setLoading(false));
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [location.lat, location.lng, radiusKm, q, serviceType]);

  useEffect(() => {
    if (!shopId) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      latitude: String(location.lat),
      longitude: String(location.lng),
    });
    fetch(`/api/shops/${shopId}?${params}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setPinnedShop(data?.shop ?? null))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
      });
    return () => controller.abort();
  }, [shopId, location.lat, location.lng]);

  const otherShops = (shops ?? []).filter((s) => s.id !== pinnedShop?.id);

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-1.5">
          <Label htmlFor="shops-radius">Radius (km)</Label>
          <Input
            id="shops-radius"
            className="w-32"
            value={radiusRaw}
            onChange={(e) => setRadiusRaw(e.target.value)}
            placeholder="e.g. 15"
            inputMode="decimal"
          />
          {radiusError && (
            <p className="text-xs text-destructive">{radiusError}</p>
          )}
          {q && (
            <p className="text-xs text-muted-foreground">
              Showing results with &ldquo;{q}&rdquo;
              {typedRadiusKm == null &&
                " — searching everywhere. Enter a radius to narrow it."}
            </p>
          )}
        </div>
        <Select
          value={serviceType}
          onValueChange={(value) => setServiceType(value ?? "ALL")}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All services" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All services</SelectItem>
            {SERVICE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {SERVICE_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {pinnedShop && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ShopCard shop={pinnedShop} location={location} defaultOpen />
        </div>
      )}

      {radiusKm == null ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Enter a radius to search nearby.
        </p>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : otherShops.length === 0 && !pinnedShop ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {q ? `"${q}" is not` : "Nothing is"} available
          {typedRadiusKm != null
            ? ` within your coordinates or the ${typedRadiusKm} km radius. Try widening your search.`
            : " anywhere yet. Try a different search term."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {otherShops.map((shop) => (
            <ShopCard key={shop.id} shop={shop} location={location} />
          ))}
        </div>
      )}
    </div>
  );
}
