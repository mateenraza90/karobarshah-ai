import { cache } from "react";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/services/supabase/server";

/**
 * Wraps supabase.auth.getUser() in React's cache() so multiple call sites
 * in the same request (dashboard layout, getCurrentMembership, individual
 * pages) share one round trip to Supabase Auth instead of one each.
 */
export const getCachedUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
