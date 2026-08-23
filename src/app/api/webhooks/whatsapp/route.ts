import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/services/supabase/admin";
import { verifyWhatsAppChallenge, verifyWhatsAppSignature } from "@/features/whatsapp/security";
import { findOrCreateConversation, insertMessage } from "@/database/conversations";
import { runReceptionist } from "@/ai/orchestrator";
import { getMessagingProvider } from "@/features/whatsapp/provider";
import type { WhatsAppConnection } from "@/types/database";

const payloadSchema = z.object({
  object: z.string(),
  entry: z.array(z.object({
    changes: z.array(z.object({
      value: z.object({
        metadata: z.object({ phone_number_id: z.string() }),
        contacts: z.array(z.object({
          wa_id: z.string(),
          profile: z.object({ name: z.string().optional() }).optional(),
        }).passthrough()).optional(),
        messages: z.array(z.object({
          from: z.string(),
          id: z.string(),
          type: z.string(),
          text: z.object({ body: z.string() }).optional(),
        }).passthrough()).optional(),
      }).passthrough(),
    }).passthrough()),
  }).passthrough()),
});

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const challenge = verifyWhatsAppChallenge(u.searchParams.get("hub.mode"), u.searchParams.get("hub.verify_token"), u.searchParams.get("hub.challenge"));
  return challenge ? new NextResponse(challenge, { status: 200 }) : new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyWhatsAppSignature(raw, req.headers.get("x-hub-signature-256") ?? undefined)) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const admin = createAdminClient();
  for (const entry of parsed.data.entry) {
    for (const change of entry.changes) {
      const phoneNumberId = change.value.metadata.phone_number_id;
      const { data: connection } = await admin.from("whatsapp_connections").select("*").eq("phone_number_id", phoneNumberId).eq("is_active", true).maybeSingle();
      if (!connection) continue;

      for (const msg of change.value.messages ?? []) {
        if (msg.type !== "text" || !msg.text?.body) continue;
        const conversation = await findOrCreateConversation(admin, {
          organization_id: connection.organization_id,
          channel: "whatsapp",
          external_contact_key: msg.from,
          patient_id: null,
        });
        if (conversation.error || !conversation.conversation) continue;

        const existing = await admin.from("messages").select("id").eq("organization_id", connection.organization_id).eq("provider_message_id", msg.id).maybeSingle();
        if (existing.data) continue;

        const patientLookup = await admin.from("patients").select("id").eq("organization_id", connection.organization_id).eq("phone", msg.from).maybeSingle();
        let patientId = patientLookup.data?.id ?? null;
        if (!patientId) {
          const created = await admin.from("patients").insert({ organization_id: connection.organization_id, full_name: change.value.contacts?.[0]?.profile?.name ?? msg.from, phone: msg.from }).select("id").single();
          if (created.error) {
            const retry = await admin.from("patients").select("id").eq("organization_id", connection.organization_id).eq("phone", msg.from).maybeSingle();
            patientId = retry.data?.id ?? null;
          } else {
            patientId = created.data?.id ?? null;
          }
        }
        await admin.from("conversations").update({ patient_id: patientId, last_message_at: new Date().toISOString() }).eq("id", conversation.conversation.id);

        const inbound = await insertMessage(admin, {
          organization_id: connection.organization_id,
          conversation_id: conversation.conversation.id,
          patient_id: patientId,
          sender_type: "human",
          direction: "inbound",
          content: msg.text.body,
          provider_message_id: msg.id,
          delivery_status: "received",
        });
        if (inbound.error) continue;

        try {
          const { data: employee } = await admin.from("ai_employee_instances").select("status").eq("organization_id", connection.organization_id).eq("employee_type", "receptionist").maybeSingle();
          if (employee?.status !== "active") continue;
          const ai = await runReceptionist(admin, connection.organization_id, undefined, { conversationId: conversation.conversation.id, patientId: patientId ?? undefined, message: msg.text.body });
          const provider = getMessagingProvider();
          const sent = await provider.send({ to: msg.from, text: ai.message, connection: connection as WhatsAppConnection });
          await insertMessage(admin, {
            organization_id: connection.organization_id,
            conversation_id: conversation.conversation.id,
            patient_id: patientId,
            sender_type: "ai",
            direction: "outbound",
            content: ai.message,
            provider_message_id: sent.providerMessageId,
            delivery_status: "sent",
            metadata: { provider: ai.provider },
          });
        } catch (error) {
          await admin.from("messages").insert({
            organization_id: connection.organization_id,
            conversation_id: conversation.conversation.id,
            patient_id: patientId,
            sender_type: "system",
            direction: "outbound",
            content: "AI response failed",
            delivery_status: "failed",
            metadata: { error: error instanceof Error ? error.name : "AI_ERROR" },
          });
        }
      }
    }
  }
  return NextResponse.json({ received: true });
}
