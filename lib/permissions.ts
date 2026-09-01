export const PLATFORM_PERMISSIONS = [
  "MANAGE_ROLES",
  "MANAGE_PROVIDERS",
  "MANAGE_ADS",
  "MANAGE_USERS",
] as const;

export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[number];

export const PLATFORM_PERMISSION_LABELS: Record<PlatformPermission, string> = {
  MANAGE_ROLES: "Manage admin roles & staff",
  MANAGE_PROVIDERS: "Moderate provider listings",
  MANAGE_ADS: "Moderate brand ads",
  MANAGE_USERS: "View user accounts",
};

export const SHOP_PERMISSIONS = [
  "MANAGE_TEAM",
  "MANAGE_LISTING",
  "MANAGE_PRODUCTS",
  "MANAGE_REQUESTS",
] as const;

export type ShopPermission = (typeof SHOP_PERMISSIONS)[number];

export const SHOP_PERMISSION_LABELS: Record<ShopPermission, string> = {
  MANAGE_TEAM: "Manage team & roles",
  MANAGE_LISTING: "Edit shop listing & location",
  MANAGE_PRODUCTS: "Manage products",
  MANAGE_REQUESTS: "View & update rescue requests",
};
