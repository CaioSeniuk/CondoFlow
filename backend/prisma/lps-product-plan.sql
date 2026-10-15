BEGIN;

CREATE TYPE "ProductPlan" AS ENUM ('essential', 'complete');
ALTER TABLE condominiums_condominium
  ADD COLUMN product_plan "ProductPlan" NOT NULL DEFAULT 'complete';

COMMIT;
