-- ProviderProfile: listing must show a business email, not just a phone.
ALTER TABLE "ProviderProfile" ADD COLUMN "email" TEXT;

UPDATE "ProviderProfile"
SET "email" = COALESCE(
  (SELECT "User"."email" FROM "User" WHERE "User"."id" = "ProviderProfile"."userId"),
  ''
);

-- BrandAd: advertiserContact (free text, optional) -> split into required
-- contactEmail + contactPhone, mandatory for every ad regardless of source.
ALTER TABLE "BrandAd" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "BrandAd" ADD COLUMN "contactPhone" TEXT;

UPDATE "BrandAd"
SET
  "contactEmail" = CASE
    WHEN "advertiserContact" LIKE '%@%' THEN "advertiserContact"
    ELSE COALESCE((SELECT "User"."email" FROM "User" WHERE "User"."id" = "BrandAd"."userId"), '')
  END,
  "contactPhone" = CASE
    WHEN "advertiserContact" IS NOT NULL AND "advertiserContact" NOT LIKE '%@%' THEN "advertiserContact"
    ELSE COALESCE((SELECT "User"."phone" FROM "User" WHERE "User"."id" = "BrandAd"."userId"), '')
  END;

ALTER TABLE "BrandAd" DROP COLUMN "advertiserContact";
