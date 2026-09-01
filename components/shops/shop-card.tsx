"use client";

import { useState } from "react";
import { MapPin, Store, Phone, Mail, Wrench } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SERVICE_TYPE_LABELS, type ServiceType } from "@/lib/validations";
import { ShopProductsModal } from "./shop-products-modal";
import { RescueRequestModal } from "@/components/providers/rescue-request-modal";

export type ShopDto = {
  id: string;
  businessName: string;
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
    inStock: boolean;
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
// this particular provider actually has.
export function ShopCard({
  shop,
  location,
  defaultOpen = false,
}: {
  shop: ShopDto;
  location: { lat: number; lng: number };
  defaultOpen?: boolean;
}) {
  const [shopOpen, setShopOpen] = useState(defaultOpen);
  const [requestOpen, setRequestOpen] = useState(false);
  const hasProducts = shop.products.length > 0;
  const hasServices = shop.services.length > 0;
  const hasListing = hasProducts || hasServices;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle>{shop.businessName}</CardTitle>
          <div className="flex flex-wrap justify-end gap-1">
            {shop.serviceTypes.map((type) => (
              <Badge key={type} variant="secondary">
                {SERVICE_TYPE_LABELS[type as ServiceType] ?? type}
              </Badge>
            ))}
          </div>
        </div>
        {shop.description && (
          <CardDescription>{shop.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
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
      </CardContent>
      <CardFooter className="flex gap-2">
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
      </CardFooter>
      <ShopProductsModal open={shopOpen} onOpenChange={setShopOpen} shop={shop} />
      <RescueRequestModal
        open={requestOpen}
        onOpenChange={setRequestOpen}
        provider={shop}
        location={location}
      />
    </Card>
  );
}
