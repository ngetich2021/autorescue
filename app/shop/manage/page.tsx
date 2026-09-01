import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getMyShopId } from "@/lib/authz";
import { getMyProducts, getMyServices, getMyShopAds } from "@/lib/queries";
import { ShopManageDashboard } from "@/components/shops/shop-manage-dashboard";

export const metadata: Metadata = {
  title: "Manage shop — AutoRescue",
};

// Fully dynamic in practice (auth() reads cookies) — see app/admin/page.tsx
// for the same note. Fetched here so the tables have real data on first
// paint instead of a loading skeleton on every visit.
export const revalidate = 10;

export default async function ShopManagePage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const providerId = await getMyShopId(session.user.id);
  const [products, services, ads] = providerId
    ? await Promise.all([
        getMyProducts(providerId),
        getMyServices(providerId),
        getMyShopAds(providerId),
      ])
    : [[], [], []];

  return (
    <ShopManageDashboard
      hasProvider={providerId !== null}
      initialProducts={products}
      initialServices={services}
      initialAds={ads}
    />
  );
}
