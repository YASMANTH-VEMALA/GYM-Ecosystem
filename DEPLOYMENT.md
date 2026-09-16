# Production deployment

The supported first production layout is:

- Web/admin/kiosk/member app: Vercel
- Express API and scheduled email jobs: Render Starter (always on)
- PostgreSQL and authentication: Supabase
- Transactional and campaign email: Resend

Railway can also run the API, but Render is the recommended first deployment because this repository includes a complete `render.yaml`, a pre-deploy migration command, and a database-backed health check.

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

## 2. Render API

Create a Render Blueprint from this repository. The checked-in `render.yaml` uses a paid Starter web service because sleeping/free instances do not reliably run in-process scheduled jobs.

Set these secret environment variables in Render:

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

Do not copy a local Windows `sslrootcert=C:/...` parameter into Render. Use Supabase's cloud connection string with `sslmode=require`, or mount the CA certificate and provide a valid Linux path.

Keep exactly one API instance while cron jobs run inside the web process. If the API is scaled horizontally, move schedules to one dedicated worker and set `ENABLE_CRON_JOBS=false` on web instances.

Verify `GET https://YOUR-RENDER-SERVICE.onrender.com/api/health`. It must report both `status: ok` and `database: connected`.

Do not deploy `apps/api` as a separate Vercel project. It is a persistent Express server with in-process scheduled jobs, while Vercel Functions are request-scoped. A Vercel API project will fail to start correctly and cannot reliably run the scheduled jobs.

Use only these API environment variables on Render:

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
| `ENABLE_CRON_JOBS` | `true` on exactly one API instance |
| `RESEND_API_KEY` | Resend API key (optional until email is enabled) |
| `RESEND_FROM_EMAIL` | Verified sender, e.g. `GymOS <notifications@example.com>` |
| `WEB_PUSH_VAPID_PUBLIC_KEY` | Persistent VAPID public key (optional until push is enabled) |
| `WEB_PUSH_VAPID_PRIVATE_KEY` | Matching VAPID private key |
| `WEB_PUSH_VAPID_SUBJECT` | `mailto:support@example.com` |

Render supplies `PORT`; do not set `API_PORT`, `API_URL`, `NEXT_PUBLIC_API_URL`, or any `NEXT_PUBLIC_*` variable there. Legacy `JWT_*`, Redis/Upstash, Google OAuth, Supabase JWKS, publishable/service-role aliases, and `WEB_ORIGIN` variables shown in older deployments are not read by the current API.

## 3. Vercel web app

Create one Vercel project for the website and set its **Root Directory** to `apps/web`. Do not create a second Vercel project for `apps/api`.

Set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `API_URL`: Render service origin without a trailing `/api`

Do not set `NEXT_PUBLIC_API_URL` in production. The browser should call same-origin `/api/*`; Next.js proxies those requests to `API_URL`.

The complete Vercel web environment is:

| Key | Value |
| --- | --- |
| `API_URL` | `https://YOUR-RENDER-SERVICE.onrender.com` |
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
