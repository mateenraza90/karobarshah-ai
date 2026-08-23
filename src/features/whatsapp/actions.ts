"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/services/supabase/server";
import { getCurrentMembership } from "@/database/memberships";
import { encryptSecret } from "@/lib/security/secrets";
import type { ActionState } from "@/types";
const schema=z.object({phoneNumberId:z.string().trim().min(1).max(100),displayPhoneNumber:z.string().trim().max(50),businessAccountId:z.string().trim().max(100),accessToken:z.string().trim().min(20).max(10000)});
export async function saveWhatsAppConnection(_prev:ActionState,fd:FormData):Promise<ActionState>{const p=schema.safeParse({phoneNumberId:fd.get("phoneNumberId"),displayPhoneNumber:fd.get("displayPhoneNumber"),businessAccountId:fd.get("businessAccountId"),accessToken:fd.get("accessToken")});if(!p.success)return{fieldErrors:p.error.flatten().fieldErrors};const m=await getCurrentMembership();if(!m||!["owner","admin"].includes(m.role))return{error:"Only owners and admins can configure WhatsApp."};const s=await createClient();const encrypted=encryptSecret(p.data.accessToken);const {error}=await s.from("whatsapp_connections").upsert({organization_id:m.organization_id,phone_number_id:p.data.phoneNumberId,display_phone_number:p.data.displayPhoneNumber||null,business_account_id:p.data.businessAccountId||null,access_token_ciphertext:encrypted.ciphertext,access_token_iv:encrypted.iv,access_token_tag:encrypted.tag,is_active:true},{onConflict:"organization_id"});if(error)return{error:error.message};revalidatePath("/settings/whatsapp");return{message:"WhatsApp connection saved securely."};}
