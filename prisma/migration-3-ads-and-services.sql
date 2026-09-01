-- ProviderProfile: single serviceType -> serviceTypes JSON array
ALTER TABLE "ProviderProfile" ADD COLUMN "serviceTypes" TEXT;

UPDATE "ProviderProfile" SET "serviceTypes" = json_array("serviceType");

ALTER TABLE "ProviderProfile" DROP COLUMN "serviceType";

-- BrandAd: userId becomes optional (anonymous brand submissions), plus
-- advertiser contact + area-targeting columns. SQLite/libsql can't alter a
-- column's nullability or FK action in place, so rebuild the table.
ALTER TABLE "BrandAd" RENAME TO "BrandAd_old";

CREATE TABLE "BrandAd" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT,
    "advertiserName" TEXT,
    "advertiserContact" TEXT,
    "targetLatitude" REAL,
    "targetLongitude" REAL,
    "targetRadiusKm" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BrandAd_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "BrandAd" (
  "id", "userId", "title", "description", "imageUrl", "linkUrl",
  "isActive", "createdAt", "updatedAt"
)
SELECT
  "id", "userId", "title", "description", "imageUrl", "linkUrl",
  "isActive", "createdAt", "updatedAt"
FROM "BrandAd_old";

DROP TABLE "BrandAd_old";

CREATE INDEX "BrandAd_userId_idx" ON "BrandAd"("userId");

-- ShopAd: a shop's own promo for one of its products.
CREATE TABLE "ShopAd" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "productId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "radiusKm" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShopAd_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShopAd_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ShopAd_providerId_idx" ON "ShopAd"("providerId");
