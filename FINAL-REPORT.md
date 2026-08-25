# KarobarShah AI — Production Readiness Final Report

## 1. Executive Summary

This pass performed a full functional and security audit of the current codebase — tracing every major flow (signup, login, patients, appointments, conversations, AI, WhatsApp, invitations) and reviewing every route — rather than re-verifying that previously-passing checks still pass. Six concrete issues were found and fixed: one real cross-tenant IDOR, one silent env-validation bypass, one UI/authorization inconsistency, two UI completeness gaps (raw UUIDs shown instead of names), and one unnecessary sensitive-field selection. A seventh suspected issue (patient phone uniqueness) was investigated, initially misdiagnosed as missing, and — on deeper verification against the actual original project files — found to already be correctly enforced; that incorrect "fix" was reverted. This is disclosed in full in §3 rather than omitted, per the standing instruction to be completely honest.

**Status: PASS WITH LIMITATIONS.** Typecheck, lint, and all 12 tests pass. The production build passes with all dependencies but cannot complete a single command's worth of proof of "real fonts + zero env vars" in this review sandbox specifically because outbound network access here doesn't reach `fonts.googleapis.com` — isolated and proven separately in §8, not assumed.

## 2. Audit Scope

Full read-through of: `package.json`, `README.md`, `docs/*`, all of `src/` (auth, tenant/RLS helpers, AI orchestrator/tools/providers/context/prompts, WhatsApp webhook/security/provider, all 25 routes and their server actions, database access layer, env validation), all 6 migrations, `.env.example`, `.gitignore`, `next.config.ts`, `src/proxy.ts` + `src/services/supabase/middleware.ts`. Flows traced end-to-end: signup→org creation→membership→onboarding→dashboard; login→session→dashboard; patient and appointment CRUD with tenant isolation; conversations→AI processing; AI provider selection→context→tools→executor; WhatsApp webhook signature→dedup→org resolution→persistence→AI; team invitations→acceptance→membership.

## 3. Issues Found

### Fixed

1. **Cross-tenant IDOR in appointment booking (security).** `createAppointmentAction`/`rescheduleAppointmentAction` accepted a patient/doctor/service/clinic ID without verifying it belongs to the caller's own organization. Neither the FK constraints (which only require the row to exist *somewhere*) nor RLS on `appointments` (which only checks the appointment row's own `organization_id`) catch this. The AI tool executor already had this exact protection (`requireBookableResources`); the human-facing actions didn't. — `src/database/appointments.ts`, `src/features/appointments/actions.ts`

2. **Silent environment-validation bypass.** `src/features/auth/actions.ts` read `process.env.NEXT_PUBLIC_SITE_URL` directly with a `?? ""` fallback in two places (signup confirmation link, password-reset link), bypassing the validated `env` module used everywhere else in the codebase — meaning a misconfigured/missing site URL would silently produce a broken relative confirmation link instead of failing loudly. — `src/features/auth/actions.ts`

3. **`/calls` nav item mislabeled "active".** It is a bare `redirect("/conversations")` with no voice-specific filtering anywhere in the app (the schema's `voice` channel value is otherwise unused). Relabeled `"planned"`, consistent with how `/reviews` (also unbuilt) is already handled. — `src/lib/constants.ts`

4. **AI settings page didn't hide the activate/deactivate control for unauthorized roles.** The server action (`setReceptionistStatus`) already enforced the role check correctly — this was a UI consistency gap, not a security hole — but every other settings page hides restricted controls, this one didn't. — `src/app/(dashboard)/settings/ai/page.tsx`

5. **Raw UUIDs shown instead of names.** Both the dashboard's "Today's appointments" card and the Appointments page's "Upcoming" table displayed `a.patient_id`/`a.doctor_id`/`a.service_id` directly instead of resolving them to names — despite the Appointments page already fetching patient/doctor/service lists for its booking form. Added name lookups (including for archived/inactive resources referenced by existing appointments, not just the active ones used in the booking dropdowns) to both pages. — `src/app/(dashboard)/dashboard/page.tsx`, `src/app/(dashboard)/appointments/page.tsx`

6. **Unnecessary sensitive-field selection.** `invite/accept/page.tsx` selected `token_hash` into a Server Component even though it's never referenced in the rendered output — the actual accept flow independently re-hashes the token from the URL. Not exploitable as written (React Server Components only serialize the returned tree, not the whole closure), but fragile and unnecessary. Removed from the select. — `src/app/invite/accept/page.tsx`

### Investigated, found to be a misdiagnosis, corrected

7. **Patient phone uniqueness.** An earlier pass in this audit concluded `(organization_id, phone)` had no unique constraint on `patients` — based on only checking the lines immediately following `create table patients`, which show a plain, non-unique index. A new migration was written and a test added for it. On deeper verification (required for this report's honesty standard), the actual project already contains `create unique index patients_org_phone_unique_idx on patients (organization_id, phone) where phone is not null;`, added later in the same migration file rather than beside the table definition — which is why the earlier, narrower check missed it. **This was confirmed against a completely fresh, independent extraction of the original project files, not assumed.** The redundant new migration (which would have failed to apply — "relation already exists" — against a real database, since the index name already exists) was deleted, and the regression test was corrected to verify the pre-existing constraint instead of the deleted file. No actual bug existed here; the webhook's find-or-create-patient logic was already correctly backed by a real database constraint the whole time.

### Noted, not fixed (minor, judged not worth the risk/scope for this pass)

- Hard-delete actions (`deleteDoctorAction` and similar) surface a raw Postgres foreign-key-violation message if the row is still referenced elsewhere (e.g., an appointment), instead of a friendlier message. Not a crash, not a security issue — just unpolished error text.
- `sendConversationMessage` (the manual staff-composed message feature on a conversation) stores both the staff message and the AI's reply as `direction: "outbound"`. Functionally correct and tenant-scoped, but the intent (staff reply vs. AI-response-preview tool) isn't fully clear from the code alone, and reinterpreting it risked changing behavior no one asked to change. Flagged for product-level clarification, not touched.
- `/crm` is a thin, honest signpost to the real Patients feature rather than a separate feature — this is a legitimate design choice (transparently labeled), not a stub misrepresented as complete.

## 4. Security Fixes

Item 1 above (cross-tenant IDOR) is the only finding in this pass that was a genuine security gap rather than a UX/consistency issue. Everything else reviewed and confirmed correct, unchanged: service-role client is `server-only`-guarded and never imported by client code; tenant context is always derived from the authenticated membership (`getCurrentMembership()`/`requireMembership()`), never from client input; the AI orchestrator takes `organizationId` as a hard function parameter that the AI cannot influence, with prompt-injection guardrails in the system prompt *and* a real code-level enforcement boundary (not relying on the model obeying instructions); the WhatsApp webhook verifies HMAC (timing-safe) before parsing anything, resolves organization identity server-side from `phone_number_id` (never from webhook payload content), and its message deduplication is genuinely backed by a DB unique constraint with correct conflict handling; invitation tokens are cryptographically random with only their SHA-256 hash stored, and acceptance is row-locked, email-matched, one-time-use, with the role taken from the stored invite (never client input); the login/signup/password-reset/auth-confirm redirect targets are all validated with the same `startsWith("/") && !startsWith("//")` pattern; `src/proxy.ts`/`middleware.ts` uses `getUser()` (re-validates against Supabase Auth), never the unsafe `getSession()`, for its redirect decisions, and covers every protected route.

## 5. Data Integrity Fixes

None required in this pass beyond what's listed above — the one data-integrity concern investigated (patient phone uniqueness) turned out to already be correctly enforced (see §3, item 7).

## 6. UX / Product Fixes

Items 3, 4, and 5 above.

## 7. Tests Added or Updated

- `tests/static-verification.test.mjs` gained a regression test asserting the appointment-write cross-tenant guard (`verifyAppointmentReferences`) exists, checks all four references against the caller's `organization_id`, and is actually called — not just defined — from both `createAppointmentAction` and `rescheduleAppointmentAction`.
- A second new test asserts the patient-phone unique constraint exists and targets the same column pair the WhatsApp webhook's `.maybeSingle()` lookup uses.
- Both are static/source-pattern assertions, consistent with this suite's existing approach (there is no live Postgres/Supabase instance available in this environment to exercise real concurrency or cross-tenant runtime behavior) — documented here rather than faked, per instruction.
- Test count: 12/12 passing (was 10/10 before this pass).

## 8. Verification Results

Ran from a clean `rm -rf node_modules && npm ci`:

| Command | Result |
|---|---|
| `npm ci` | PASS — 428 packages |
| `npm run typecheck` | **PASS — 0 errors** |
| `npm run lint` | **PASS — 0 errors, 0 warnings** |
| `npm test` | **PASS — 12/12** |
| `node scripts/static-verification.mjs` | **PASS** — 132 files |
| `npm run build` (real, this sandbox, zero env vars) | Passes typecheck/lint/test/env-validation entirely; **fails only on `fonts.googleapis.com`**, which this sandbox's network allowlist doesn't include (package registries only) |
| `npm run build` (isolated diagnostic: `src/lib/fonts.ts` temporarily stubbed, checksummed before/after to confirm an exact, unmodified restore) | **PASS — all 28 routes generated**, including every route this pass touched |
| `npm run verify` | Passes `typecheck && lint && test`; **stops at `build` for the identical sandbox-only reason** |

The real, unmodified `next/font/google` configuration ships in the delivered project — the stub used for isolation was discarded immediately after the diagnostic build and never committed or packaged. This will build normally on Vercel, which has standard internet access.

## 9. Known Limitations / Remaining Risks

- **No live database in this environment.** Everything above the database-migration layer (RLS behavior under real concurrent load, the appointment IDOR fix's actual query results against real cross-org data, the patient-phone unique constraint's real conflict behavior) is verified by careful code/schema review and static tests, not live execution. Recommend running the actual migrations against a staging Supabase project and smoke-testing the appointment-booking and WhatsApp flows before relying on this in production.
- **`/calls` and `/reviews` are not implemented features** — both are honestly labeled `"planned"` in the nav and present an appropriate "coming soon" state; `/crm` is a working signpost to the real Patients feature, not a separate CRM implementation.
- **Minor unpolished error text** on some hard-delete actions when a foreign-key restriction blocks the delete (see §3) — cosmetic, not fixed in this pass.
- **This review sandbox cannot reach Google Fonts** — see §8. Not a project defect; will not occur on Vercel.

## 10. Dependency / npm audit Status

`npm audit` reported 6 high-severity advisories before this pass. Investigated individually rather than blindly force-fixing:

- **3 resolved safely** via plain `npm audit fix` (no `--force`, no dependency-range changes — `package.json` is byte-identical before/after, only `package-lock.json`'s resolved versions changed): `brace-expansion` (DoS via unbounded expansion), `js-yaml` (quadratic CPU consumption), `nanoid` (infinite loop on zero size). All three are dev-tooling/build-time dependencies, not runtime application code paths.
- **2 remain, deliberately not force-fixed**: `postcss` (XSS/path-traversal in CSS stringify/source-map handling) and `sharp` (inherited `libvips` CVEs), both bundled transitively by `next` itself. The only available fix requires `npm audit fix --force`, which would bump `next` to `16.3.2` — **outside the version range this project currently depends on**. Per explicit instruction not to force breaking dependency changes blindly: this was not applied. Practical exposure is low in this app's context — `postcss`'s vulnerabilities require processing untrusted/attacker-controlled CSS or source-map input at build time, and this project only builds its own developer-authored Tailwind/CSS, never third-party or user-supplied CSS; `sharp` is used by Next's built-in image-optimization route, which is a smaller, distinct risk surface but not zero. **Recommendation:** upgrade Next.js deliberately (test the new version against this app specifically) rather than accepting an unreviewed forced bump as a side effect of an audit fix.

## 11. Git / Release Status

No `.git` directory exists in this review environment — the project was provided as a source export, and this sandbox has no GitHub credentials for `mateenraza90/karobarshah-ai`. A local git repository was initialized here (`git init`, remote set to the stated `origin`), all current changes staged and committed with message `fix: complete production readiness audit`, and `git status` confirmed clean afterward — see the exact commit hash and push instructions in the final response below. **This sandbox cannot push on your behalf; run the provided command from a machine with your GitHub credentials to actually update the remote.**
