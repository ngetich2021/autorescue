import { z } from "zod";

export const SERVICE_TYPES = [
  "MECHANIC",
  "FUEL",
  "TOW",
  "TIRE",
  "BATTERY",
  "LOCKSMITH",
  "OTHER",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  MECHANIC: "Mechanic",
  FUEL: "Fuel delivery",
  TOW: "Towing",
  TIRE: "Tire change",
  BATTERY: "Battery jump-start",
  LOCKSMITH: "Locksmith",
  OTHER: "Other",
};

// A brand ad can skip the photo upload entirely and use a colored card
// instead — the title/description are rendered directly on this background.
export const AD_COLORS = [
  "green",
  "blue",
  "orange",
  "purple",
  "rose",
  "slate",
] as const;

export type AdColor = (typeof AD_COLORS)[number];

export const AD_COLOR_LABELS: Record<AdColor, string> = {
  green: "Green",
  blue: "Blue",
  orange: "Orange",
  purple: "Purple",
  rose: "Rose",
  slate: "Slate",
};

// BrandAd.bgColor is a plain string column (no DB-level enum), so narrow it
// back to AdColor at the read boundary — falls back to the default swatch
// for any stray/legacy value.
export function toAdColor(value: string): AdColor {
  return (AD_COLORS as readonly string[]).includes(value)
    ? (value as AdColor)
    : "green";
}

// Admin-only override for a brand ad's on-image text color, used when a
// poster's own background is too light for the default white overlay text.
export const AD_TEXT_COLORS = ["light", "dark"] as const;

export type AdTextColor = (typeof AD_TEXT_COLORS)[number];

export const AD_TEXT_COLOR_LABELS: Record<AdTextColor, string> = {
  light: "Light (white text)",
  dark: "Dark (black text)",
};

export function toAdTextColor(value: string): AdTextColor {
  return (AD_TEXT_COLORS as readonly string[]).includes(value)
    ? (value as AdTextColor)
    : "light";
}

export const adAppearanceSchema = z.object({
  textColor: z.enum(AD_TEXT_COLORS),
  ctaColor: z.enum(AD_COLORS),
});

export const REQUEST_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

const phoneSchema = z
  .string()
  .trim()
  .min(7, "Enter a valid phone number")
  .max(20, "Enter a valid phone number")
  .regex(/^[0-9+\s-]+$/, "Enter a valid phone number");

const emailSchema = z.email("Enter a valid email").trim();

export const coordsSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

// A target area is either fully unset (universal) or a complete
// lat/lng/radius triple (localised) — never a partial one.
export const targetAreaSchema = z
  .object({
    targetLatitude: z.coerce.number().min(-90).max(90).optional(),
    targetLongitude: z.coerce.number().min(-180).max(180).optional(),
    targetRadiusKm: z.coerce.number().positive().max(500).optional(),
  })
  .refine(
    (v) =>
      (v.targetLatitude === undefined &&
        v.targetLongitude === undefined &&
        v.targetRadiusKm === undefined) ||
      (v.targetLatitude !== undefined &&
        v.targetLongitude !== undefined &&
        v.targetRadiusKm !== undefined),
    { message: "Set a location and radius, or leave targeting off." },
  );

export const providerProfileSchema = z.object({
  businessName: z.string().trim().min(2, "Too short").max(100),
  serviceTypes: z
    .array(z.enum(SERVICE_TYPES))
    .min(1, "Select at least one service"),
  phone: phoneSchema,
  email: emailSchema,
  description: z.string().trim().max(500).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

// Radius inputs across the app are empty by default (never pre-filled) and
// their error messages must echo back exactly what the user typed.
export function parseRadiusKm(
  raw: string,
  { min = 1, max = 100 }: { min?: number; max?: number } = {},
): { value: number } | { error: string } {
  const trimmed = raw.trim();
  if (trimmed === "") return { error: "Enter a radius in km." };
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return { error: `"${trimmed}" isn't a valid radius.` };
  }
  if (value <= 0) {
    return { error: `${trimmed} km must be greater than 0.` };
  }
  if (value < min) {
    return { error: `${trimmed} km is below the ${min} km minimum.` };
  }
  if (value > max) {
    return { error: `${trimmed} km is more than the ${max} km max — try a smaller radius.` };
  }
  return { value };
}

export const productSchema = z.object({
  name: z.string().trim().min(2, "Too short").max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  price: z.coerce.number().int().positive("Enter a valid price"),
  inStock: z.coerce.boolean().optional().default(true),
});

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Too short").max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  price: z.coerce.number().int().positive("Enter a valid price"),
  isAvailable: z.coerce.boolean().optional().default(true),
});

// Contact info is mandatory on every ad — signed-in or anonymous — so
// whoever approves or has questions about it can always reach the advertiser.
export const brandAdSchema = z
  .object({
    title: z.string().trim().min(2, "Too short").max(100),
    // The literal product name customers/shops are matched on — e.g.
    // "Skygo Oil" — kept separate from `title` since that can be a
    // marketing headline instead of the item's actual name.
    productName: z.string().trim().min(2, "Too short").max(100),
    description: z.string().trim().max(300).optional().or(z.literal("")),
    contactEmail: emailSchema,
    contactPhone: phoneSchema,
    bgColor: z.enum(AD_COLORS).optional().default("green"),
  })
  .and(targetAreaSchema);

export const publicBrandAdSchema = brandAdSchema.and(
  z.object({
    advertiserName: z.string().trim().min(2, "Too short").max(100),
  }),
);

export const shopAdSchema = z
  .object({
    title: z.string().trim().min(2, "Too short").max(100),
    description: z.string().trim().max(300).optional().or(z.literal("")),
    productId: z.string().trim().optional().or(z.literal("")),
    radiusKm: z.coerce.number().positive().max(500).optional(),
  })
  .refine((v) => v.radiusKm === undefined || v.radiusKm > 0, {
    message: "Radius must be greater than 0.",
    path: ["radiusKm"],
  });

export const rescueRequestSchema = z.object({
  providerId: z.string().min(1),
  customerName: z.string().trim().min(2, "Too short").max(80),
  customerPhone: phoneSchema,
  description: z.string().trim().max(500).optional().or(z.literal("")),
  serviceType: z.enum(SERVICE_TYPES),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

export const updateRequestStatusSchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(REQUEST_STATUSES),
});

export const roleFormSchema = z.object({
  name: z.string().trim().min(2, "Too short").max(60),
  permissions: z.array(z.string()).min(1, "Select at least one permission"),
});

export const inviteMemberSchema = z.object({
  email: z.email("Enter a valid email").trim(),
  roleId: z.string().min(1, "Select a role"),
});

// --- Payments (M-Pesa) ------------------------------------------------------

export const PROMOTION_LOCAL_RATE_KES = 25;
export const PROMOTION_UNIVERSAL_RATE_KES = 50;
export const VERIFICATION_BADGE_RATE_KES = 20;
// Unverified shops (ProviderProfile.isVerified === false, the default) are
// only discoverable within this radius regardless of a customer's chosen
// search radius — see lib/queries.ts#withDistanceAndServiceTypes.
export const UNVERIFIED_VISIBILITY_RADIUS_KM = 0.1;

const mpesaPhoneSchema = z
  .string()
  .trim()
  .min(9, "Enter a valid M-Pesa phone number")
  .max(15, "Enter a valid M-Pesa phone number");

export const promotionPaymentSchema = z.object({
  shopAdId: z.string().min(1),
  days: z.coerce.number().int().min(1, "Enter at least 1 day").max(90, "Max 90 days"),
  phone: mpesaPhoneSchema,
});

export const badgePaymentSchema = z.object({
  providerId: z.string().min(1),
  days: z.coerce.number().int().min(1, "Enter at least 1 day").max(365, "Max 365 days"),
  phone: mpesaPhoneSchema,
});
