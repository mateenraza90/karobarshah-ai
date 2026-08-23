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
