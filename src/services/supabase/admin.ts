import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import type { Database } from "@/types/database";

/**
 * Bypasses Row Level Security entirely — this is not "the server client
 * but stronger," it's a different trust model. Use only for the specific
 * operations that genuinely need it (sending a Supabase auth invite,
 * creating a membership row on a user's behalf when they accept one) and
 * never for anything a regular authenticated request could do instead.
 * Every call site using this client must independently verify the
 * caller's permission before acting — RLS isn't doing it for you here.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
