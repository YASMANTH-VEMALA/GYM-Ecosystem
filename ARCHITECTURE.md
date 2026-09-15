# System Overview
GymOS is composed of a unified backend and multiple frontend touchpoints.
- **Web Admin Panel** (`apps/web`): The main portal used by gym owners and receptionists to manage their gyms. Hits the Express API to read/write DB data.
- **Member Mobile Application** (`apps/mobile` & `/member-app`): The application used by gym members to check attendance, view workout routines, and check diets. Communicates exclusively with the API. 
- **Kiosk Mode** (`/kiosk`): A specialized, locked-down interface placed on a tablet physically at the gym reception desk. Its sole purpose is to securely capture member check-ins and send them to the API -> DB.

# Why Each Technology Was Chosen
- **Next.js & Tailwind**: Facilitates incredibly fast UI iteration, allowing us to hit the premium, CRED-like aesthetic outlined in `DESIGN_SYSTEM.md`.
- **Node.js + Express**: Given the extensive need for third-party integrations (WATI WhatsApp, MSG91 SMS, Firebase Push Notifications, Razorpay), the Node.js ecosystem holds the best, most mature SDKs for direct integration.
- **PostgreSQL**: Gym operations involve intrinsically highly-relational data—where Members have Subscriptions, which contain Payments, which are tied to specific Gyms. A relational database is mandatory for consistency here.
- **Prisma ORM**: Guarantees end-to-end type safety between the Database queries and the TypeScript API structures.

# White Label System
The entire product architecture is multi-tenant. The `Gym` table acts as the separation layer.
- **Database Context**: Almost every table (`Members`, `CheckIns`, `WorkoutPlans`, etc.) has a `gym_id`. The Express API strictly extracts the `gymId` from the active user's JWT and enforces query boundaries so tenants never see each other's data (see `gym-context.ts` middleware).
- **Brand Theming**: The `Gym` model captures a `primary_color` and `logo_url`. Both the Next.js Web App and the Flutter Mobile App dynamically inject these colors into the UI to create a unique feel for every single gym owner.

# Authentication
- **Mechanism**: Standard JSON Web Tokens (JWT).
- **Roles**: The system relies on explicit roles injected into the JWT: `superadmin` (manages the entire GymOS SaaS platform), `owner` (gym proprietor), `receptionist` (limited to check-ins and fee collection), `coach` (limited to diet and workout assignments), `member` (read-only for their own data).

# Notification Flow
GymOS uses an automated omnichannel communication approach.
- **WhatsApp**: Integrated via WATI. Used for high-priority or rich messages (Invoices, fee expiry warnings).
- **SMS**: Integrated via MSG91. Primarily used for OTPs or fallbacks if WhatsApp fails.
- **Push Notifications**: Integrated via Firebase Cloud Messaging (FCM). Sent directly to the Flutter apps to nudge regarding inactivity or log workout completion.
- Automated distribution happens via centralized Cron Jobs (e.g., `feeReminder.job.ts`) running globally on the Node.js API server every morning.

# File Storage
We utilize Supabase Storage for holding media assets:
- Gym Logos
- Member Profile Avatars
- Generating Payment PDF Invoices and hosting them securely.
