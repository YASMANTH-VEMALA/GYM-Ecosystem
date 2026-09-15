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

## 3. Vercel web app

Import the repository into Vercel and keep the repository root as the project root. `vercel.json` builds the `web` workspace.

Set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `API_URL`: Render service origin without a trailing `/api`

Do not set `NEXT_PUBLIC_API_URL` in production. The browser should call same-origin `/api/*`; Next.js proxies those requests to `API_URL`.

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
