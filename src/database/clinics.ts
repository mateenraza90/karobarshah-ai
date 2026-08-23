import type { SupabaseClient } from "@supabase/supabase-js";

import type { ClinicRow, Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export async function getClinic(supabase: Client, organizationId: string): Promise<ClinicRow | null> {
  const { data } = await supabase
    .from("clinics")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  return data;
}

export async function createClinic(
  supabase: Client,
  input: Database["public"]["Tables"]["clinics"]["Insert"],
) {
  return supabase.from("clinics").insert(input).select().single();
}

export async function updateClinic(
  supabase: Client,
  organizationId: string,
  patch: Database["public"]["Tables"]["clinics"]["Update"],
) {
  return supabase
    .from("clinics")
    .update(patch)
    .eq("organization_id", organizationId)
    .select()
    .single();
}

/** Creates the clinic row if it doesn't exist yet, otherwise updates it. */
export async function upsertClinic(
  supabase: Client,
  organizationId: string,
  patch: Omit<Database["public"]["Tables"]["clinics"]["Insert"], "organization_id">,
) {
  const existing = await getClinic(supabase, organizationId);
  if (existing) {
    return updateClinic(supabase, organizationId, patch);
  }
  return createClinic(supabase, { organization_id: organizationId, ...patch });
}
