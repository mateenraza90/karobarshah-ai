# KarobarShah AI — End-to-End Verification Checklist

## Current source state

The repository now contains the core MVP implementation from the supplied Master Specification: authentication, multi-tenancy/RLS, onboarding, business configuration, patients, appointments, conversations, WhatsApp integration boundary, business knowledge, AI provider abstraction, fixed AI tools, orchestration, logging and rate limiting.

## Environment

- Node.js: v22.16.0
- npm: 10.9.2
- Disk: ~38 GB free at audit start
- `node_modules`: absent
- npm registry: blocked by system configuration/DNS; `/etc/npmrc` currently reports `registry=https:///`
- `registry.npmjs.org`: DNS resolution fails (`curl: (6) Could not resolve host`)
- PostgreSQL: unavailable
- `psql`: unavailable
- `pg_isready`: unavailable
- Supabase CLI: unavailable
- Docker: unavailable

No system-wide npm configuration was changed during this pass.

## Executed offline checks

- [x] Repository/source tree inspected
- [x] Master Specification inspected from the uploaded source
- [x] `node scripts/static-verification.mjs` — PASS
- [x] `npm test -- --run` — PASS (10 tests)
- [x] `git diff --check` — PASS
- [x] `npm run typecheck` attempted; real project verification is BLOCKED because declared dependencies are not installed. The initial syntax error found in the new webhook route was fixed before this status was recorded.

## Source-level fixes made during final hardening

- AI tool schemas now reject unknown arguments and invalid appointment time ranges.
- AI appointment tools now verify organization ownership/activity of clinic, patient, doctor and service resources and enforce mutation-role authorization for authenticated callers.
- AI search inputs use the shared PostgREST-safe search sanitizer.
- Conversation find-or-create now recovers from concurrent unique-key races.
- Invitation acceptance is now transactionally consumed by a server-side PostgreSQL function with row locking, expiry and authenticated-email checks.

## Runtime checks blocked by environment

- [ ] `npm install` — BLOCKED: registry DNS/network unavailable and project/system registry configuration is invalid.
- [ ] `npm run typecheck` — BLOCKED: missing `next`, React, Supabase, Zod and other declared dependencies because installation is unavailable.
- [ ] `npm run lint` — BLOCKED: ESLint dependencies are not installed.
- [ ] `npm run build` — BLOCKED: Next.js dependencies are not installed.
- [ ] Clean migration replay — BLOCKED: no PostgreSQL/Supabase runtime.
- [ ] RLS tenant isolation execution — BLOCKED: no PostgreSQL/Supabase runtime.
- [ ] Role/permission execution tests — BLOCKED: no PostgreSQL/Supabase runtime.
- [ ] Appointment concurrency execution test — BLOCKED: no PostgreSQL runtime.
- [ ] Conversation deduplication database test — BLOCKED: no PostgreSQL runtime.
- [ ] AI tool database/ownership execution — BLOCKED: no PostgreSQL runtime and no dependencies.
- [ ] Database rate-limit execution — BLOCKED: no PostgreSQL runtime.
- [ ] WhatsApp local HTTP integration execution — BLOCKED: no Next.js dependencies and no configured runtime.
- [ ] Live Meta WhatsApp verification — BLOCKED/USER ACTION REQUIRED: real Meta credentials and webhook registration are external configuration.
- [ ] Live OpenAI/Anthropic verification — BLOCKED/USER ACTION REQUIRED: provider credentials are external configuration.

## Security controls inspected

- organization context is derived from authenticated membership for application mutations
- webhook organization context is resolved from stored `phone_number_id`
- AI executor receives organization context from the server, not model arguments
- fixed eight-tool allow-list with Zod validation
- appointment parent-tenant integrity trigger
- message/conversation tenant-integrity triggers
- PostgreSQL RLS on new tenant-owned tables
- appointment exclusion constraints for doctor and patient overlap
- provider message-id uniqueness for duplicate webhook protection
- HMAC SHA-256 + constant-time comparison for WhatsApp signatures
- WhatsApp access tokens stored as AES-256-GCM ciphertext/IV/tag
- invitation tokens stored only as SHA-256 hashes with seven-day expiry
- safe same-site auth redirects
- server-only service-role and provider secrets
- bounded AI loops/tool calls and database-backed rate limiting

## Required next verification action

Restore npm registry/DNS access and provide a real Supabase/PostgreSQL runtime. Then install the existing lockfile dependencies, run typecheck/lint/tests/build, replay all migrations from zero, and execute the RLS/authorization/concurrency/deduplication/AI/rate-limit/webhook integration suite against the real database.
