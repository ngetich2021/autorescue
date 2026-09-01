"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, ArrowLeft, Settings2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { ProductFormModal, type MyProductDto } from "./product-form-modal";
import { ServiceFormModal, type MyServiceDto } from "./service-form-modal";
import { ShopAdFormModal, type MyShopAdDto } from "./shop-ad-form-modal";
import { ProviderProfileFormModal } from "@/components/providers/provider-profile-form-modal";
import { deleteProduct } from "@/app/actions/product";
import { deleteService } from "@/app/actions/service";
import { deleteShopAd, toggleShopAdActive } from "@/app/actions/shop-ad";
import { useAsyncAction } from "@/lib/use-async-action";

export function ShopManageDashboard({
  hasProvider,
  initialProducts,
  initialServices,
  initialAds,
}: {
  hasProvider: boolean;
  initialProducts: MyProductDto[];
  initialServices: MyServiceDto[];
  initialAds: MyShopAdDto[];
}) {
  const [hasProviderState, setHasProviderState] = useState(hasProvider);
  const [products, setProducts] = useState(initialProducts);
  const [services, setServices] = useState(initialServices);
  const [ads, setAds] = useState(initialAds);
  const [profileOpen, setProfileOpen] = useState(false);

  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MyProductDto | null>(null);
  const [serviceFormOpen, setServiceFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<MyServiceDto | null>(null);
  const [adFormOpen, setAdFormOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<MyShopAdDto | null>(null);

  async function refresh() {
    const [productsData, servicesData, adsData] = await Promise.all([
      fetch("/api/me/products").then((res) => res.json()),
      fetch("/api/me/services").then((res) => res.json()),
      fetch("/api/me/shop-ads").then((res) => res.json()),
    ]);
    setProducts(productsData.products ?? []);
    setServices(servicesData.services ?? []);
    setAds(adsData.ads ?? []);
    // Posting the shop listing for the first time (via the "Shop profile"
    // modal below) flips this mid-session — re-derive it from the same
    // fetch instead of trusting the server-rendered prop forever.
    setHasProviderState(productsData.hasProvider ?? false);
  }

  const productColumns: DataTableColumn<MyProductDto>[] = [
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
      header: "Status",
      sortable: true,
      sortValue: (row) => (row.inStock ? 1 : 0),
      render: (row) => (
        <Badge variant={row.inStock ? "secondary" : "outline"}>
          {row.inStock ? "In stock" : "Out of stock"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      stopRowClick: true,
      render: (row) => (
        <RowActions
          onEdit={() => {
            setEditingProduct(row);
            setProductFormOpen(true);
          }}
          onDelete={async () => {
            const result = await deleteProduct(row.id);
            if (result.success) {
              toast.success("Product removed.");
              refresh();
            } else if (result.error) toast.error(result.error);
          }}
        />
      ),
    },
  ];

  const serviceColumns: DataTableColumn<MyServiceDto>[] = [
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
    {
      key: "actions",
      header: "",
      stopRowClick: true,
      render: (row) => (
        <RowActions
          onEdit={() => {
            setEditingService(row);
            setServiceFormOpen(true);
          }}
          onDelete={async () => {
            const result = await deleteService(row.id);
            if (result.success) {
              toast.success("Service removed.");
              refresh();
            } else if (result.error) toast.error(result.error);
          }}
        />
      ),
    },
  ];

  const adColumns: DataTableColumn<MyShopAdDto>[] = [
    {
      key: "title",
      header: "Promotion",
      sortable: true,
      sortValue: (row) => row.title.toLowerCase(),
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.title}</span>
          {row.description && (
            <span className="line-clamp-1 text-xs text-muted-foreground">
              {row.description}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "radius",
      header: "Reach",
      render: (row) =>
        row.radiusKm == null ? "Universal" : `Within ${row.radiusKm} km`,
    },
    {
      key: "status",
      header: "Status",
      stopRowClick: true,
      sortable: true,
      sortValue: (row) => (row.isActive ? 1 : 0),
      render: (row) => <AdStatusCell ad={row} onChanged={refresh} />,
    },
    {
      key: "actions",
      header: "",
      stopRowClick: true,
      render: (row) => (
        <RowActions
          onEdit={() => {
            setEditingAd(row);
            setAdFormOpen(true);
          }}
          onDelete={async () => {
            const result = await deleteShopAd(row.id);
            if (result.success) {
              toast.success("Promotion removed.");
              refresh();
            } else if (result.error) toast.error(result.error);
          }}
        />
      ),
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Manage your shop</h1>
          <p className="text-sm text-muted-foreground">
            Products, services, and promotions customers see when they find you.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setProfileOpen(true)}>
            <Settings2 /> Shop profile
          </Button>
          <Link href="/" className={buttonVariants({ variant: "ghost" })}>
            <ArrowLeft /> Back
          </Link>
        </div>
      </div>

      {!hasProviderState ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Post your service listing first, then come back to add products,
            services, and promotions.
          </p>
          <Button onClick={() => setProfileOpen(true)}>Post your service</Button>
        </div>
      ) : (
        <Tabs defaultValue="products">
          <TabsList>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="promotions">Promotions</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="flex flex-col gap-3 pt-4">
            <Button
              variant="outline"
              className="self-start"
              onClick={() => {
                setEditingProduct(null);
                setProductFormOpen(true);
              }}
            >
              <Plus /> Add product
            </Button>
            <DataTable
              columns={productColumns}
              data={products}
              searchPlaceholder="Search products…"
              searchValue={(row) => `${row.name} ${row.description ?? ""}`}
              emptyMessage="No products yet."
            />
          </TabsContent>

          <TabsContent value="services" className="flex flex-col gap-3 pt-4">
            <Button
              variant="outline"
              className="self-start"
              onClick={() => {
                setEditingService(null);
                setServiceFormOpen(true);
              }}
            >
              <Plus /> Add service
            </Button>
            <DataTable
              columns={serviceColumns}
              data={services}
              searchPlaceholder="Search services…"
              searchValue={(row) => `${row.name} ${row.description ?? ""}`}
              emptyMessage="No services yet."
            />
          </TabsContent>

          <TabsContent value="promotions" className="flex flex-col gap-3 pt-4">
            <p className="text-sm text-muted-foreground">
              Promote a product inside your own shop listing. Leave the radius
              empty to show it to everyone who opens your shop.
            </p>
            <Button
              variant="outline"
              className="self-start"
              onClick={() => {
                setEditingAd(null);
                setAdFormOpen(true);
              }}
            >
              <Plus /> Promote a product
            </Button>
            <DataTable
              columns={adColumns}
              data={ads}
              searchPlaceholder="Search promotions…"
              searchValue={(row) => `${row.title} ${row.description ?? ""}`}
              emptyMessage="No promotions yet."
            />
          </TabsContent>
        </Tabs>
      )}

      <ProductFormModal
        open={productFormOpen}
        onOpenChange={setProductFormOpen}
        product={editingProduct}
        onSaved={refresh}
      />
      <ServiceFormModal
        open={serviceFormOpen}
        onOpenChange={setServiceFormOpen}
        service={editingService}
        onSaved={refresh}
      />
      <ShopAdFormModal
        open={adFormOpen}
        onOpenChange={setAdFormOpen}
        ad={editingAd}
        products={products}
        onSaved={refresh}
      />
      <ProviderProfileFormModal
        open={profileOpen}
        onOpenChange={(open) => {
          setProfileOpen(open);
          // Closing always re-checks hasProvider/products/services/ads —
          // harmless on cancel, and the only way to notice a first-time
          // "Post your service" save (the modal has no onSaved callback).
          if (!open) refresh();
        }}
      />
    </div>
  );
}

function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => Promise<void>;
}) {
  const [deleting, remove] = useAsyncAction(onDelete);

  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="icon-sm" disabled={deleting} onClick={onEdit}>
        <Pencil />
      </Button>
      <Button variant="ghost" size="icon-sm" disabled={deleting} onClick={() => remove()}>
        {deleting ? <Loader2 className="animate-spin" /> : <Trash2 className="text-destructive" />}
      </Button>
    </div>
  );
}

function AdStatusCell({
  ad,
  onChanged,
}: {
  ad: MyShopAdDto;
  onChanged: () => void;
}) {
  const [toggling, toggle] = useAsyncAction(async () => {
    const result = await toggleShopAdActive(ad.id, !ad.isActive);
    if (result.success) onChanged();
    else if (result.error) toast.error(result.error);
  });

  return (
    <Badge
      variant={ad.isActive ? "secondary" : "outline"}
      className="cursor-pointer"
      onClick={() => !toggling && toggle()}
    >
      {toggling ? (
        <Loader2 className="size-3 animate-spin" />
      ) : ad.isActive ? (
        "Active"
      ) : (
        "Paused"
      )}
    </Badge>
  );
}
