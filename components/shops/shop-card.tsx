"use client";

import { useState } from "react";
import { MapPin, Store, Phone, Mail, Wrench, BadgeCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { SERVICE_TYPE_LABELS, type ServiceType } from "@/lib/validations";
import { ShopProductsModal } from "./shop-products-modal";
import { RescueRequestModal } from "@/components/providers/rescue-request-modal";

export type ShopDto = {
  id: string;
  businessName: string;
  isVerified: boolean;
  serviceTypes: string[];
  phone: string;
  email: string;
  description: string | null;
  address: string | null;
  distanceKm: number;
  featuredAd: {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    radiusKm: number | null;
  } | null;
  products: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    imageUrl: string | null;
    quantity: number;
  }[];
  services: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    imageUrl: string | null;
    isAvailable: boolean;
  }[];
};

// One provider account can offer roadside services, sell products, or both
// — "Request rescue" and "View shop" show up independently based on what
// this particular provider actually has. The list itself only shows a tiny
// summary card (name, verified badge, distance) so a page of results scans
// quickly — everything else (description, contact info, the actions) lives
// behind a tap, in the details dialog below.
export function ShopCard({
  shop,
  location,
  defaultOpen = false,
}: {
  shop: ShopDto;
  location: { lat: number; lng: number };
  // Auto-opens the details dialog — used when a customer lands here via a
  // promoted-shop CTA (components/ads/hero-banner.tsx's "View shop") that
  // pins this specific provider.
  defaultOpen?: boolean;
}) {
  const [detailsOpen, setDetailsOpen] = useState(defaultOpen);
  const [shopOpen, setShopOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const hasProducts = shop.products.length > 0;
  const hasServices = shop.services.length > 0;
  const hasListing = hasProducts || hasServices;

  return (
    <>
      <Card
        role="button"
        tabIndex={0}
        onClick={() => setDetailsOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setDetailsOpen(true);
          }
        }}
        className="cursor-pointer transition-colors hover:bg-accent/50"
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="flex items-center gap-1 text-base">
              {shop.businessName}
              {shop.isVerified && (
                <BadgeCheck className="size-4 shrink-0 fill-blue-500 text-white" />
              )}
            </CardTitle>
          </div>
          <CardDescription className="flex items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0" />
            {shop.distanceKm.toFixed(1)} km away
          </CardDescription>
        </CardHeader>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1">
              {shop.businessName}
              {shop.isVerified && (
                <BadgeCheck className="size-4 shrink-0 fill-blue-500 text-white" />
              )}
            </DialogTitle>
            {shop.description && (
              <DialogDescription>{shop.description}</DialogDescription>
            )}
          </DialogHeader>

          <div className="flex flex-wrap gap-1">
            {shop.serviceTypes.map((type) => (
              <Badge key={type} variant="secondary">
                {SERVICE_TYPE_LABELS[type as ServiceType] ?? type}
              </Badge>
            ))}
          </div>

          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" />
              {shop.distanceKm.toFixed(1)} km away
              {shop.address ? ` · ${shop.address}` : ""}
            </span>
            {hasListing && (
              <span className="flex items-center gap-1.5">
                <Store className="size-3.5 shrink-0" />
                {[
                  hasProducts &&
                    `${shop.products.length} item${shop.products.length === 1 ? "" : "s"} for sale`,
                  hasServices &&
                    `${shop.services.length} service${shop.services.length === 1 ? "" : "s"}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Phone className="size-3.5 shrink-0" />
              {shop.phone}
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="size-3.5 shrink-0" />
              {shop.email}
            </span>
          </div>

          <DialogFooter className="flex-row gap-2 sm:justify-start">
            <Button className="flex-1" onClick={() => setRequestOpen(true)}>
              <Wrench /> Request rescue
            </Button>
            {hasListing && (
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => setShopOpen(true)}
              >
                View shop
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ShopProductsModal open={shopOpen} onOpenChange={setShopOpen} shop={shop} />
      <RescueRequestModal
        open={requestOpen}
        onOpenChange={setRequestOpen}
        provider={shop}
        location={location}
      />
    </>
  );
}
