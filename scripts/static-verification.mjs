import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const requiredFiles = [
  "package.json",
  "package-lock.json",
  "src/proxy.ts",
  "src/services/supabase/server.ts",
  "src/services/supabase/client.ts",
  "src/services/supabase/admin.ts",
  "src/features/auth/actions.ts",
  "src/app/auth/confirm/route.ts",
  "supabase/migrations/20260731190000_business_foundation_schema.sql",
  "supabase/migrations/20260731190001_business_foundation_rls.sql",
  "supabase/migrations/20260731210000_pending_invites.sql",
  "supabase/migrations/20260731220000_m1_completion.sql",
  "supabase/migrations/20260812000000_core_mvp.sql",
  "supabase/migrations/20260812000001_invitation_hardening.sql",
  "src/ai/orchestrator.ts",
  "src/ai/tools/index.ts",
  "src/ai/tools/executor.ts",
  "src/ai/context/index.ts",
  "src/app/api/webhooks/whatsapp/route.ts",
  "src/features/whatsapp/security.ts",
  "src/database/patients.ts",
  "src/database/appointments.ts",
  "src/database/conversations.ts",
];

for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) throw new Error(`Missing required file: ${file}`);
}

const sourceFiles = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (/\.(ts|tsx|mjs)$/.test(entry.name)) sourceFiles.push(path);
  }
}
walk(join(root, "src"));

for (const file of sourceFiles) {
  const source = readFileSync(file, "utf8");
  if (/(?:[:<]\s*|\bextends\s+)any\b/.test(source)) throw new Error(`Forbidden any type in ${file}`);
  if (/SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'`][^"'`]+["'`]/.test(source)) {
    throw new Error(`Possible hard-coded service-role credential in ${file}`);
  }
}

const confirm = readFileSync(join(root, "src/app/auth/confirm/route.ts"), "utf8");
if (!confirm.includes('!requestedNext.startsWith("//")')) {
  throw new Error("Auth confirmation redirect is not restricted to same-site paths");
}

const middleware = readFileSync(join(root, "src/services/supabase/middleware.ts"), "utf8");
if (!middleware.includes("supabase.auth.getUser()")) throw new Error("Middleware does not revalidate auth user");

const rls = readFileSync(join(root, "supabase/migrations/20260731190001_business_foundation_rls.sql"), "utf8") + "\n" + readFileSync(join(root, "supabase/migrations/20260731220000_m1_completion.sql"), "utf8") + "\n" + readFileSync(join(root, "supabase/migrations/20260812000000_core_mvp.sql"), "utf8");
for (const table of ["organizations", "memberships", "clinics", "doctors", "services", "business_memory_items", "patients", "appointments", "conversations", "messages", "faqs", "ai_interaction_logs", "ai_rate_limits", "whatsapp_connections"]) {
  if (!new RegExp(`alter\\s+table\\s+${table}\\s+enable\\s+row\\s+level\\s+security`).test(rls)) {
    throw new Error(`RLS not enabled for ${table}`);
  }
}

const core = readFileSync(join(root, "supabase/migrations/20260812000000_core_mvp.sql"), "utf8");
for (const marker of ["appointments_doctor_no_overlap", "unique (organization_id, provider_message_id)", "consume_ai_rate_limit", "enforce_appointment_tenant_integrity", "phone_number_id text not null unique"]) { if (!core.includes(marker)) throw new Error(`Missing core security marker: ${marker}`); }

const inviteHardening = readFileSync(join(root, "supabase/migrations/20260812000001_invitation_hardening.sql"), "utf8");
for (const marker of ["accept_pending_invite", "for update", "expires_at <= now()", "delete from pending_invites"]) { if (!inviteHardening.includes(marker)) throw new Error(`Invitation hardening missing marker: ${marker}`); }

const webhook = readFileSync(join(root, "src/app/api/webhooks/whatsapp/route.ts"), "utf8");
for (const marker of ["verifyWhatsAppSignature", "phone_number_id", "provider_message_id", "runReceptionist"]) { if (!webhook.includes(marker)) throw new Error(`Webhook missing security marker: ${marker}`); }

const executor = readFileSync(join(root, "src/ai/tools/executor.ts"), "utf8");
for (const marker of ["organizationId", "parseToolCall", "checkAvailability", "createAppointment", "cancelAppointment", "requireBookableResources", "assertToolPermission", "sanitizeSearchQuery"]) { if (!executor.includes(marker)) throw new Error(`AI executor missing security marker: ${marker}`); }

const tools = readFileSync(join(root, "src/ai/tools/index.ts"), "utf8");
for (const marker of [".strict()", "End time must be after start time", "additionalProperties: false"]) { if (!tools.includes(marker)) throw new Error(`AI tool schema missing strict validation marker: ${marker}`); }

const conversations = readFileSync(join(root, "src/database/conversations.ts"), "utf8");
if (!conversations.includes('created.error.code === "23505"')) throw new Error("Conversation find-or-create lacks unique-race recovery");

const schema = readFileSync(join(root, "supabase/migrations/20260731190000_business_foundation_schema.sql"), "utf8") + "\n" + readFileSync(join(root, "supabase/migrations/20260731220000_m1_completion.sql"), "utf8");
for (const marker of ["unique (organization_id, user_id)", "references organizations(id)", "references auth.users(id)", "create_organization_for_current_user"]) {
  if (!schema.includes(marker)) throw new Error(`Missing schema integrity marker: ${marker}`);
}

console.log(`Static verification passed: ${sourceFiles.length} source/config files inspected.`);
