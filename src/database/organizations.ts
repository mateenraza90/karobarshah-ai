import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, OrganizationRow } from "@/types/database";

type Client = SupabaseClient<Database>;

export async function getOrganization(
  supabase: Client,
  organizationId: string,
): Promise<OrganizationRow | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .single();

  if (error) return null;
  return data;
}

export async function createOrganization(
  supabase: Client,
  input: Database["public"]["Tables"]["organizations"]["Insert"],
) {
  return supabase.from("organizations").insert(input).select().single();
}

export async function updateOrganization(
  supabase: Client,
  organizationId: string,
  patch: Database["public"]["Tables"]["organizations"]["Update"],
) {
  return supabase.from("organizations").update(patch).eq("id", organizationId).select().single();
}

export async function markOnboardingComplete(supabase: Client, organizationId: string) {
  return updateOrganization(supabase, organizationId, {
    onboarding_completed_at: new Date().toISOString(),
  });
}
