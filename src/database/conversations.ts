import type { SupabaseClient } from "@supabase/supabase-js";
import type { Conversation, Database, Message } from "@/types/database";

type Client = SupabaseClient<Database>;

export async function findOrCreateConversation(client: Client, input: Database["public"]["Tables"]["conversations"]["Insert"]) {
  const existing = await client.from("conversations").select("*").eq("organization_id", input.organization_id).eq("channel", input.channel).eq("external_contact_key", input.external_contact_key ?? "").maybeSingle();
  if (existing.error && existing.error.code !== "PGRST116") return { conversation: null, error: existing.error };
  if (existing.data) return { conversation: existing.data as Conversation, error: null };
  const created = await client.from("conversations").insert(input).select().single();
  if (!created.error) return { conversation: created.data as Conversation | null, error: null };
  if (created.error.code === "23505") {
    const retried = await client.from("conversations").select("*").eq("organization_id", input.organization_id).eq("channel", input.channel).eq("external_contact_key", input.external_contact_key ?? "").maybeSingle();
    return { conversation: retried.data as Conversation | null, error: retried.error };
  }
  return { conversation: null, error: created.error };
}

export async function listConversations(client: Client, organizationId: string) {
  const { data, error } = await client.from("conversations").select("*").eq("organization_id", organizationId).order("last_message_at", { ascending: false, nullsFirst: false });
  return { conversations: (data ?? []) as Conversation[], error };
}
export async function listMessages(client: Client, organizationId: string, conversationId: string) {
  const { data, error } = await client.from("messages").select("*").eq("organization_id", organizationId).eq("conversation_id", conversationId).order("created_at");
  return { messages: (data ?? []) as Message[], error };
}
export async function insertMessage(client: Client, input: Database["public"]["Tables"]["messages"]["Insert"]) {
  return client.from("messages").insert(input).select().single();
}
