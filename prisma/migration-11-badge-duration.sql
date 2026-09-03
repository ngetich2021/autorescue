-- Verification badge becomes a paid, day-based window (like a ShopAd
-- promotion) instead of a permanent one-time fee — see
-- app/actions/payment.ts#initiateBadgePayment and the stacking logic in
-- app/api/mpesa/callback/route.ts.
ALTER TABLE "ProviderProfile" ADD COLUMN "verifiedUntil" DATETIME;
