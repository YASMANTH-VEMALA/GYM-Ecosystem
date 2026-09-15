# GymOS context

GymOS is a multi-tenant gym management SaaS for Indian gyms.

## Active production stack

- Web/admin/kiosk/member web app: Next.js 16 and React 19 (`apps/web`)
- API: Express and TypeScript (`apps/api`)
- Database: Supabase PostgreSQL through Prisma (`packages/db`)
- Authentication: Supabase Auth; the API validates bearer sessions and maps them to organization- or branch-scoped local users
- Notifications: Resend email, standards-based PWA Web Push, and persisted `notifications_log` records
- Recommended hosting: Vercel for web, Render Starter for API and scheduled jobs

## Data boundary

The browser receives only the Supabase URL and publishable key. It uses Supabase for authentication, then sends the access token to the Express API. A `gym_owner` belongs to an organization and selects one of its branches; managers and other staff are permanently assigned to one branch. The API validates every requested branch against that scope before performing database operations. Supabase `anon` and `authenticated` roles are denied direct access to the Prisma-owned public tables.

## Real web features

- Owner/staff/member Supabase sign-in and role authorization
- Owner-only all-branches command center, branch creation, and branch switching
- Branch manager role with server-enforced single-branch access and owner-only navigation hidden
- Owner-configurable manager portal sections with matching sidebar and API enforcement
- Dashboard and analytics from payments, attendance, subscriptions, and member records
- Member CRUD and optional member Supabase login provisioning
- Staff provisioning, access toggle, and password reset through Supabase Admin
- Membership plan CRUD, subscription creation, payment recording, historical filters, pagination, filtered CSV exports, and invoices
- Kiosk and signed member QR check-ins
- Workout and diet creation, assignment, and member web consumption
- Body-measurement history
- Immediate and scheduled Resend email notifications with delivery logs
- Searchable notification recipient picker with exact multi-member selection, payment-due audiences, and per-member merge tags
- Installed-member-PWA Web Push notifications that display while the app and browser are closed
- Member alert history includes only delivered messages; failed delivery attempts and their provider reasons remain visible in the admin notification history
- Gym settings and persisted white-label branding
- Per-branch admission and attendance QR codes; public self-admission and authenticated attendance confirmation
- Owner-managed company and branch logos stored in Supabase Storage, with branch override and company fallback

## Public and branch QR routes

- `/qr-codes` — branch-scoped manager/owner/reception QR management
- `/admission?gymId=...&token=...` — signed public admission form that creates the member in the scanned branch
- `/member-app?gymId=...&hash=...` — signed attendance request with member login and explicit confirmation
- `/api/admissions/:gymId` — signed public branch metadata and admission submission

## Database state

Prisma migrations are committed under `packages/db/prisma/migrations`. The seed is idempotent and contains reference data only: 52 exercises and 3 SaaS plan definitions. It does not create fake activity.

## Explicitly deferred

- Flutter/mobile mock removal and release polish
- Razorpay production enablement
- Supabase Storage uploads for avatars and invoice PDFs (logo uploads are implemented)
- Superadmin tenant-onboarding UI
- Legacy WhatsApp/SMS/FCM services are retained but are not used by the website notification jobs
- Native-app Firebase support is retained separately from standards-based PWA Web Push

See `DEPLOYMENT.md` for production setup and required environment variables.
