"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ArrowLeft,
  Settings2,
  MapPin,
  ShieldCheck,
  BadgeCheck,
  Store,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { ProductFormModal, type MyProductDto } from "./product-form-modal";
import { ServiceFormModal, type MyServiceDto } from "./service-form-modal";
import { ShopAdFormModal, type MyShopAdDto } from "./shop-ad-form-modal";
import { MpesaPayModal } from "./mpesa-pay-modal";
import { ProviderProfileFormModal } from "@/components/providers/provider-profile-form-modal";
import { deleteProduct } from "@/app/actions/product";
import { deleteService } from "@/app/actions/service";
import { deleteShopAd, toggleShopAdActive } from "@/app/actions/shop-ad";
import { setRequestStatus } from "@/app/actions/rescue-request";
import { useAsyncAction } from "@/lib/use-async-action";
import {
  REQUEST_STATUSES,
  SERVICE_TYPE_LABELS,
  PROMOTION_LOCAL_RATE_KES,
  PROMOTION_UNIVERSAL_RATE_KES,
  VERIFICATION_BADGE_RATE_KES,
  type RequestStatus,
  type ServiceType,
} from "@/lib/validations";

export type MyRequestDto = {
  id: string;
  customerName: string;
  customerPhone: string;
  description: string | null;
  serviceType: string;
  latitude: number;
  longitude: number;
  status: string;
  createdAt: string | Date;
};

export function ShopManageDashboard({
  providerId,
  shops,
  canManageRequests,
  verifiedUntil,
  initialProducts,
  initialServices,
  initialAds,
  initialRequests,
}: {
  providerId: string | null;
  shops: { id: string; businessName: string; role: "owner" | "member" }[];
  canManageRequests: boolean;
  verifiedUntil: string | Date | null;
  initialProducts: MyProductDto[];
  initialServices: MyServiceDto[];
  initialAds: MyShopAdDto[];
  initialRequests: MyRequestDto[];
}) {
  const router = useRouter();
  const hasProvider = providerId !== null;
  const [verifiedUntilState, setVerifiedUntilState] = useState(verifiedUntil);
  const verifiedThrough = verifiedUntilState ? new Date(verifiedUntilState) : null;
  const verifiedState = verifiedThrough != null && verifiedThrough > new Date();
  const [products, setProducts] = useState(initialProducts);
  const [services, setServices] = useState(initialServices);
  const [ads, setAds] = useState(initialAds);
  const [requests, setRequests] = useState(initialRequests);
  // null = closed; { providerId: null } = creating a new shop; { providerId:
  // "..." } = editing that shop.
  const [profileMode, setProfileMode] = useState<{ providerId: string | null } | null>(
    null,
  );
  const [badgePayOpen, setBadgePayOpen] = useState(false);
  const [promoPayAd, setPromoPayAd] = useState<MyShopAdDto | null>(null);

  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MyProductDto | null>(null);
  const [serviceFormOpen, setServiceFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<MyServiceDto | null>(null);
  const [adFormOpen, setAdFormOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<MyShopAdDto | null>(null);

  async function refresh() {
    const qs = providerId ? `?shop=${providerId}` : "";
    const [productsData, servicesData, adsData, requestsData, providerData] =
      await Promise.all([
        fetch(`/api/me/products${qs}`).then((res) => res.json()),
        fetch(`/api/me/services${qs}`).then((res) => res.json()),
        fetch(`/api/me/shop-ads${qs}`).then((res) => res.json()),
        canManageRequests
          ? fetch(`/api/me/requests${qs}`).then((res) => res.json())
          : Promise.resolve({ requests }),
        fetch(`/api/me/provider${qs}`).then((res) => res.json()),
      ]);
    setProducts(productsData.products ?? []);
    setServices(servicesData.services ?? []);
    setAds(adsData.ads ?? []);
    setRequests(requestsData.requests ?? []);
    // A badge payment completing flips verification without a reload.
    setVerifiedUntilState(providerData.profile?.verifiedUntil ?? null);
  }

  // Creating a shop (or switching to a different one) needs a fresh
  // server-render — the selected shop drives which data every /api/me/*
  // fetch and server action targets.
  function selectShop(id: string) {
    if (id !== providerId) router.push(`/shop/manage?shop=${id}`);
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
        row.radiusKm == null
          ? `Universal (KES ${PROMOTION_UNIVERSAL_RATE_KES}/day)`
          : `Within ${row.radiusKm} km (KES ${PROMOTION_LOCAL_RATE_KES}/day)`,
    },
    {
      key: "payment",
      header: "Payment",
      stopRowClick: true,
      render: (row) => <AdPaymentCell ad={row} onPay={() => setPromoPayAd(row)} />,
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

  const requestColumns: DataTableColumn<MyRequestDto>[] = [
    {
      key: "customer",
      header: "Customer",
      sortable: true,
      sortValue: (row) => row.customerName.toLowerCase(),
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.customerName}</span>
          <span className="text-xs text-muted-foreground">{row.customerPhone}</span>
        </div>
      ),
    },
    {
      key: "service",
      header: "Needs",
      render: (row) => (
        <Badge variant="secondary">
          {SERVICE_TYPE_LABELS[row.serviceType as ServiceType] ?? row.serviceType}
        </Badge>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (row) => (
        <a
          href={`https://www.google.com/maps?q=${row.latitude},${row.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <MapPin className="size-3.5" /> Open in Maps
        </a>
      ),
    },
    {
      key: "received",
      header: "Received",
      sortable: true,
      sortValue: (row) => new Date(row.createdAt).getTime(),
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
    {
      key: "status",
      header: "Status",
      stopRowClick: true,
      sortable: true,
      sortValue: (row) => row.status,
      render: (row) => <RequestStatusCell request={row} onChanged={refresh} />,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Manage your shop</h1>
          <p className="text-sm text-muted-foreground">
            Products, services, promotions, and rescue requests from customers.
          </p>
          {hasProvider && !verifiedState && (
            <p className="text-xs text-amber-600 dark:text-amber-500">
              Unverified — customers can only find your shop within 100m.
              Get verified to be discoverable at your normal search radius.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {shops.length > 1 && (
            <Select
              value={providerId ?? undefined}
              onValueChange={(value) => value && selectShop(value)}
            >
              <SelectTrigger size="sm" className="w-44">
                <Store className="size-3.5" />
                <SelectValue placeholder="Select shop" />
              </SelectTrigger>
              <SelectContent>
                {shops.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id}>
                    {shop.businessName}
                    {shop.role === "member" ? " (team)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {hasProvider && (
            <div className="flex flex-col items-end gap-1">
              {verifiedState && (
                <Badge variant="secondary" className="gap-1">
                  <BadgeCheck className="size-3.5" /> Verified until{" "}
                  {verifiedThrough!.toLocaleDateString()}
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={() => setBadgePayOpen(true)}>
                <ShieldCheck />
                {verifiedState
                  ? "Extend verification"
                  : `Get verified — KES ${VERIFICATION_BADGE_RATE_KES}/day`}
              </Button>
            </div>
          )}
          {hasProvider && (
            <Button
              variant="outline"
              onClick={() => setProfileMode({ providerId: null })}
            >
              <Plus /> Add shop
            </Button>
          )}
          {hasProvider && (
            <Button
              variant="outline"
              onClick={() => setProfileMode({ providerId })}
            >
              <Settings2 /> Shop profile
            </Button>
          )}
          <Link href="/" className={buttonVariants({ variant: "ghost" })}>
            <ArrowLeft /> Back
          </Link>
        </div>
      </div>

      {!hasProvider ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Post your service listing first, then come back to add products,
            services, and promotions.
          </p>
          <Button onClick={() => setProfileMode({ providerId: null })}>
            Post your service
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="products">
          <TabsList>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="promotions">Promotions</TabsTrigger>
            {canManageRequests && (
              <TabsTrigger value="requests">Requests</TabsTrigger>
            )}
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

          {canManageRequests && (
            <TabsContent value="requests" className="flex flex-col gap-3 pt-4">
              <p className="text-sm text-muted-foreground">
                Customers share their location when they request a rescue —
                open it in Maps to see exactly where they are.
              </p>
              <DataTable
                columns={requestColumns}
                data={requests}
                searchPlaceholder="Search requests…"
                searchValue={(row) => `${row.customerName} ${row.customerPhone}`}
                filters={[
                  {
                    key: "status",
                    label: "Status",
                    options: REQUEST_STATUSES.map((status) => ({
                      value: status,
                      label: status.charAt(0) + status.slice(1).toLowerCase(),
                    })),
                    predicate: (row, value) => row.status === value,
                  },
                ]}
                emptyMessage="No rescue requests yet."
              />
            </TabsContent>
          )}
        </Tabs>
      )}

      <ProductFormModal
        open={productFormOpen}
        onOpenChange={setProductFormOpen}
        product={editingProduct}
        providerId={providerId ?? ""}
        onSaved={refresh}
      />
      <ServiceFormModal
        open={serviceFormOpen}
        onOpenChange={setServiceFormOpen}
        service={editingService}
        providerId={providerId ?? ""}
        onSaved={refresh}
      />
      <ShopAdFormModal
        open={adFormOpen}
        onOpenChange={setAdFormOpen}
        ad={editingAd}
        products={products}
        providerId={providerId ?? ""}
        onSaved={refresh}
      />
      <ProviderProfileFormModal
        open={profileMode !== null}
        onOpenChange={(open) => !open && setProfileMode(null)}
        providerId={profileMode?.providerId ?? null}
        onSaved={(id) => {
          setProfileMode(null);
          selectShop(id);
          // Editing the currently-selected shop is a no-op navigation —
          // refresh in place to pick up the change instead.
          if (id === providerId) refresh();
        }}
        onDeleted={() => {
          setProfileMode(null);
          // Deleting always targets the currently-selected shop (the only
          // one "Shop profile" ever edits) — hand off to the server to
          // resolve whichever shop is next, if any.
          router.push("/shop/manage");
        }}
      />
      {hasProvider && (
        <MpesaPayModal
          open={badgePayOpen}
          onOpenChange={setBadgePayOpen}
          purpose="BADGE"
          providerId={providerId!}
          onPaid={refresh}
        />
      )}
      {promoPayAd && (
        <MpesaPayModal
          open={promoPayAd !== null}
          onOpenChange={(open) => !open && setPromoPayAd(null)}
          purpose="PROMOTION"
          shopAdId={promoPayAd.id}
          isUniversal={promoPayAd.radiusKm == null}
          onPaid={refresh}
        />
      )}
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

function AdPaymentCell({
  ad,
  onPay,
}: {
  ad: MyShopAdDto;
  onPay: () => void;
}) {
  const paidThrough = ad.expiresAt ? new Date(ad.expiresAt) : null;
  const live = paidThrough != null && paidThrough > new Date();

  return (
    <div className="flex flex-col items-start gap-1">
      <span className="text-xs text-muted-foreground">
        {live
          ? `Paid until ${paidThrough!.toLocaleDateString()}`
          : paidThrough
            ? "Expired"
            : "Not paid"}
      </span>
      <Button variant="outline" size="sm" onClick={onPay}>
        {live ? "Extend" : "Pay"}
      </Button>
    </div>
  );
}

function RequestStatusCell({
  request,
  onChanged,
}: {
  request: MyRequestDto;
  onChanged: () => void;
}) {
  const [pending, save] = useAsyncAction(async (status: RequestStatus) => {
    const result = await setRequestStatus(request.id, status);
    if (result.success) onChanged();
    else if (result.error) toast.error(result.error);
  });

  return (
    <Select
      value={request.status}
      onValueChange={(value) => value && !pending && save(value as RequestStatus)}
    >
      <SelectTrigger size="sm" className="w-32">
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <SelectValue />}
      </SelectTrigger>
      <SelectContent>
        {REQUEST_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
