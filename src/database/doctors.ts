import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, DoctorRow } from "@/types/database";
import { sanitizeSearchQuery } from "@/lib/utils";

type Client = SupabaseClient<Database>;

export async function listDoctors(supabase: Client, organizationId: string): Promise<DoctorRow[]> {
  const { data } = await supabase
    .from("doctors")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  return data ?? [];
}

const PAGE_SIZE = 10;

export async function listDoctorsPaginated(
  supabase: Client,
  organizationId: string,
  { query, page = 1 }: { query?: string; page?: number },
): Promise<{ doctors: DoctorRow[]; totalCount: number; pageSize: number }> {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let request = supabase
    .from("doctors")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId);

  if (query) {
    const q = sanitizeSearchQuery(query);
    request = request.or(`name.ilike.%${q}%,specialization.ilike.%${q}%`);
  }

  const { data, count } = await request.order("created_at", { ascending: true }).range(from, to);

  return { doctors: data ?? [], totalCount: count ?? 0, pageSize: PAGE_SIZE };
}

export async function countDoctors(supabase: Client, organizationId: string): Promise<number> {
  const { count } = await supabase
    .from("doctors")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  return count ?? 0;
}

export async function listRecentDoctors(
  supabase: Client,
  organizationId: string,
  limit = 5,
): Promise<DoctorRow[]> {
  const { data } = await supabase
    .from("doctors")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function createDoctor(
  supabase: Client,
  input: Database["public"]["Tables"]["doctors"]["Insert"],
) {
  return supabase.from("doctors").insert(input).select().single();
}

export async function updateDoctor(
  supabase: Client,
  doctorId: string,
  patch: Database["public"]["Tables"]["doctors"]["Update"],
) {
  return supabase.from("doctors").update(patch).eq("id", doctorId).select().single();
}

export async function deleteDoctor(supabase: Client, doctorId: string) {
  return supabase.from("doctors").delete().eq("id", doctorId);
}
