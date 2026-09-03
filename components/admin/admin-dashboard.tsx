"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, ArrowLeft, MapPin, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { RoleList } from "@/components/roles/role-list";
import { MemberList, type MemberDto } from "@/components/roles/member-list";
import { MemberInviteForm } from "@/components/roles/member-invite-form";
import type { RoleDto } from "@/components/roles/role-form-modal";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import {
  ProviderDetailModal,
  type ProviderDetailRow,
} from "@/components/admin/provider-detail-modal";
import { AdDetailModal, type AdDetailRow } from "@/components/admin/ad-detail-modal";
import {
  PLATFORM_PERMISSIONS,
  PLATFORM_PERMISSION_LABELS,
} from "@/lib/permissions";
import { SERVICE_TYPE_LABELS, REQUEST_STATUSES, type ServiceType } from "@/lib/validations";
import {
  createPlatformRole,
  updatePlatformRole,
  deletePlatformRole,
  invitePlatformMember,
  updatePlatformMemberRole,
  removePlatformMember,
} from "@/app/actions/roles";
import {
  adminSetProviderActive,
  adminSetAdActive,
  adminSetShopAdActive,
} from "@/app/actions/admin";
import { useAsyncAction } from "@/lib/use-async-action";

const PERMISSION_CATALOG = PLATFORM_PERMISSIONS.map((key) => ({
  key,
  label: PLATFORM_PERMISSION_LABELS[key],
}));

// Single source of truth for what a table row carries — identical to what
// the corresponding detail modal needs, so clicking a row always has every
// field the modal shows on hand already (no second fetch).
type ProviderRow = ProviderDetailRow;
type AdRow = AdDetailRow;

// Shop-owned rows (products/services/promotions) all carry the same
// "who owns this" reference, so clicking any of them can trace straight back
// to the owning shop's own detail modal — no separate detail view needed.
type ShopOwnedRef = {
  providerId: string;
  provider: { businessName: string; user: { name: string | null; email: string | null } };
};
type ProductRow = ShopOwnedRef & {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
  createdAt: string | Date;
};
type ServiceRow = ShopOwnedRef & {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  createdAt: string | Date;
};
type ShopAdRow = ShopOwnedRef & {
  id: string;
  title: string;
  radiusKm: number | null;
  isActive: boolean;
  createdAt: string | Date;
};
type PaymentRow = ShopOwnedRef & {
  id: string;
  purpose: string;
  amount: number;
  phone: string;
  status: string;
  days: number | null;
  mpesaReceiptNumber: string | null;
  resultDesc: string | null;
  createdAt: string | Date;
};
type RescueRequestRow = ShopOwnedRef & {
  id: string;
  customerName: string;
  customerPhone: string;
  serviceType: string;
  status: string;
  latitude: number;
  longitude: number;
  createdAt: string | Date;
};

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string | Date;
  providerProfiles: { businessName: string }[];
  platformMember: { role: { name: string } } | null;
  shopMemberships: { role: { name: string }; provider: { businessName: string } }[];
};

const PAYMENT_PURPOSE_LABELS: Record<string, string> = {
  PROMOTION: "Promotion",
  BADGE: "Verification badge",
};

function paymentStatusVariant(status: string): "secondary" | "destructive" | "outline" {
  if (status === "COMPLETED") return "secondary";
  if (status === "FAILED") return "destructive";
  return "outline";
}

// Verification is now a paid, day-based window (like a ShopAd promotion) —
// the raw isVerified column only says a badge payment has ever completed,
// so "currently verified" also needs verifiedUntil to still be in the
// future — same check as lib/queries.ts#withDistanceAndServiceTypes.
function isCurrentlyVerified(row: { isVerified: boolean; verifiedUntil: string | Date | null }) {
  return row.isVerified && row.verifiedUntil != null && new Date(row.verifiedUntil) > new Date();
}

const POLL_INTERVAL_MS = 5000;

type AdminDashboardData = {
  roles: RoleDto[];
  members: MemberDto[];
  providers: ProviderRow[];
  brandAds: AdRow[];
  products: ProductRow[];
  services: ServiceRow[];
  shopAds: ShopAdRow[];
  payments: PaymentRow[];
  rescueRequests: RescueRequestRow[];
  users: UserRow[];
};

export function AdminDashboard({ initialData }: { initialData: AdminDashboardData }) {
  const [roles, setRoles] = useState<RoleDto[]>(initialData.roles);
  const [members, setMembers] = useState<MemberDto[]>(initialData.members);
  const [providers, setProviders] = useState<ProviderRow[]>(initialData.providers);
  const [brandAds, setBrandAds] = useState<AdRow[]>(initialData.brandAds);
  const [products, setProducts] = useState<ProductRow[]>(initialData.products);
  const [services, setServices] = useState<ServiceRow[]>(initialData.services);
  const [shopAds, setShopAds] = useState<ShopAdRow[]>(initialData.shopAds);
  const [payments, setPayments] = useState<PaymentRow[]>(initialData.payments);
  const [rescueRequests, setRescueRequests] = useState<RescueRequestRow[]>(
    initialData.rescueRequests,
  );
  const [users, setUsers] = useState<UserRow[]>(initialData.users);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);

  const loadingRef = useRef(false);
  const warnedRef = useRef(false);

  async function load() {
    // A stalled request (DB outage) can outlive the 5s poll tick — without
    // this guard, every subsequent tick fires another overlapping fetch on
    // top of the one still hanging, piling up concurrent requests against an
    // already-unavailable database.
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const res = await fetch("/api/admin/data", { cache: "no-store" });
      const data = res.ok ? await res.json() : null;
      if (data) {
        setRoles(data.roles ?? []);
        setMembers(data.members ?? []);
        setProviders(data.providers ?? []);
        setBrandAds(data.brandAds ?? []);
        setProducts(data.products ?? []);
        setServices(data.services ?? []);
        setShopAds(data.shopAds ?? []);
        setPayments(data.payments ?? []);
        setRescueRequests(data.rescueRequests ?? []);
        setUsers(data.users ?? []);
        warnedRef.current = false;
      } else if (!warnedRef.current) {
        warnedRef.current = true;
        toast.error("Couldn't refresh admin data — database unavailable.");
      }
    } catch {
      if (!warnedRef.current) {
        warnedRef.current = true;
        toast.error("Couldn't refresh admin data — database unavailable.");
      }
    } finally {
      loadingRef.current = false;
    }
  }

  // The page already renders with initialData — no fetch-then-skeleton gap
  // on load. This just keeps the tables current afterwards (staff approving
  // an ad, another admin editing a role, etc. all show up within 5s without
  // a manual refresh).
  useEffect(() => {
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Re-derived from the latest fetch on every render (not a snapshot copy),
  // so a save inside the modal (e.g. appearance, activate/deactivate) is
  // reflected there the instant `load()` finishes.
  const selectedProvider = providers.find((p) => p.id === selectedProviderId) ?? null;
  const selectedAd = brandAds.find((a) => a.id === selectedAdId) ?? null;

  const providerColumns: DataTableColumn<ProviderRow>[] = [
    {
      key: "businessName",
      header: "Business",
      sortable: true,
      sortValue: (row) => row.businessName.toLowerCase(),
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.businessName}</span>
          <span className="text-xs text-muted-foreground">
            {row.user.name ?? row.user.email}
          </span>
        </div>
      ),
    },
    {
      key: "services",
      header: "Services",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.serviceTypes.map((type) => (
            <Badge key={type} variant="secondary" className="text-xs">
              {SERVICE_TYPE_LABELS[type as ServiceType] ?? type}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (row) => (row.isActive ? 1 : 0),
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          <Badge variant={row.isActive ? "secondary" : "outline"}>
            {row.isActive ? "Active" : "Deactivated"}
          </Badge>
          {isCurrentlyVerified(row) && (
            <Badge variant="secondary" className="gap-1">
              <BadgeCheck className="size-3" /> Verified until{" "}
              {new Date(row.verifiedUntil!).toLocaleDateString()}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      stopRowClick: true,
      render: (row) => <ProviderActionCell provider={row} onChanged={load} />,
    },
  ];

  const adColumns: DataTableColumn<AdRow>[] = [
    {
      key: "title",
      header: "Ad",
      sortable: true,
      sortValue: (row) => row.title.toLowerCase(),
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.title}</span>
          <span className="text-xs text-muted-foreground">
            {row.user?.name ?? row.user?.email ?? row.advertiserName ?? "Anonymous submission"}
          </span>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      render: (row) => (
        <div className="flex flex-col text-xs text-muted-foreground">
          <span>{row.contactEmail}</span>
          <span>{row.contactPhone}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (row) => (row.isActive ? 1 : 0),
      render: (row) => (
        <Badge variant={row.isActive ? "secondary" : "outline"}>
          {row.isActive ? "Active" : row.user ? "Deactivated" : "Pending review"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      stopRowClick: true,
      render: (row) => <AdActionCell ad={row} onChanged={load} />,
    },
  ];

  // Shared "which shop is this" column for the products/services/promotions
  // tabs below — clicking a row opens that shop's own detail modal, so an
  // admin can trace any listing straight back to who owns it.
  function shopColumn<T extends ShopOwnedRef>(): DataTableColumn<T> {
    return {
      key: "shop",
      header: "Shop",
      sortable: true,
      sortValue: (row) => row.provider.businessName.toLowerCase(),
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.provider.businessName}</span>
          <span className="text-xs text-muted-foreground">
            {row.provider.user.name ?? row.provider.user.email}
          </span>
        </div>
      ),
    };
  }

  const productColumns: DataTableColumn<ProductRow>[] = [
    { key: "name", header: "Product", sortable: true, sortValue: (row) => row.name.toLowerCase(), render: (row) => row.name },
    shopColumn<ProductRow>(),
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
  ];

  const serviceColumns: DataTableColumn<ServiceRow>[] = [
    { key: "name", header: "Service", sortable: true, sortValue: (row) => row.name.toLowerCase(), render: (row) => row.name },
    shopColumn<ServiceRow>(),
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

  const shopAdColumns: DataTableColumn<ShopAdRow>[] = [
    { key: "title", header: "Promotion", sortable: true, sortValue: (row) => row.title.toLowerCase(), render: (row) => row.title },
    shopColumn<ShopAdRow>(),
    {
      key: "reach",
      header: "Reach",
      render: (row) => (row.radiusKm == null ? "Universal" : `Within ${row.radiusKm} km`),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (row) => (row.isActive ? 1 : 0),
      render: (row) => (
        <Badge variant={row.isActive ? "secondary" : "outline"}>
          {row.isActive ? "Active" : "Paused"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      stopRowClick: true,
      render: (row) => <ShopAdActionCell ad={row} onChanged={load} />,
    },
  ];

  const paymentColumns: DataTableColumn<PaymentRow>[] = [
    shopColumn<PaymentRow>(),
    {
      key: "purpose",
      header: "For",
      sortable: true,
      sortValue: (row) => row.purpose,
      render: (row) => PAYMENT_PURPOSE_LABELS[row.purpose] ?? row.purpose,
    },
    {
      key: "coverage",
      header: "Coverage",
      sortable: true,
      sortValue: (row) => new Date(row.createdAt).getTime(),
      render: (row) => {
        // Only a PROMOTION payment buys a time-boxed window (days is unset
        // for BADGE — that's a one-time, non-expiring fee, see
        // app/actions/payment.ts#initiateBadgePayment). A payment that never
        // completed never actually bought any coverage.
        if (row.status === "FAILED") {
          return <span className="text-xs text-muted-foreground">—</span>;
        }
        if (!row.days) {
          return <span className="text-xs text-muted-foreground">One-time</span>;
        }
        const start = new Date(row.createdAt);
        const end = new Date(start.getTime() + row.days * 24 * 60 * 60 * 1000);
        return (
          <span className="text-xs">
            {start.toLocaleDateString()} – {end.toLocaleDateString()}
          </span>
        );
      },
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      sortValue: (row) => row.amount,
      render: (row) => `KES ${row.amount.toLocaleString()}`,
    },
    { key: "phone", header: "Phone", render: (row) => row.phone },
    {
      key: "receipt",
      header: "Receipt",
      render: (row) => row.mpesaReceiptNumber ?? "—",
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (row) => row.status,
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <Badge variant={paymentStatusVariant(row.status)}>{row.status}</Badge>
          {row.status === "FAILED" && row.resultDesc && (
            <span className="text-xs text-muted-foreground">{row.resultDesc}</span>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Paid on",
      sortable: true,
      sortValue: (row) => new Date(row.createdAt).getTime(),
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
  ];

  const rescueRequestColumns: DataTableColumn<RescueRequestRow>[] = [
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
    shopColumn<RescueRequestRow>(),
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
      stopRowClick: true,
      render: (row) => (
        <a
          href={`https://www.google.com/maps?q=${row.latitude},${row.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-primary hover:underline"
        >
          <MapPin className="size-3.5" /> Open in Maps
        </a>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (row) => row.status,
      render: (row) => (
        <Badge variant={row.status === "COMPLETED" ? "secondary" : "outline"}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Date",
      sortable: true,
      sortValue: (row) => new Date(row.createdAt).getTime(),
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
  ];

  const userColumns: DataTableColumn<UserRow>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (row) => (row.name ?? row.email ?? "").toLowerCase(),
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.name ?? "—"}</span>
          <span className="text-xs text-muted-foreground">{row.email}</span>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (row) => row.phone ?? "—",
    },
    {
      key: "roles",
      header: "Role",
      render: (row) => {
        const badges: React.ReactNode[] = [];
        for (const shop of row.providerProfiles) {
          badges.push(
            <Badge key={`owner-${shop.businessName}`} variant="secondary">
              Owner · {shop.businessName}
            </Badge>,
          );
        }
        if (row.platformMember) {
          badges.push(
            <Badge key="platform" variant="outline">
              Staff · {row.platformMember.role.name}
            </Badge>,
          );
        }
        for (const membership of row.shopMemberships) {
          badges.push(
            <Badge key={`shop-${membership.provider.businessName}`} variant="outline">
              {membership.provider.businessName} · {membership.role.name}
            </Badge>,
          );
        }
        if (badges.length === 0) {
          badges.push(
            <Badge key="customer" variant="outline">
              Customer
            </Badge>,
          );
        }
        return <div className="flex flex-wrap gap-1">{badges}</div>;
      },
    },
    {
      key: "createdAt",
      header: "Joined",
      sortable: true,
      sortValue: (row) => new Date(row.createdAt).getTime(),
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Admin</h1>
          <p className="text-sm text-muted-foreground">
            Platform-wide roles, staff, and moderation.
          </p>
        </div>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "ghost" }), "self-start")}
        >
          <ArrowLeft /> Back to app
        </Link>
      </div>

      <Tabs defaultValue="staff">
        <TabsList>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="promotions">Promotions</TabsTrigger>
          <TabsTrigger value="ads">Brand ads</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="requests">Rescue requests</TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="flex flex-col gap-3 pt-4">
          <MemberInviteForm
            roles={roles}
            action={invitePlatformMember}
            onInvited={load}
          />
          <MemberList
            members={members}
            roles={roles}
            updateRoleAction={updatePlatformMemberRole}
            removeAction={removePlatformMember}
            onChanged={load}
          />
        </TabsContent>

        <TabsContent value="roles" className="pt-4">
          <RoleList
            roles={roles}
            permissionCatalog={PERMISSION_CATALOG}
            createAction={createPlatformRole}
            updateAction={(roleId) => updatePlatformRole.bind(null, roleId)}
            deleteAction={deletePlatformRole}
            onChanged={load}
          />
        </TabsContent>

        <TabsContent value="users" className="pt-4">
          <DataTable
            columns={userColumns}
            data={users}
            searchPlaceholder="Search users…"
            searchValue={(row) =>
              `${row.name ?? ""} ${row.email ?? ""} ${row.phone ?? ""} ${row.providerProfiles.map((p) => p.businessName).join(" ")}`
            }
          />
        </TabsContent>

        <TabsContent value="providers" className="pt-4">
          <DataTable
            columns={providerColumns}
            data={providers}
            searchPlaceholder="Search businesses…"
            searchValue={(row) => `${row.businessName} ${row.user.name ?? ""} ${row.user.email ?? ""}`}
            filters={[
              {
                key: "status",
                label: "Status",
                options: [
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Deactivated" },
                ],
                predicate: (row, value) =>
                  value === "active" ? row.isActive : !row.isActive,
              },
              {
                key: "verification",
                label: "Verification",
                options: [
                  { value: "verified", label: "Verified" },
                  { value: "unverified", label: "Unverified" },
                ],
                predicate: (row, value) =>
                  value === "verified" ? isCurrentlyVerified(row) : !isCurrentlyVerified(row),
              },
            ]}
            emptyMessage="No providers yet."
            onRowClick={(row) => setSelectedProviderId(row.id)}
          />
        </TabsContent>

        <TabsContent value="products" className="pt-4">
          <DataTable
            columns={productColumns}
            data={products}
            searchPlaceholder="Search products…"
            searchValue={(row) => `${row.name} ${row.provider.businessName}`}
            emptyMessage="No products yet."
            onRowClick={(row) => setSelectedProviderId(row.providerId)}
          />
        </TabsContent>

        <TabsContent value="services" className="pt-4">
          <DataTable
            columns={serviceColumns}
            data={services}
            searchPlaceholder="Search services…"
            searchValue={(row) => `${row.name} ${row.provider.businessName}`}
            emptyMessage="No services yet."
            onRowClick={(row) => setSelectedProviderId(row.providerId)}
          />
        </TabsContent>

        <TabsContent value="promotions" className="pt-4">
          <DataTable
            columns={shopAdColumns}
            data={shopAds}
            searchPlaceholder="Search promotions…"
            searchValue={(row) => `${row.title} ${row.provider.businessName}`}
            filters={[
              {
                key: "status",
                label: "Status",
                options: [
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Paused" },
                ],
                predicate: (row, value) =>
                  value === "active" ? row.isActive : !row.isActive,
              },
            ]}
            emptyMessage="No promotions yet."
            onRowClick={(row) => setSelectedProviderId(row.providerId)}
          />
        </TabsContent>

        <TabsContent value="ads" className="pt-4">
          <DataTable
            columns={adColumns}
            data={brandAds}
            searchPlaceholder="Search ads…"
            searchValue={(row) =>
              `${row.title} ${row.user?.name ?? ""} ${row.user?.email ?? ""} ${row.advertiserName ?? ""} ${row.contactEmail} ${row.contactPhone}`
            }
            filters={[
              {
                key: "status",
                label: "Status",
                options: [
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive / pending" },
                ],
                predicate: (row, value) =>
                  value === "active" ? row.isActive : !row.isActive,
              },
            ]}
            emptyMessage="No ads yet."
            onRowClick={(row) => setSelectedAdId(row.id)}
          />
        </TabsContent>

        <TabsContent value="payments" className="pt-4">
          <DataTable
            columns={paymentColumns}
            data={payments}
            searchPlaceholder="Search payments…"
            searchValue={(row) =>
              `${row.provider.businessName} ${row.phone} ${row.mpesaReceiptNumber ?? ""} ${PAYMENT_PURPOSE_LABELS[row.purpose] ?? row.purpose}`
            }
            filters={[
              {
                key: "status",
                label: "Status",
                options: [
                  { value: "PENDING", label: "Pending" },
                  { value: "COMPLETED", label: "Completed" },
                  { value: "FAILED", label: "Failed" },
                ],
                predicate: (row, value) => row.status === value,
              },
              {
                key: "purpose",
                label: "For",
                options: [
                  { value: "PROMOTION", label: "Promotion" },
                  { value: "BADGE", label: "Verification badge" },
                ],
                predicate: (row, value) => row.purpose === value,
              },
            ]}
            emptyMessage="No payments yet."
            onRowClick={(row) => setSelectedProviderId(row.providerId)}
          />
        </TabsContent>

        <TabsContent value="requests" className="pt-4">
          <DataTable
            columns={rescueRequestColumns}
            data={rescueRequests}
            searchPlaceholder="Search requests…"
            searchValue={(row) =>
              `${row.customerName} ${row.customerPhone} ${row.provider.businessName}`
            }
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
            onRowClick={(row) => setSelectedProviderId(row.providerId)}
          />
        </TabsContent>
      </Tabs>

      <ProviderDetailModal
        provider={selectedProvider}
        open={selectedProviderId !== null}
        onOpenChange={(open) => !open && setSelectedProviderId(null)}
      />
      <AdDetailModal
        key={selectedAd?.id ?? "none"}
        ad={selectedAd}
        open={selectedAdId !== null}
        onOpenChange={(open) => !open && setSelectedAdId(null)}
        onChanged={load}
      />
    </div>
  );
}

function ProviderActionCell({
  provider,
  onChanged,
}: {
  provider: ProviderRow;
  onChanged: () => void;
}) {
  const [pending, toggle] = useAsyncAction(async () => {
    const result = await adminSetProviderActive(provider.id, !provider.isActive);
    if (result.success) onChanged();
    else if (result.error) toast.error(result.error);
  });

  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => toggle()}>
      {pending && <Loader2 className="animate-spin" />}
      {provider.isActive ? "Deactivate" : "Reactivate"}
    </Button>
  );
}

function ShopAdActionCell({
  ad,
  onChanged,
}: {
  ad: ShopAdRow;
  onChanged: () => void;
}) {
  const [pending, toggle] = useAsyncAction(async () => {
    const result = await adminSetShopAdActive(ad.id, !ad.isActive);
    if (result.success) onChanged();
    else if (result.error) toast.error(result.error);
  });

  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => toggle()}>
      {pending && <Loader2 className="animate-spin" />}
      {ad.isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}

function AdActionCell({ ad, onChanged }: { ad: AdRow; onChanged: () => void }) {
  const [pending, toggle] = useAsyncAction(async () => {
    const result = await adminSetAdActive(ad.id, !ad.isActive);
    if (result.success) onChanged();
    else if (result.error) toast.error(result.error);
  });

  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => toggle()}>
      {pending && <Loader2 className="animate-spin" />}
      {ad.isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}
