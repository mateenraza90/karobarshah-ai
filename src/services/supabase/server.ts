import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Supabase client for use on the server: Server Components, Server Actions,
 * and Route Handlers. Reads/writes the session via the Next.js cookie store.
 *
 * IMPORTANT: cookies() is only writable inside Server Actions and Route
 * Handlers. When this client is used inside a Server Component render,
 * the `setAll` call below will throw — we swallow that specific case,
 * because the proxy (src/proxy.ts) is already responsible for refreshing
 * and persisting the session cookie on every request. See the Next.js
 * docs on Server Component cookie limitations.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component — safe to ignore because
            // proxy.ts refreshes the session on every navigation.
          }
        },
      },
    },
  );
}
