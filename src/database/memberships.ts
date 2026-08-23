import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/services/supabase/server";
import { createAdminClient } from "@/services/supabase/admin";
import { getCachedUser } from "@/services/supabase/get-cached-user";
import type { Database, MembershipRow, OrganizationRow } from "@/types/database";

type Client = SupabaseClient<Database>;

export type CurrentMembership = MembershipRow & { organization: OrganizationRow };

/**
 * Uncached — queries fresh every call. Needed anywhere a membership might
 * have just been created *within the current request* (e.g. right after
 * accepting a pending invite), since the cached wrapper below would
 * otherwise return its earlier, now-stale "no membership" result for the
 * rest of the request.
 */
export async function fetchMembershipForUser(userId: string): Promise<CurrentMembership | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("*, organization:organizations(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data as CurrentMembership | null;
}

/**
 * The signed-in user's organization + role, or null if they have none yet
 * (i.e. they still need to go through onboarding).
 *
 * A user could in principle belong to more than one organization (the
 * schema supports it), but Milestone 1 has no org-switcher UI, so we take
 * the earliest membership as "their" organization. Wrapped in React's
 * `cache()` so every Server Component/Action that needs this in the same
 * request shares one DB round trip instead of each querying separately.
 */
export const getCurrentMembership = cache(async (): Promise<CurrentMembership | null> => {
  const user = await getCachedUser();
  if (!user) return null;
  return fetchMembershipForUser(user.id);
});

export async function listMembers(supabase: Client, organizationId: string) {
  return supabase
    .from("memberships")
    .select("id, role, created_at, user_id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });
}

export async function countMembers(supabase: Client, organizationId: string): Promise<number> {
  const { count } = await supabase
    .from("memberships")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  return count ?? 0;
}

export type MemberWithEmail = {
  id: string;
  role: MembershipRow["role"];
  created_at: string;
  user_id: string;
  email: string;
};

/**
 * Members list enriched with each person's email. auth.users isn't
 * queryable through the regular RLS-scoped client (it's a different
 * schema, not exposed via PostgREST), so email lookup goes through the
 * admin client — narrowly, just to resolve a display string for people
 * already confirmed (by the RLS-respecting query above) to be members of
 * an org the caller belongs to.
 */
export async function listMembersWithEmail(
  supabase: Client,
  organizationId: string,
): Promise<MemberWithEmail[]> {
  const { data: members } = await listMembers(supabase, organizationId);
  if (!members || members.length === 0) return [];

  const admin = createAdminClient();
  const withEmail = await Promise.all(
    members.map(async (member) => {
      const { data } = await admin.auth.admin.getUserById(member.user_id);
      return { ...member, email: data.user?.email ?? "Unknown" };
    }),
  );

  return withEmail;
}
