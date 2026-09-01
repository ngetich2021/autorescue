-- Every @id column dropped its @default(cuid()) in favor of app-generated
-- 10-character ids (lib/id.ts). Existing rows carry the old ~25-char cuids,
-- so per user request this clears every table for a clean slate where every
-- id, from here on, is exactly 10 characters. Deleted leaf-to-root to
-- respect FK constraints (PRAGMA is belt-and-suspenders).
PRAGMA foreign_keys = OFF;

DELETE FROM "RescueRequest";
DELETE FROM "ShopAd";
DELETE FROM "ShopMember";
DELETE FROM "ShopRole";
DELETE FROM "Product";
DELETE FROM "BrandAd";
DELETE FROM "ProviderProfile";
DELETE FROM "PlatformMember";
DELETE FROM "PlatformRole";
DELETE FROM "Session";
DELETE FROM "Account";
DELETE FROM "VerificationToken";
DELETE FROM "User";

PRAGMA foreign_keys = ON;
