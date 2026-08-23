"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/services/supabase/server";
import { getCurrentMembership } from "@/database/memberships";
import { updateOrganization } from "@/database/organizations";
import type { ActionState } from "@/types";
const schema=z.object({name:z.string().trim().min(2).max(200),email:z.union([z.literal(""),z.email()]),phone:z.string().trim().max(30),address:z.string().trim().max(300),country:z.string().trim().max(100),timezone:z.string().trim().min(1),currency:z.string().trim().length(3)});
export async function saveBusinessProfile(_prev:ActionState,fd:FormData):Promise<ActionState>{const p=schema.safeParse(Object.fromEntries(fd));if(!p.success)return{fieldErrors:p.error.flatten().fieldErrors};const m=await getCurrentMembership();if(!m||!["owner","admin"].includes(m.role))return{error:"Only owners and admins can change the business profile."};const s=await createClient();const{error}=await updateOrganization(s,m.organization_id,{name:p.data.name,email:p.data.email||null,phone:p.data.phone||null,address:p.data.address||null,country:p.data.country||null,timezone:p.data.timezone,currency:p.data.currency.toUpperCase()});if(error)return{error:error.message};revalidatePath("/settings");return{message:"Business profile saved."};}
