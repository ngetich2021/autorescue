import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getMyShops, resolveRequestedShopId, hasShopPermission } from "@/lib/authz";
import {
  getMyProducts,
  getMyServices,
  getMyShopAds,
  getIncomingRequests,
  getShopById,
} from "@/lib/queries";
import { ShopManageDashboard } from "@/components/shops/shop-manage-dashboard";

export const metadata: Metadata = {
  title: "Manage shop — AutoRescue",
};

// Fully dynamic in practice (auth() reads cookies) — see app/admin/page.tsx
// for the same note. Fetched here so the tables have real data on first
// paint instead of a loading skeleton on every visit.
export const revalidate = 10;

export default async function ShopManagePage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");

  const { shop: requestedShop } = await searchParams;
  const shops = await getMyShops(session.user.id);
  const providerId = await resolveRequestedShopId(
    session.user.id,
    requestedShop ?? null,
  );
  const canManageRequests =
    providerId !== null &&
    (await hasShopPermission(session.user.id, providerId, "MANAGE_REQUESTS"));

  const [products, services, ads, requests, provider] = providerId
    ? await Promise.all([
        getMyProducts(providerId),
        getMyServices(providerId),
        getMyShopAds(providerId),
        canManageRequests ? getIncomingRequests(providerId) : Promise.resolve([]),
        getShopById(providerId),
      ])
    : [[], [], [], [], null];

  return (
    <ShopManageDashboard
      providerId={providerId}
      shops={shops}
      canManageRequests={canManageRequests}
      verifiedUntil={provider?.verifiedUntil ?? null}
      initialProducts={products}
      initialServices={services}
      initialAds={ads}
      initialRequests={requests}
    />
  );
}
