import { db } from "@/lib/db";
import { haversineDistanceKm } from "@/lib/geo";
import { parseServiceTypes } from "@/lib/authz";
import {
  toAdColor,
  toAdTextColor,
  UNVERIFIED_VISIBILITY_RADIUS_KM,
  SERVICE_TYPE_LABELS,
  type ServiceType,
} from "@/lib/validations";

function withDistanceAndServiceTypes<
  T extends {
    latitude: number;
    longitude: number;
    serviceTypes: string;
    isVerified: boolean;
    verifiedUntil: Date | null;
  },
>(
  providers: T[],
  { latitude, longitude, radiusKm, serviceType }: {
    latitude: number;
    longitude: number;
    radiusKm: number;
    serviceType?: ServiceType;
  },
) {
  const now = new Date();
  return providers
    .map((provider) => ({
      ...provider,
      // Verification is a paid, day-based window (like a ShopAd promotion)
      // — overrides the raw isVerified column with whether that window is
      // still live, so every DTO built from this (ShopDto included) reflects
      // the current, not merely the last-paid, state.
      isVerified:
        provider.isVerified && provider.verifiedUntil != null && provider.verifiedUntil > now,
      serviceTypes: parseServiceTypes(provider.serviceTypes),
      distanceKm: haversineDistanceKm(
        latitude,
        longitude,
        provider.latitude,
        provider.longitude,
      ),
    }))
    .filter((provider) => {
      // Unverified shops (the default — see the KES 20/day badge in
      // app/actions/payment.ts#initiateBadgePayment) are only discoverable
      // within a fixed short radius, no matter how wide the customer's own
      // search radius is.
      const effectiveRadiusKm = provider.isVerified
        ? radiusKm
        : Math.min(radiusKm, UNVERIFIED_VISIBILITY_RADIUS_KM);
      return provider.distanceKm <= effectiveRadiusKm;
    })
    .filter((provider) =>
      serviceType ? provider.serviceTypes.includes(serviceType) : true,
    )
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

// A promotion only counts as live once it's been paid for and hasn't
// expired — see app/api/mpesa/callback/route.ts, which is what actually
// sets expiresAt once a promotion payment completes. Built fresh per call
// (not a module-level constant) so `now` is never stale.
function shopInclude() {
  return {
    products: { orderBy: { createdAt: "desc" as const } },
    services: { orderBy: { createdAt: "desc" as const } },
    shopAds: {
      where: { isActive: true, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" as const },
    },
  };
}

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

// Words filtered out of a search query before matching, so a filler word
// doesn't widen results to near-everything (falls back to the unfiltered
// tokens if a query is made up of nothing else — see matchesQuery below).
const SEARCH_STOPWORDS = new Set([
  "a", "an", "the", "for", "and", "or", "in", "at", "of", "to", "with", "near", "me",
]);

// A stray typo like a trailing comma ("brakes," instead of "brakes" — an
// advertiser fat-fingering a promoted product name) otherwise breaks every
// match: "brakes," is never a substring of "brakes" followed by a space, so
// the ad's own "Find nearby shops" CTA would return nothing for a shop that
// plainly stocks it. Stripping punctuation before comparing, on both the
// query and everything it's matched against, makes that class of typo
// harmless instead of a silent zero-results bug.
function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .trim();
}

// A customer's search text ("mechanic for motorcycle") is a phrase, not a
// literal substring anyone typed into a shop's listing — matching the whole
// string against just the business name/product names (the old behavior)
// missed shops that plainly offer what was asked for, like a shop named
// "Busia Spareparts and Mechanics" not matching "mechanic for motorcycle"
// because that exact phrase never appears anywhere. Splitting into words and
// matching any one of them against every searchable field — business name,
// service category, itemized services, and products — covers what the
// customer is actually asking for.
function matchesQuery(
  shop: {
    businessName: string;
    description: string | null;
    serviceTypes: string;
    products: { name: string; description: string | null }[];
    services: { name: string; description: string | null }[];
  },
  q: string,
) {
  const allTokens = normalizeSearchText(q).split(/\s+/).filter(Boolean);
  if (allTokens.length === 0) return true;
  const tokens = allTokens.filter(
    (token) => token.length > 1 && !SEARCH_STOPWORDS.has(token),
  );
  const effectiveTokens = tokens.length > 0 ? tokens : allTokens;

  const categoryLabels = parseServiceTypes(shop.serviceTypes).map(
    (type) => SERVICE_TYPE_LABELS[type as ServiceType] ?? type,
  );
  const haystack = normalizeSearchText(
    [
      shop.businessName,
      shop.description ?? "",
      ...categoryLabels,
      ...shop.products.flatMap((p) => [p.name, p.description ?? ""]),
      ...shop.services.flatMap((s) => [s.name, s.description ?? ""]),
    ].join(" "),
  );

  return effectiveTokens.some((token) => haystack.includes(token));
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
    include: shopInclude(),
  });

  const matching = params.q
    ? providers.filter((shop) => matchesQuery(shop, params.q!))
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
    include: shopInclude(),
  });
  if (!shop) return null;

  const [withDistance] = withDistanceAndServiceTypes([shop], {
    latitude,
    longitude,
    radiusKm: Infinity,
  });
  // Unverified shops are still capped to the short discovery radius (see
  // withDistanceAndServiceTypes) even when linked to directly — the filter
  // above can legitimately drop the only row.
  if (!withDistance) return null;
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
    where: { isActive: true, expiresAt: { gt: new Date() } },
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
    include: { ...ADMIN_SHOP_REF, product: { select: { name: true } } },
  });
}

// Every M-Pesa payment (promotion or verification-badge) across every shop —
// lets an admin audit money actually moving through the platform, including
// ones that never completed (see app/api/mpesa/callback/route.ts, the only
// other place Payment rows are written to).
export function getAllPaymentsForAdmin() {
  return db.payment.findMany({
    orderBy: { createdAt: "desc" },
    include: ADMIN_SHOP_REF,
  });
}

// Every rescue request across every shop — customers never sign in to send
// one (see prisma/schema.prisma's RescueRequest comment), so this is an
// admin's only platform-wide view of them; otherwise they're only visible
// one shop at a time via getIncomingRequests.
export function getAllRescueRequestsForAdmin() {
  return db.rescueRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: ADMIN_SHOP_REF,
  });
}

// Every signed-in account, platform-wide — not just staff or shop owners.
// Most users never touch a role table at all (rescue requesters don't even
// sign in, per RescueRequest's schema comment), so this is the only place an
// admin can see the full account list; role/shop badges are derived
// client-side from the included relations.
export function getAllUsersForAdmin() {
  return db.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      providerProfiles: { select: { businessName: true } },
      platformMember: { select: { role: { select: { name: true } } } },
      shopMemberships: {
        select: {
          role: { select: { name: true } },
          provider: { select: { businessName: true } },
        },
      },
    },
  });
}

// Backs both the admin page's initial (server-rendered) load and its
// /api/admin/data poll (components/admin/admin-dashboard.tsx refreshes this
// every 5s) — one place computing the exact same shape either way.
export async function getAdminDashboardData() {
  const [
    roles,
    members,
    rawProviders,
    brandAds,
    products,
    services,
    shopAds,
    payments,
    rescueRequests,
    users,
  ] = await Promise.all([
    getPlatformRoles(),
    getPlatformMembers(),
    getAllProvidersForAdmin(),
    getAllBrandAdsForAdmin(),
    getAllProductsForAdmin(),
    getAllServicesForAdmin(),
    getAllShopAdsForAdmin(),
    getAllPaymentsForAdmin(),
    getAllRescueRequestsForAdmin(),
    getAllUsersForAdmin(),
  ]);

  const providers = rawProviders.map((provider) => ({
    ...provider,
    serviceTypes: parseServiceTypes(provider.serviceTypes),
  }));

  return {
    roles,
    members,
    providers,
    brandAds,
    products,
    services,
    shopAds,
    payments,
    rescueRequests,
    users,
  };
}
