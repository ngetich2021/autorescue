"use client";

import Image from "next/image";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { ShopDto } from "./shop-card";

export function ShopProductsModal({
  open,
  onOpenChange,
  shop,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shop: ShopDto;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{shop.businessName}</DialogTitle>
          <DialogDescription>
            {shop.phone} · {shop.email}
            {shop.address ? ` · ${shop.address}` : ""}
          </DialogDescription>
        </DialogHeader>
        {shop.featuredAd && (
          <button
            type="button"
            className="flex gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3 text-left"
            onClick={() =>
              toast.info(`${shop.businessName} is ${shop.distanceKm.toFixed(1)} km away.`)
            }
          >
            {shop.featuredAd.imageUrl ? (
              <Image
                src={shop.featuredAd.imageUrl}
                alt={shop.featuredAd.title}
                width={64}
                height={64}
                className="size-16 shrink-0 rounded-md object-cover"
              />
            ) : (
              <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <Megaphone className="size-6 text-primary" />
              </div>
            )}
            <div className="flex flex-1 flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="font-medium">{shop.featuredAd.title}</span>
                <Badge variant="secondary">Promoted</Badge>
              </div>
              {shop.featuredAd.description && (
                <p className="text-sm text-muted-foreground">
                  {shop.featuredAd.description}
                </p>
              )}
            </div>
          </button>
        )}
        {shop.products.length === 0 && shop.services.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No items listed yet.
          </p>
        ) : (
          <>
            {shop.products.length > 0 && (
              <div className="flex flex-col gap-2">
                {shop.services.length > 0 && (
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Products
                  </h3>
                )}
                <div className="flex flex-col gap-3">
                  {shop.products.map((product) => (
                    <div
                      key={product.id}
                      className="flex gap-3 rounded-lg border p-3"
                    >
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          width={64}
                          height={64}
                          className="size-16 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <div className="size-16 shrink-0 rounded-md bg-muted" />
                      )}
                      <div className="flex flex-1 flex-col gap-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{product.name}</span>
                          <Badge variant={product.inStock ? "secondary" : "outline"}>
                            {product.inStock ? "In stock" : "Out of stock"}
                          </Badge>
                        </div>
                        {product.description && (
                          <p className="text-sm text-muted-foreground">
                            {product.description}
                          </p>
                        )}
                        <span className="text-sm font-medium">
                          KES {product.price.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {shop.services.length > 0 && (
              <div className="flex flex-col gap-2">
                {shop.products.length > 0 && (
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Services
                  </h3>
                )}
                <div className="flex flex-col gap-3">
                  {shop.services.map((service) => (
                    <div
                      key={service.id}
                      className="flex gap-3 rounded-lg border p-3"
                    >
                      {service.imageUrl ? (
                        <Image
                          src={service.imageUrl}
                          alt={service.name}
                          width={64}
                          height={64}
                          className="size-16 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <div className="size-16 shrink-0 rounded-md bg-muted" />
                      )}
                      <div className="flex flex-1 flex-col gap-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{service.name}</span>
                          <Badge variant={service.isAvailable ? "secondary" : "outline"}>
                            {service.isAvailable ? "Available" : "Unavailable"}
                          </Badge>
                        </div>
                        {service.description && (
                          <p className="text-sm text-muted-foreground">
                            {service.description}
                          </p>
                        )}
                        <span className="text-sm font-medium">
                          KES {service.price.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
