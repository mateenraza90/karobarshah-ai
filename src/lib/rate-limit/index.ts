import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
export async function consumeAIRateLimit(client:SupabaseClient<Database>,organizationId:string,userId:string,windowSeconds=60,maxRequests=20){const {data,error}=await client.rpc("consume_ai_rate_limit",{target_org_id:organizationId,target_user_id:userId,window_seconds:windowSeconds,max_requests:maxRequests});if(error)throw error;return Boolean(data);}
export async function consumeAIOrgRateLimit(client:SupabaseClient<Database>,organizationId:string,windowSeconds=60,maxRequests=20){const {data,error}=await client.rpc("consume_ai_org_rate_limit",{target_org_id:organizationId,window_seconds:windowSeconds,max_requests:maxRequests});if(error)throw error;return Boolean(data);}

export async function consumeAIOrgRateLimitService(client:SupabaseClient<Database>,organizationId:string,windowSeconds=60,maxRequests=20){const {data,error}=await client.rpc("consume_ai_org_rate_limit_service",{target_org_id:organizationId,window_seconds:windowSeconds,max_requests:maxRequests});if(error)throw error;return Boolean(data);}
