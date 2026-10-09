-- Incremental migration for the existing Django/Supabase schema.
-- Review the legacy assignment before applying this script to a real database.
BEGIN;

CREATE TABLE "condominiums_condominium" (
  "id" BIGSERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "registration_code_hash" TEXT,
  "code_updated_at" TIMESTAMP(3)
);
CREATE UNIQUE INDEX "condominiums_condominium_registration_code_hash_key"
  ON "condominiums_condominium" ("registration_code_hash");

INSERT INTO "condominiums_condominium" ("id", "name") VALUES (1, 'Condomínio legado');
SELECT setval(pg_get_serial_sequence('condominiums_condominium', 'id'), 1);

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users_user', 'announcements_announcement', 'packages_package', 'visitors_visitor',
    'tickets_ticket', 'providers_provider', 'reservations_commonarea',
    'reservations_reservation', 'polls_poll', 'finance_expensecategory', 'finance_expense'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN condominium_id BIGINT', table_name);
    EXECUTE format('UPDATE %I SET condominium_id = 1', table_name);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN condominium_id SET NOT NULL', table_name);
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (condominium_id) REFERENCES condominiums_condominium(id) ON DELETE RESTRICT ON UPDATE CASCADE',
      table_name, table_name || '_condominium_id_fkey'
    );
    EXECUTE format('CREATE INDEX %I ON %I (condominium_id)', table_name || '_condominium_id_idx', table_name);
  END LOOP;
END $$;

ALTER TABLE "finance_expensecategory" DROP CONSTRAINT IF EXISTS "finance_expensecategory_name_key";
DROP INDEX IF EXISTS "finance_expensecategory_name_key";
CREATE UNIQUE INDEX "finance_expensecategory_condominium_id_name_key"
  ON "finance_expensecategory" ("condominium_id", "name");

COMMIT;
