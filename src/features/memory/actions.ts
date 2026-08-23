"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/services/supabase/server";
import { getCurrentMembership } from "@/database/memberships";
import { createMemoryItem, updateMemoryItem, deleteMemoryItem } from "@/database/memory";
import type { ActionState } from "@/types";
import { createEmbedding } from "@/ai/context/embeddings";
const schema=z.object({type:z.enum(["hours","service","faq","policy"]),title:z.string().trim().max(150),content:z.string().trim().min(1).max(5000)});
async function allowed(){const m=await getCurrentMembership();if(!m||!["owner","admin","manager"].includes(m.role))return null;return m;}
export async function saveMemoryItem(_prev:ActionState,fd:FormData):Promise<ActionState>{const p=schema.safeParse({type:fd.get("type"),title:fd.get("title"),content:fd.get("content")});if(!p.success)return{fieldErrors:p.error.flatten().fieldErrors};const m=await allowed();if(!m)return{error:"You do not have permission to manage business memory."};const s=await createClient();const id=String(fd.get("id")??"");let embedding:number[]|null=null;try{embedding=await createEmbedding(`${p.data.type}: ${p.data.title}
${p.data.content}`);}catch{embedding=null;}const result=id?await updateMemoryItem(s,id,{type:p.data.type,title:p.data.title||null,content:p.data.content,embedding}):await createMemoryItem(s,{organization_id:m.organization_id,...p.data,title:p.data.title||null,embedding});if(result.error)return{error:result.error.message};revalidatePath("/settings/memory");return{message:id?"Memory item updated.":"Memory item added."};}
export async function deleteMemoryItemAction(_prev:ActionState,fd:FormData):Promise<ActionState>{const m=await allowed();if(!m)return{error:"You do not have permission to manage business memory."};const id=String(fd.get("id")??"");if(!z.string().uuid().safeParse(id).success)return{error:"Invalid memory item."};const s=await createClient();const result=await deleteMemoryItem(s,id);if(result.error)return{error:result.error.message};revalidatePath("/settings/memory");return{message:"Memory item deleted."};}

const faqSchema = z.object({
  question: z.string().trim().min(2).max(500),
  answer: z.string().trim().min(1).max(5000),
  active: z.enum(["on", "off"]).default("off"),
});

export async function saveFAQ(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = faqSchema.safeParse({
    question: fd.get("question"),
    answer: fd.get("answer"),
    active: fd.get("active") === "on" ? "on" : "off",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const m = await allowed();
  if (!m) return { error: "You do not have permission to manage FAQs." };
  const id = String(fd.get("id") ?? "");
  if (id && !z.uuid().safeParse(id).success) return { error: "Invalid FAQ." };
  const s = await createClient();
  const payload = { question: parsed.data.question, answer: parsed.data.answer, is_active: parsed.data.active === "on" };
  const result = id
    ? await s.from("faqs").update(payload).eq("id", id).eq("organization_id", m.organization_id).select().single()
    : await s.from("faqs").insert({ organization_id: m.organization_id, ...payload }).select().single();
  if (result.error) return { error: result.error.message };
  revalidatePath("/settings/memory");
  return { message: id ? "FAQ updated." : "FAQ added." };
}

export async function deleteFAQAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const m = await allowed();
  if (!m) return { error: "You do not have permission to manage FAQs." };
  const id = String(fd.get("id") ?? "");
  if (!z.uuid().safeParse(id).success) return { error: "Invalid FAQ." };
  const s = await createClient();
  const { error } = await s.from("faqs").delete().eq("id", id).eq("organization_id", m.organization_id);
  if (error) return { error: error.message };
  revalidatePath("/settings/memory");
  return { message: "FAQ deleted." };
}
