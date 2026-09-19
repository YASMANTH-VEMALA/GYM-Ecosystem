-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_organization_id_fkey";

-- AlterTable
ALTER TABLE "gyms" ALTER COLUMN "qr_secret" DROP DEFAULT;

-- AlterTable
ALTER TABLE "organizations" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "referral_campaigns" (
    "id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "reward_description" TEXT,
    "referee_reward_description" TEXT,
    "max_referrals_per_member" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "referral_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_referral_codes" (
    "id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_referral_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_referrals" (
    "id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "referrer_id" UUID NOT NULL,
    "referred_member_id" UUID,
    "referral_code" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "converted_at" TIMESTAMPTZ,
    "reward_applied_at" TIMESTAMPTZ,
    "reward_notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "member_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "referral_campaigns_gym_id_is_active_idx" ON "referral_campaigns"("gym_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "member_referral_codes_code_key" ON "member_referral_codes"("code");

-- CreateIndex
CREATE INDEX "member_referral_codes_gym_id_idx" ON "member_referral_codes"("gym_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_referral_codes_campaign_id_member_id_key" ON "member_referral_codes"("campaign_id", "member_id");

-- CreateIndex
CREATE INDEX "member_referrals_gym_id_campaign_id_idx" ON "member_referrals"("gym_id", "campaign_id");

-- CreateIndex
CREATE INDEX "member_referrals_referrer_id_idx" ON "member_referrals"("referrer_id");

-- CreateIndex
CREATE INDEX "member_referrals_referred_member_id_idx" ON "member_referrals"("referred_member_id");

-- CreateIndex
CREATE INDEX "member_referrals_referral_code_idx" ON "member_referrals"("referral_code");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_campaigns" ADD CONSTRAINT "referral_campaigns_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_referral_codes" ADD CONSTRAINT "member_referral_codes_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_referral_codes" ADD CONSTRAINT "member_referral_codes_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "referral_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_referral_codes" ADD CONSTRAINT "member_referral_codes_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_referrals" ADD CONSTRAINT "member_referrals_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_referrals" ADD CONSTRAINT "member_referrals_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "referral_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_referrals" ADD CONSTRAINT "member_referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_referrals" ADD CONSTRAINT "member_referrals_referred_member_id_fkey" FOREIGN KEY ("referred_member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
