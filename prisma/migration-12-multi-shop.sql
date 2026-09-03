-- A user can now own several shops (ProviderProfile rows) instead of exactly
-- one — see lib/authz.ts#getMyShops. Swaps the unique index for a plain one;
-- no table rebuild, no data loss.
DROP INDEX "ProviderProfile_userId_key";
CREATE INDEX "ProviderProfile_userId_idx" ON "ProviderProfile"("userId");
