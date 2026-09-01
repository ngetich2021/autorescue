-- Service: the itemized listing a shop shares with customers (e.g. "Oil
-- change" at a set price) — distinct from ProviderProfile.serviceTypes,
-- which is just the coarse category list used for search filtering.
CREATE TABLE "Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Service_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Service_providerId_idx" ON "Service"("providerId");
