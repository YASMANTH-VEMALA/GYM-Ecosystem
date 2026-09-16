# Progress

## Completed

- [x] Supabase PostgreSQL reset and committed Prisma migration baseline
- [x] Supabase Auth integration for owner, staff, and members
- [x] Tenant and role authorization in the API
- [x] Mock data removed from every Next.js page
- [x] Dashboard, analytics, members, attendance, fees, payments, plans, workouts, diets, notifications, staff, settings, kiosk, and member web app connected to real APIs
- [x] Member workout and diet assignments visible in the member web app
- [x] Resend immediate, scheduled, and automated email notifications with database logs
- [x] Persistent, rotatable gym QR secret
- [x] Supabase REST roles blocked from direct Prisma table access
- [x] Database-backed API health check and graceful shutdown
- [x] Render and Vercel deployment configuration
- [x] Production API and web builds passing
- [x] Production dependency audit reports zero known vulnerabilities
- [x] Disposable authenticated API smoke test passed 29 checks, including branch isolation and manager RBAC, and cleaned up all test records
- [x] Permanent K5 gym and Supabase Auth owner bootstrapped with slug `k5`
- [x] Permanent owner login verified through the API and the real browser dashboard
- [x] Organization and multi-branch database migration applied without losing K5 data
- [x] Owner all-branches command center, branch creator, and branch switcher
- [x] Branch-scoped manager role with Staff, Settings, and All Branches kept owner-only
- [x] Owner-configurable manager portal section access with creation/edit checkboxes and server enforcement
- [x] Searchable, filterable, paginated payment history with filtered CSV export
- [x] Branch-specific admission QR with production API validation, self-service member form, and direct branch assignment
- [x] Branch-specific attendance QR with authenticated member confirmation and manager-accessible QR downloads
- [x] Organization-wide and per-branch Supabase Storage logo uploads with branch override/company fallback
- [x] Installed member PWA Web Push subscriptions, background alerts, click routing, and Email/Push/Both delivery
- [x] Notification recipient checklist, payment-due audience filters, exact bulk selection, and draggable personalized merge tags
- [x] Member alert history restricted to successful deliveries, with provider failure reasons visible to admins
- [x] Vercel Web Analytics and Speed Insights instrumentation

## Website release setup

- [ ] Rotate all credentials that were pasted into chat before hosting
- [ ] Verify a sending domain in Resend and set `RESEND_FROM_EMAIL`
- [ ] Deploy the API through `render.yaml`
- [ ] Deploy `apps/web` as the Vercel web project and connect it to the Render API

## Deferred by scope

- [ ] Flutter/mobile app real-data conversion and store release
- [ ] Razorpay live activation
- [ ] Supabase Storage uploads for avatars and invoice PDFs (logo uploads are complete)
- [ ] Superadmin onboarding portal
