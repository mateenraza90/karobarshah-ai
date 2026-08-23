import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, ServiceRow } from "@/types/database";
import { sanitizeSearchQuery } from "@/lib/utils";

type Client = SupabaseClient<Database>;

export async function listServices(supabase: Client, organizationId: string): Promise<ServiceRow[]> {
  const { data } = await supabase
    .from("services")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  return data ?? [];
}

const PAGE_SIZE = 10;

export async function listServicesPaginated(
  supabase: Client,
  organizationId: string,
  { query, page = 1 }: { query?: string; page?: number },
): Promise<{ services: ServiceRow[]; totalCount: number; pageSize: number }> {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let request = supabase
    .from("services")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId);

  if (query) {
    const q = sanitizeSearchQuery(query);
    request = request.or(`name.ilike.%${q}%`);
  }

  const { data, count } = await request.order("created_at", { ascending: true }).range(from, to);

  return { services: data ?? [], totalCount: count ?? 0, pageSize: PAGE_SIZE };
}

export async function countServices(supabase: Client, organizationId: string): Promise<number> {
  const { count } = await supabase
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  return count ?? 0;
}

export async function listRecentServices(
  supabase: Client,
  organizationId: string,
  limit = 5,
): Promise<ServiceRow[]> {
  const { data } = await supabase
    .from("services")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function createService(
  supabase: Client,
  input: Database["public"]["Tables"]["services"]["Insert"],
) {
  return supabase.from("services").insert(input).select().single();
}

export async function updateService(
  supabase: Client,
  serviceId: string,
  patch: Database["public"]["Tables"]["services"]["Update"],
) {
  return supabase.from("services").update(patch).eq("id", serviceId).select().single();
}

export async function deleteService(supabase: Client, serviceId: string) {
  return supabase.from("services").delete().eq("id", serviceId);
}
