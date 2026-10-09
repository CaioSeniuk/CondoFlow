BEGIN;

LOCK TABLE "condominiums_condominium" IN ACCESS EXCLUSIVE MODE;

ALTER TABLE "condominiums_condominium" ADD COLUMN "registration_code" TEXT;

CREATE UNIQUE INDEX "condominiums_condominium_name_key"
  ON "condominiums_condominium" ("name");

CREATE UNIQUE INDEX "condominiums_condominium_normalized_name_key"
  ON "condominiums_condominium" (lower(regexp_replace(btrim("name"), '\s+', ' ', 'g')));

COMMIT;
