"use client";

import Image from "next/image";
import { Megaphone, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import type { ShopDto } from "./shop-card";

type ProductRow = ShopDto["products"][number];
type ServiceRow = ShopDto["services"][number];

const productColumns: DataTableColumn<ProductRow>[] = [
  {
    key: "name",
    header: "Product",
    sortable: true,
    sortValue: (row) => row.name.toLowerCase(),
    render: (row) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.name}</span>
        {row.description && (
          <span className="line-clamp-1 text-xs text-muted-foreground">
            {row.description}
          </span>
        )}
      </div>
    ),
  },
  {
    key: "price",
    header: "Price",
    sortable: true,
    sortValue: (row) => row.price,
    render: (row) => `KES ${row.price.toLocaleString()}`,
  },
  {
    key: "status",
    header: "Stock",
    sortable: true,
    sortValue: (row) => row.quantity,
    render: (row) => (
      <Badge variant={row.quantity > 0 ? "secondary" : "outline"}>
        {row.quantity > 0 ? `${row.quantity} in stock` : "Out of stock"}
      </Badge>
    ),
  },
];

const serviceColumns: DataTableColumn<ServiceRow>[] = [
  {
    key: "name",
    header: "Service",
    sortable: true,
    sortValue: (row) => row.name.toLowerCase(),
    render: (row) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.name}</span>
        {row.description && (
          <span className="line-clamp-1 text-xs text-muted-foreground">
            {row.description}
          </span>
        )}
      </div>
    ),
  },
  {
    key: "price",
    header: "Price",
    sortable: true,
    sortValue: (row) => row.price,
    render: (row) => `KES ${row.price.toLocaleString()}`,
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    sortValue: (row) => (row.isAvailable ? 1 : 0),
    render: (row) => (
      <Badge variant={row.isAvailable ? "secondary" : "outline"}>
        {row.isAvailable ? "Available" : "Unavailable"}
      </Badge>
    ),
  },
];

const STOCK_FILTER = {
  key: "status",
  label: "Status",
  options: [
    { value: "yes", label: "In stock" },
    { value: "no", label: "Out of stock" },
  ],
  predicate: (row: ProductRow, value: string) =>
    value === "yes" ? row.quantity > 0 : row.quantity === 0,
};

const AVAILABILITY_FILTER = {
  key: "status",
  label: "Status",
  options: [
    { value: "yes", label: "Available" },
    { value: "no", label: "Unavailable" },
  ],
  predicate: (row: ServiceRow, value: string) =>
    value === "yes" ? row.isAvailable : !row.isAvailable,
};

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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1">
            {shop.businessName}
            {shop.isVerified && (
              <BadgeCheck className="size-4 shrink-0 fill-blue-500 text-white" />
            )}
          </DialogTitle>
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
                <DataTable
                  columns={productColumns}
                  data={shop.products}
                  searchPlaceholder="Search products…"
                  searchValue={(row) => `${row.name} ${row.description ?? ""}`}
                  filters={[STOCK_FILTER]}
                  emptyMessage="No products listed."
                />
              </div>
            )}

            {shop.services.length > 0 && (
              <div className="flex flex-col gap-2">
                {shop.products.length > 0 && (
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Services
                  </h3>
                )}
                <DataTable
                  columns={serviceColumns}
                  data={shop.services}
                  searchPlaceholder="Search services…"
                  searchValue={(row) => `${row.name} ${row.description ?? ""}`}
                  filters={[AVAILABILITY_FILTER]}
                  emptyMessage="No services listed."
                />
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
