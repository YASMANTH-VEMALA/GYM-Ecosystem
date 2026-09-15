import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(4000),
  PORT: z.coerce.number().optional(),
  DATABASE_URL: z.string(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(20),
  SUPABASE_LOGO_BUCKET: z.string().min(1).default('gymstack-logos'),
  WEB_URL: z.string().default('http://localhost:3000'),
  PLATFORM_DOMAIN: z.string().default('mygymapp.in'),
  QR_ENCRYPTION_KEY: z.string().min(32),
  ENABLE_CRON_JOBS: z.enum(['true', 'false']).default('true').transform((value) => value === 'true'),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default('GymOS <notifications@vormex.in>'),
  WEB_PUSH_VAPID_PUBLIC_KEY: z.string().optional(),
  WEB_PUSH_VAPID_PRIVATE_KEY: z.string().optional(),
  WEB_PUSH_VAPID_SUBJECT: z.string().default('mailto:support@mygymapp.in'),

  // Razorpay
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),

  // Firebase
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  // WATI
  WATI_API_URL: z.string().optional(),
  WATI_API_KEY: z.string().optional(),

  // MSG91
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_SENDER_ID: z.string().default('GYMSTK'),
  MSG91_OTP_TEMPLATE_ID: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const env = validateEnv();
