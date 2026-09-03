-- Replaces the inStock yes/no with a real stock count so shop owners can
-- show customers how many are left instead of just "in stock". Existing
-- in-stock products backfill to 1 (a safe non-zero placeholder) — owners
-- should update it to their real count from the shop dashboard.
ALTER TABLE "Product" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 0;
UPDATE "Product" SET "quantity" = 1 WHERE "inStock" = 1;
ALTER TABLE "Product" DROP COLUMN "inStock";
