# Production deployment

The production layout is:

- Web/admin/kiosk/member app: Vercel
- Express API: a separate Vercel project using a serverless entry point
- PostgreSQL and authentication: Supabase
- Transactional and campaign email: Resend

The web and API are two Vercel projects created from the same repository, with different root directories.

## Security before deployment

Rotate every credential that was ever pasted into chat before production. Rotate the Supabase database password/service secret, Resend key, Upstash token, Google client secret, and QR encryption key. Never put server secrets in Vercel variables beginning with `NEXT_PUBLIC_`.

Supabase browser roles have no direct access to application tables. All application data goes through the authenticated API. The Vercel app receives only the Supabase URL and publishable key.

## 1. Database

Apply committed migrations and seed reference data:

```bash
npm ci
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
```

The seed is idempotent and creates only the exercise catalog and SaaS plan definitions. It does not create fake gym activity.

Create the first gym owner once, from a trusted local terminal:

```powershell
$env:BOOTSTRAP_OWNER_EMAIL='owner@example.com'
$env:BOOTSTRAP_OWNER_NAME='Owner Name'
$env:BOOTSTRAP_OWNER_PHONE='9876543210'
$env:BOOTSTRAP_GYM_NAME='Example Fitness'
$env:BOOTSTRAP_GYM_SLUG='example-fitness'
npm run bootstrap:owner
```

The command generates a strong temporary password when one is not supplied. Do not add the bootstrap values to a hosted service.

## 2. Vercel API

Create a Vercel project with **Root Directory** set to `apps/api`. The checked-in `apps/api/vercel.json` installs the monorepo dependencies, generates Prisma Client, and routes requests to the serverless Express entry point.

Set these environment variables in the API Vercel project:

- `DATABASE_URL`: Supabase pooled URL (port 6543)
- `DIRECT_URL`: Supabase session/direct URL (port 5432), used by migrations
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_LOGO_BUCKET` (optional; defaults to `gymstack-logos` and is created on first upload)
- `QR_ENCRYPTION_KEY`: at least 32 random characters
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`: an address on a domain verified in Resend
- `WEB_PUSH_VAPID_PUBLIC_KEY` and `WEB_PUSH_VAPID_PRIVATE_KEY`: one persistent pair generated with `npx web-push generate-vapid-keys`
- `WEB_PUSH_VAPID_SUBJECT`: a `mailto:` address on your support domain
- `WEB_URL`: final Vercel origin, such as `https://gymos.example.com`

Do not copy a local Windows `sslrootcert=C:/...` parameter into Vercel. Use Supabase's cloud connection string with `sslmode=require`.

Use only these API environment variables:

| Key | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Supabase pooled PostgreSQL URL (port 6543) |
| `DIRECT_URL` | Supabase direct/session PostgreSQL URL (port 5432) |
| `SUPABASE_URL` | `https://YOUR_PROJECT_REF.supabase.co` |
| `SUPABASE_SECRET_KEY` | Supabase secret key (server only) |
| `SUPABASE_LOGO_BUCKET` | `gymstack-logos` (optional) |
| `QR_ENCRYPTION_KEY` | Persistent random value of at least 32 characters |
| `WEB_URL` | Final Vercel web origin, with no trailing slash |
| `ENABLE_CRON_JOBS` | `false` |
| `RESEND_API_KEY` | Resend API key (optional until email is enabled) |
| `RESEND_FROM_EMAIL` | Verified sender, e.g. `GymOS <notifications@example.com>` |
| `WEB_PUSH_VAPID_PUBLIC_KEY` | Persistent VAPID public key (optional until push is enabled) |
| `WEB_PUSH_VAPID_PRIVATE_KEY` | Matching VAPID private key |
| `WEB_PUSH_VAPID_SUBJECT` | `mailto:support@example.com` |

Do not set `API_PORT`, `PORT`, `API_URL`, `NEXT_PUBLIC_API_URL`, or any `NEXT_PUBLIC_*` variable in the API project. Legacy `JWT_*`, Redis/Upstash, Google OAuth, Supabase JWKS, publishable/service-role aliases, and `WEB_ORIGIN` variables shown in older deployments are not read by the current API.

Verify `GET https://YOUR-API-PROJECT.vercel.app/api/health`. It must report both `status: ok` and `database: connected`.

Vercel Functions cannot run the in-process schedules in `src/jobs`. With `ENABLE_CRON_JOBS=false`, login and normal API requests work, but automated reminders, birthdays, weekly summaries, and scheduled notification delivery require a later migration to secured HTTP handlers plus Vercel Cron. Vercel Hobby cron frequency limits may not support the current minute-level scheduled-notification worker.

## 3. Vercel web app

Create one Vercel project for the website and set its **Root Directory** to `apps/web`. Do not create a second Vercel project for `apps/api`.

Set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `API_URL`: Vercel API project origin without a trailing `/api`

Do not set `NEXT_PUBLIC_API_URL` in production. The browser should call same-origin `/api/*`; Next.js proxies those requests to `API_URL`.

The complete Vercel web environment is:

| Key | Value |
| --- | --- |
| `API_URL` | `https://YOUR-API-PROJECT.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR_PROJECT_REF.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |

Do not place database URLs, Supabase secret/service-role keys, VAPID private keys, Resend keys, or other server secrets in the web project. Vercel Analytics and Speed Insights require no environment variables; their components are included in the root web layout.

After changing any Vercel environment variable, redeploy the web project.

## 4. Resend

Verify a sending domain in Resend and use that domain in `RESEND_FROM_EMAIL`. Resend's onboarding address is appropriate only for initial testing. Scheduled emails are claimed atomically and processed once per minute by the API worker.

## 5. Release checks

- Owner login succeeds through Supabase Auth.
- `/api/health` confirms the database connection.
- Gym settings persist after a refresh.
- A member can be created with an email and temporary password.
- An installed member PWA can enable notifications and receive a push after the app is closed.
- Cash/UPI collection creates a real subscription and payment record.
- Kiosk check-in appears in attendance and analytics.
- Workout and diet plans can be assigned and appear in the member web app.
- A test Resend email is marked `delivered` in notification history.
- Old QR codes fail after regenerating the gym QR.

The Flutter app is outside the website-first release and can be deployed later.
