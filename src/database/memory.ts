import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, BusinessMemoryItemRow } from "@/types/database";
import { sanitizeSearchQuery } from "@/lib/utils";

type Client = SupabaseClient<Database>;

export async function listMemoryItems(supabase: Client, organizationId: string, type?: BusinessMemoryItemRow["type"]) {
  let query = supabase.from("business_memory_items").select("*").eq("organization_id", organizationId).order("updated_at", { ascending: false });
  if (type) query = query.eq("type", type);
  const { data } = await query;
  return data ?? [];
}

export async function searchMemoryItems(supabase: Client, organizationId: string, query: string) {
  const q = sanitizeSearchQuery(query);
  if (!q) return listMemoryItems(supabase, organizationId);
  const { data } = await supabase.from("business_memory_items").select("*").eq("organization_id", organizationId).or(`title.ilike.%${q}%,content.ilike.%${q}%`).order("updated_at", { ascending: false }).limit(20);
  return data ?? [];
}

export async function createMemoryItem(supabase: Client, input: Database["public"]["Tables"]["business_memory_items"]["Insert"]) {
  return supabase.from("business_memory_items").insert(input).select().single();
}
export async function updateMemoryItem(supabase: Client, id: string, patch: Database["public"]["Tables"]["business_memory_items"]["Update"]) {
  return supabase.from("business_memory_items").update(patch).eq("id", id).select().single();
}
export async function deleteMemoryItem(supabase: Client, id: string) { return supabase.from("business_memory_items").delete().eq("id", id); }
