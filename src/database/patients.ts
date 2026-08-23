import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Patient } from "@/types/database";
import { sanitizeSearchQuery } from "@/lib/utils";

type Client = SupabaseClient<Database>;
const PAGE_SIZE = 20;

export async function listPatientsPaginated(client: Client, organizationId: string, query?: string, page = 1) {
  const from = Math.max(0, page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  let request = client.from("patients").select("*", { count: "exact" }).eq("organization_id", organizationId).eq("is_active", true);
  if (query?.trim()) {
    const q = sanitizeSearchQuery(query);
    request = request.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
  }
  const { data, count, error } = await request.order("full_name").range(from, to);
  return { patients: (data ?? []) as Patient[], totalCount: count ?? 0, pageSize: PAGE_SIZE, error };
}

export async function getPatient(client: Client, organizationId: string, id: string) {
  const { data, error } = await client.from("patients").select("*").eq("organization_id", organizationId).eq("id", id).maybeSingle();
  return { patient: data as Patient | null, error };
}

export async function createPatient(client: Client, input: Database["public"]["Tables"]["patients"]["Insert"]) {
  return client.from("patients").insert(input).select().single();
}
export async function updatePatient(client: Client, organizationId: string, id: string, patch: Database["public"]["Tables"]["patients"]["Update"]) {
  return client.from("patients").update(patch).eq("organization_id", organizationId).eq("id", id).select().single();
}
export async function archivePatient(client: Client, organizationId: string, id: string) {
  return client.from("patients").update({ is_active: false }).eq("organization_id", organizationId).eq("id", id);
}
