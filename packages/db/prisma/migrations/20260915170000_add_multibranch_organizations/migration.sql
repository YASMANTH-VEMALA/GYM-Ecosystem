CREATE TABLE "organizations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(200) NOT NULL,
  "owner_name" VARCHAR(200) NOT NULL,
  "owner_email" VARCHAR(255),
  "owner_phone" VARCHAR(15) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "gyms" ADD COLUMN "organization_id" UUID;

INSERT INTO "organizations" ("id", "name", "owner_name", "owner_email", "owner_phone")
SELECT "id", "name", "owner_name", "owner_email", "owner_phone" FROM "gyms";

UPDATE "gyms" SET "organization_id" = "id";
ALTER TABLE "gyms" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "gyms"
  ADD CONSTRAINT "gyms_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "gyms_organization_id_idx" ON "gyms"("organization_id");

ALTER TABLE "users" ADD COLUMN "organization_id" UUID;
UPDATE "users" AS "u"
SET "organization_id" = "g"."organization_id"
FROM "gyms" AS "g"
WHERE "u"."gym_id" = "g"."id";

ALTER TABLE "users"
  ADD CONSTRAINT "users_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "users_organization_id_role_idx" ON "users"("organization_id", "role");

UPDATE "users" SET "gym_id" = NULL WHERE "role" = 'gym_owner';

REVOKE ALL ON TABLE "organizations" FROM PUBLIC, anon, authenticated;
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
