ALTER TABLE "users"
ADD COLUMN "portal_sections" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "users"
SET "portal_sections" = ARRAY[
  'dashboard',
  'members',
  'fees',
  'checkins',
  'qr_codes',
  'payments',
  'workouts',
  'diets',
  'analytics',
  'notifications'
]::TEXT[]
WHERE "role" = 'manager';
