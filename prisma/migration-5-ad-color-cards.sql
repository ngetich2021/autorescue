-- BrandAd: imageUrl becomes optional (an advertiser can skip the photo and
-- get a colored text card instead), plus the bgColor choice for that card.
-- SQLite/libsql can't alter a column's nullability in place, so rebuild.
ALTER TABLE "BrandAd" RENAME TO "BrandAd_old";

CREATE TABLE "BrandAd" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "bgColor" TEXT NOT NULL DEFAULT 'green',
    "linkUrl" TEXT,
    "advertiserName" TEXT,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
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
  "advertiserName", "contactEmail", "contactPhone",
  "targetLatitude", "targetLongitude", "targetRadiusKm",
  "isActive", "createdAt", "updatedAt"
)
SELECT
  "id", "userId", "title", "description", "imageUrl", "linkUrl",
  "advertiserName", "contactEmail", "contactPhone",
  "targetLatitude", "targetLongitude", "targetRadiusKm",
  "isActive", "createdAt", "updatedAt"
FROM "BrandAd_old";

DROP TABLE "BrandAd_old";

CREATE INDEX "BrandAd_userId_idx" ON "BrandAd"("userId");
