-- Verification badge: unverified (default) shops are capped to 100m
-- visibility regardless of a customer's search radius — see
-- lib/queries.ts#withDistanceAndServiceTypes.
ALTER TABLE "ProviderProfile" ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProviderProfile" ADD COLUMN "verifiedAt" DATETIME;

-- A ShopAd promotion only counts as live once expiresAt is in the future —
-- set by the M-Pesa callback once a promotion payment completes.
ALTER TABLE "ShopAd" ADD COLUMN "expiresAt" DATETIME;

-- One M-Pesa Daraja STK Push transaction (promotion payment or badge fee).
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "shopAdId" TEXT,
    "days" INTEGER,
    "amount" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "checkoutRequestId" TEXT,
    "merchantRequestId" TEXT,
    "mpesaReceiptNumber" TEXT,
    "resultDesc" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_shopAdId_fkey" FOREIGN KEY ("shopAdId") REFERENCES "ShopAd" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Payment_checkoutRequestId_key" ON "Payment"("checkoutRequestId");
CREATE INDEX "Payment_providerId_idx" ON "Payment"("providerId");
