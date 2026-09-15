-- Make gym QR rotation persistent.
ALTER TABLE "gyms"
ADD COLUMN "qr_secret" VARCHAR(64) NOT NULL DEFAULT gen_random_uuid()::text;

-- Reference data must be idempotent when seeded during deployments.
CREATE UNIQUE INDEX "exercises_name_muscle_group_key" ON "exercises"("name", "muscle_group");
CREATE UNIQUE INDEX "saas_plans_name_key" ON "saas_plans"("name");

-- The application owns all data access through the authenticated API. Supabase
-- browser roles must not be able to query Prisma tables through PostgREST.
REVOKE ALL ON TABLE
  "gyms", "users", "members", "membership_plans", "member_subscriptions",
  "check_ins", "payments", "exercises", "workout_plans", "workout_plan_days",
  "workout_plan_exercises", "member_workout_assignments", "diet_charts",
  "diet_meals", "member_diet_assignments", "body_stats", "notifications_log",
  "saas_plans", "saas_subscriptions"
FROM PUBLIC, anon, authenticated;

ALTER TABLE "gyms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "membership_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "member_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "check_ins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "exercises" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workout_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workout_plan_days" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workout_plan_exercises" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "member_workout_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "diet_charts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "diet_meals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "member_diet_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "body_stats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "saas_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "saas_subscriptions" ENABLE ROW LEVEL SECURITY;
