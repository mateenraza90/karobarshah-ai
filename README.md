# KarobarShah AI

KarobarShah AI is a multi-tenant clinic operating system with secure business configuration, patient management, appointments, conversations, WhatsApp integration boundaries, and a provider-neutral AI receptionist.

## Core MVP implemented in this repository

- Supabase email/password authentication, password recovery and protected routes
- Server-side organization/membership resolution and PostgreSQL RLS
- Six-step onboarding: Business → Clinic → Working Hours → Doctors → Services → Finish
- Clinic settings and weekly working hours
- Doctor CRUD, working hours, availability and archive state
- Service CRUD, pricing, duration and archive state
- Team members, role changes, expiring invitation tokens, resend/cancel and acceptance
- Tenant-scoped business memory, FAQs and optional OpenAI embeddings with lexical fallback
- Patient/contact CRUD, search, tags, notes and archive
- Appointment booking, availability, cancellation, rescheduling and PostgreSQL exclusion constraints
- Conversation/message persistence and stable WhatsApp contact deduplication
- WhatsApp webhook verification, phone-number-to-organization resolution, encrypted credentials and mock/Meta provider boundary
- AI provider abstraction: mock, OpenAI-compatible and Anthropic-compatible providers
- Eight fixed Zod-validated AI tools, server-derived tenant context, ownership checks, bounded orchestration, interaction logs and database rate limiting
- Live dashboard and operational analytics based on database data

Optional/post-MVP roadmap items from the specification (voice, CRM automation, follow-up/review employees, owner analytics and calendar OAuth) are not represented as fake implementations.

## Verification

When dependencies are available:

```bash
npm install
npm run typecheck
npm run lint
npm test -- --run
npm run build
```

Static/offline verification can run without `node_modules`:

```bash
node scripts/static-verification.mjs
npm test -- --run
git diff --check
```

A clean Supabase/PostgreSQL migration replay and RLS/integration suite must be run against a real PostgreSQL/Supabase runtime before production readiness is declared.

## Environment

Copy `.env.example` to `.env.local`. Core clinic management uses no paid AI or WhatsApp provider. `AI_PROVIDER=mock` is the default. Real AI and WhatsApp credentials are optional.

## Supabase

Apply all files in `supabase/migrations/` in filename order to a clean Supabase project. The final migration enables `pgvector` for optional semantic business-memory retrieval and `btree_gist` for appointment conflict constraints.

## Deployment

Use Supabase for PostgreSQL/Auth and a Vercel-compatible Next.js deployment. Configure the browser-safe variables and server-only secrets in the deployment platform. Never expose `SUPABASE_SERVICE_ROLE_KEY`, AI keys, WhatsApp access tokens, or encryption keys to the browser.
