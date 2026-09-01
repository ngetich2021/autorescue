-- productName is the literal item name searched across shops (see
-- HeroBanner's "Find nearby shops" CTA) — distinct from `title`, which can
-- be a marketing headline. Backfill existing rows from their title so
-- nothing is left blank, then app code always supplies it going forward.
ALTER TABLE "BrandAd" ADD COLUMN "productName" TEXT NOT NULL DEFAULT '';
UPDATE "BrandAd" SET "productName" = "title" WHERE "productName" = '';
