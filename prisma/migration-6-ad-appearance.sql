-- Admin-only appearance overrides for a brand ad's on-image text and CTA
-- button, so a light-background poster's text/CTA can be kept legible.
ALTER TABLE "BrandAd" ADD COLUMN "textColor" TEXT NOT NULL DEFAULT 'light';
ALTER TABLE "BrandAd" ADD COLUMN "ctaColor" TEXT NOT NULL DEFAULT 'green';
