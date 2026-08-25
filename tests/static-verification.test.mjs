import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Resolve the repository root relative to this test file itself (not the
// shell's current working directory), using fileURLToPath rather than
// URL#pathname. URL#pathname never decodes percent-encoding (a space in a
// Windows username becomes a literal "%20") and, on Windows, keeps a leading
// "/" before the drive letter (e.g. "/C:/Users/..."). Passing that malformed
// leading-slash string into path.join()/readFileSync() gets misread as
// "root of the current drive", so Node re-prepends the actual current drive
// letter and produces a doubled path like "C:\C:\Users\...". fileURLToPath
// converts a file:// URL to a proper, fully-decoded, OS-native absolute path
// on every platform (Windows, macOS, Linux), including paths containing
// spaces, so this class of bug can't recur.
const testFileDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(testFileDir, "..");

function resolvePath(relative) {
  return join(projectRoot, relative);
}

function read(relative) {
  return readFileSync(resolvePath(relative), "utf8");
}

function fileExists(relative) {
  return existsSync(resolvePath(relative));
}

test("required M0/M1 project artifacts exist", () => {
  for (const file of [
    "package.json",
    "package-lock.json",
    "src/features/auth/actions.ts",
    "src/services/supabase/server.ts",
    "src/services/supabase/middleware.ts",
    "supabase/migrations/20260731190000_business_foundation_schema.sql",
    "supabase/migrations/20260731190001_business_foundation_rls.sql",
    "supabase/migrations/20260731210000_pending_invites.sql",
    "supabase/migrations/20260731220000_m1_completion.sql",
  ]) assert.equal(fileExists(file), true, file);
});

test("auth confirmation only accepts relative redirect targets", () => {
  const source = read("src/app/auth/confirm/route.ts");
  assert.match(source, /startsWith\("\/"\)/);
  assert.match(source, /!requestedNext\.startsWith\("\/\/"\)/);
});

test("service-role access is server-only", () => {
  const admin = read("src/services/supabase/admin.ts");
  const envServer = read("src/lib/env.server.ts");
  assert.match(admin, /import ["']server-only["']/);
  assert.match(envServer, /import ["']server-only["']/);
});

test("tenant RLS is enabled on M1 tables", () => {
  const rls = read("supabase/migrations/20260731190001_business_foundation_rls.sql") + read("supabase/migrations/20260731220000_m1_completion.sql");
  for (const table of ["organizations", "memberships", "clinics", "doctors", "services", "business_memory_items"]) {
    assert.match(rls, new RegExp(`alter table ${table}\\s+enable row level security`));
  }
});

test("M1 completion adds tenant-scoped memory and atomic onboarding", () => {
  const migration = read("supabase/migrations/20260731220000_m1_completion.sql");
  assert.match(migration, /create table business_memory_items/);
  assert.match(migration, /alter table business_memory_items enable row level security/);
  assert.match(migration, /create_organization_for_current_user/);
  assert.match(migration, /already belongs to an organization/);
});

test("membership creation is restricted to self-owner on empty organizations", () => {
  const rls = read("supabase/migrations/20260731190001_business_foundation_rls.sql");
  assert.match(rls, /user_id = auth\.uid\(\)/);
  assert.match(rls, /role = 'owner'/);
  assert.match(rls, /not org_has_any_members\(organization_id\)/);
});

test("M1 mutations derive tenant context from the authenticated membership", () => {
  for (const file of [
    "src/features/onboarding/actions.ts",
    "src/features/clinic/actions.ts",
    "src/features/doctors/actions.ts",
    "src/features/services/actions.ts",
    "src/features/memory/actions.ts",
    "src/features/team/actions.ts",
    "src/features/settings/actions.ts",
  ]) {
    const source = read(file);
    assert.match(source, /getCurrentMembership\(\)/, file);
  }
});

test("core MVP runtime boundaries are present", () => {
  const migration = read("supabase/migrations/20260812000000_core_mvp.sql");
  for (const marker of ["create table patients", "create table appointments", "create table conversations", "create table messages", "create table faqs", "create table ai_interaction_logs", "create table whatsapp_connections", "appointments_doctor_no_overlap", "appointments_patient_no_overlap"]) {
    assert.ok(migration.includes(marker), `missing ${marker}`);
  }
});

// Regression coverage for a cross-tenant IDOR found in the second-phase
// production audit: creating/rescheduling an appointment let a caller
// reference another organization's patient/doctor/service/clinic by ID,
// since neither the FK constraints (which only require the row to exist
// *somewhere*) nor RLS on `appointments` (which only checks the
// appointment row's own organization_id) catch that. This can only be
// verified statically here — actually exercising the race/IDOR requires a
// live Postgres instance with two organizations' data, which this test
// environment doesn't have. What's verified: the guard function exists,
// checks all four references against the caller's own organization_id,
// and is actually called (not just defined) from both write paths that
// accept these references from a caller.
test("appointment writes verify patient/doctor/service/clinic belong to the caller's organization", () => {
  const db = read("src/database/appointments.ts");
  assert.match(db, /export async function verifyAppointmentReferences/);
  const dbCallSite = db.slice(db.indexOf("verifyAppointmentReferences", db.indexOf("export async function verifyAppointmentReferences") + 1));
  assert.match(dbCallSite, /eq\("organization_id",\s*organizationId\)/);

  const actions = read("src/features/appointments/actions.ts");
  assert.match(actions, /import\s*{[^}]*verifyAppointmentReferences[^}]*}\s*from\s*"@\/database\/appointments"/);
  const createFn = actions.slice(actions.indexOf("export async function createAppointmentAction"), actions.indexOf("export async function rescheduleAppointmentAction"));
  const rescheduleFn = actions.slice(actions.indexOf("export async function rescheduleAppointmentAction"));
  for (const fn of [createFn, rescheduleFn]) {
    assert.match(fn, /verifyAppointmentReferences\(/);
    // The verification result must actually gate the write, not just be
    // computed and discarded.
    assert.match(fn, /if\s*\(!validRefs\)\s*return\s*{\s*error:/);
  }
});

// Regression coverage for patient-record deduplication: the WhatsApp
// webhook's find-or-create-patient logic looks a patient up by phone with
// `.maybeSingle()` (which assumes at most one match) and falls back to a
// re-select on insert conflict — both only work correctly if
// (organization_id, phone) is actually unique at the database level.
// (An initial pass of this audit mistakenly concluded that constraint was
// missing, based on only checking the lines immediately after `create
// table patients`; a unique index enforcing exactly this was already
// present, just added later in the same migration file rather than next
// to the table definition. Corrected here — no new migration was needed.)
// Actually exercising the concurrent-webhook race requires a live
// database and two simultaneous requests, which isn't possible in this
// static test environment; what's verified is that the constraint and
// the webhook's lookup both target the same column pair.
test("patient phone uniqueness is enforced and matches the webhook's lookup semantics", () => {
  const migration = read("supabase/migrations/20260812000000_core_mvp.sql");
  assert.match(migration, /create unique index patients_org_phone_unique_idx on patients \(organization_id, phone\) where phone is not null/);

  const webhook = read("src/app/api/webhooks/whatsapp/route.ts");
  assert.match(webhook, /\.from\("patients"\)[\s\S]{0,200}\.eq\("phone",\s*msg\.from\)[\s\S]{0,80}\.maybeSingle\(\)/);
});

test("AI tools are fixed and organization context is executor-owned", () => {
  const tools = read("src/ai/tools/index.ts");
  const executor = read("src/ai/tools/executor.ts");
  for (const name of ["find_doctor", "get_services", "get_business_hours", "search_faq", "check_availability", "book_appointment", "reschedule_appointment", "cancel_appointment"]) assert.ok(tools.includes(name), name);
  assert.ok(tools.includes("Unknown AI tool"));
  assert.ok(executor.includes("organizationId"));
  assert.ok(!executor.includes("raw SQL"));
});

test("WhatsApp webhook enforces HMAC and provider-message deduplication", () => {
  const security = read("src/features/whatsapp/security.ts");
  const route = read("src/app/api/webhooks/whatsapp/route.ts");
  assert.ok(security.includes("createHmac(\"sha256\""));
  assert.ok(security.includes("timingSafeEqual"));
  assert.ok(route.includes("x-hub-signature-256"));
  assert.ok(route.includes("provider_message_id"));
  assert.ok(route.includes("existing.data"));
});
