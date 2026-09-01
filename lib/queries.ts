import { db } from "@/lib/db";
import { haversineDistanceKm } from "@/lib/geo";
import { parseServiceTypes } from "@/lib/authz";
import { toAdColor, toAdTextColor, type ServiceType } from "@/lib/validations";

function withDistanceAndServiceTypes<
  T extends { latitude: number; longitude: number; serviceTypes: string },
>(
  providers: T[],
  { latitude, longitude, radiusKm, serviceType }: {
    latitude: number;
    longitude: number;
    radiusKm: number;
    serviceType?: ServiceType;
  },
) {
  return providers
    .map((provider) => ({
      ...provider,
      serviceTypes: parseServiceTypes(provider.serviceTypes),
      distanceKm: haversineDistanceKm(
        latitude,
        longitude,
        provider.latitude,
        provider.longitude,
      ),
    }))
    .filter((provider) => provider.distanceKm <= radiusKm)
    .filter((provider) =>
      serviceType ? provider.serviceTypes.includes(serviceType) : true,
    )
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

const SHOP_INCLUDE = {
  products: { orderBy: { createdAt: "desc" as const } },
  services: { orderBy: { createdAt: "desc" as const } },
  shopAds: { where: { isActive: true }, orderBy: { createdAt: "desc" as const } },
};

// Shared shaping for a provider row (with products/shopAds included) into
// the DTO the shop-facing UI (ShopCard, ShopProductsModal) expects.
function toShopDto<
  T extends {
    distanceKm: number;
    serviceTypes: string[];
    shopAds: { id: string; radiusKm: number | null }[];
  },
>(shop: T) {
  const { shopAds, ...rest } = shop;
  const featuredAd =
    shopAds.find((ad) => ad.radiusKm == null || shop.distanceKm <= ad.radiusKm) ??
    null;
  return { ...rest, featuredAd };
}

function matchesProductQuery(
  shop: { businessName: string; products: { name: string }[] },
  q: string,
) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  if (shop.businessName.toLowerCase().includes(needle)) return true;
  return shop.products.some((p) => p.name.toLowerCase().includes(needle));
}

// Every active provider within range — a rescuer, a shop, or (usually) both
// at once, since they're the same account. No longer filtered to
// "has products" (that used to be the sole "Shops" query); the UI decides
// per-card whether to show "Request rescue", "View shop", or both.
export async function getNearbyProviders(params: {
  latitude: number;
  longitude: number;
  radiusKm: number;
  serviceType?: ServiceType;
  q?: string;
}) {
  const providers = await db.providerProfile.findMany({
    where: { isActive: true },
    include: SHOP_INCLUDE,
  });

  const matching = params.q
    ? providers.filter((shop) => matchesProductQuery(shop, params.q!))
    : providers;

  return withDistanceAndServiceTypes(matching, params).map(toShopDto);
}

// Fetches one specific shop by id (used when a customer arrives via a
// promoted-product CTA that names a specific shop) with the same distance
// and featured-ad shaping as getNearbyShops.
export async function getShopWithDistance(
  providerId: string,
  { latitude, longitude }: { latitude: number; longitude: number },
) {
  const shop = await db.providerProfile.findFirst({
    where: { id: providerId, isActive: true },
    include: SHOP_INCLUDE,
  });
  if (!shop) return null;

  const [withDistance] = withDistanceAndServiceTypes([shop], {
    latitude,
    longitude,
    radiusKm: Infinity,
  });
  return toShopDto(withDistance);
}

export async function getActiveBrandAds() {
  const ads = await db.brandAd.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  return ads.map((ad) => ({
    ...ad,
    bgColor: toAdColor(ad.bgColor),
    textColor: toAdTextColor(ad.textColor),
    ctaColor: toAdColor(ad.ctaColor),
  }));
}

// Active product promos across all shops, shown alongside brand ads in the
// hero carousel (components/ads/hero-banner.tsx). Visibility/localisation
// reuses the shop's own coordinates + the ad's radiusKm, the same shape as
// brand-ad targeting.
export async function getActiveShopAdsForHero() {
  const ads = await db.shopAd.findMany({
    where: { isActive: true },
    include: { provider: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  return ads.map((ad) => ({
    id: ad.id,
    providerId: ad.providerId,
    title: ad.title,
    description: ad.description,
    imageUrl: ad.imageUrl,
    radiusKm: ad.radiusKm,
    latitude: ad.provider.latitude,
    longitude: ad.provider.longitude,
  }));
}

export function getMyShopAds(providerId: string) {
  return db.shopAd.findMany({
    where: { providerId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getMyBrandAds(userId: string) {
  const ads = await db.brandAd.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return ads.map((ad) => ({ ...ad, bgColor: toAdColor(ad.bgColor) }));
}

export function getMyProducts(providerId: string) {
  return db.product.findMany({
    where: { providerId },
    orderBy: { createdAt: "desc" },
  });
}

export function getMyServices(providerId: string) {
  return db.service.findMany({
    where: { providerId },
    orderBy: { createdAt: "desc" },
  });
}

export function getIncomingRequests(providerId: string) {
  return db.rescueRequest.findMany({
    where: { providerId },
    orderBy: { createdAt: "desc" },
  });
}

export function getShopById(providerId: string) {
  return db.providerProfile.findUnique({ where: { id: providerId } });
}

export function getShopRoles(providerId: string) {
  return db.shopRole.findMany({
    where: { providerId },
    orderBy: { createdAt: "asc" },
  });
}

export function getShopMembers(providerId: string) {
  return db.shopMember.findMany({
    where: { providerId },
    include: {
      role: true,
      user: { select: { name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export function getPlatformRoles() {
  return db.platformRole.findMany({ orderBy: { createdAt: "asc" } });
}

export function getPlatformMembers() {
  return db.platformMember.findMany({
    include: {
      role: true,
      user: { select: { name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export function getAllProvidersForAdmin() {
  return db.providerProfile.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });
}

export async function getAllBrandAdsForAdmin() {
  const ads = await db.brandAd.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });
  return ads.map((ad) => ({
    ...ad,
    textColor: toAdTextColor(ad.textColor),
    ctaColor: toAdColor(ad.ctaColor),
  }));
}

// Every product across every shop, with enough of the owning shop attached
// (business name + owner) that an admin can trace a row straight back to its
// shop without a second lookup — same shape the Providers tab already uses.
const ADMIN_SHOP_REF = {
  provider: {
    select: {
      businessName: true,
      user: { select: { name: true, email: true } },
    },
  },
};

export function getAllProductsForAdmin() {
  return db.product.findMany({
    orderBy: { createdAt: "desc" },
    include: ADMIN_SHOP_REF,
  });
}

export function getAllServicesForAdmin() {
  return db.service.findMany({
    orderBy: { createdAt: "desc" },
    include: ADMIN_SHOP_REF,
  });
}

export function getAllShopAdsForAdmin() {
  return db.shopAd.findMany({
    orderBy: { createdAt: "desc" },
    include: ADMIN_SHOP_REF,
  });
}

// Backs both the admin page's initial (server-rendered) load and its
// /api/admin/data poll (components/admin/admin-dashboard.tsx refreshes this
// every 5s) — one place computing the exact same shape either way.
export async function getAdminDashboardData() {
  const [roles, members, rawProviders, brandAds, products, services, shopAds] =
    await Promise.all([
      getPlatformRoles(),
      getPlatformMembers(),
      getAllProvidersForAdmin(),
      getAllBrandAdsForAdmin(),
      getAllProductsForAdmin(),
      getAllServicesForAdmin(),
      getAllShopAdsForAdmin(),
    ]);

  const providers = rawProviders.map((provider) => ({
    ...provider,
    serviceTypes: parseServiceTypes(provider.serviceTypes),
  }));

  return { roles, members, providers, brandAds, products, services, shopAds };
}
