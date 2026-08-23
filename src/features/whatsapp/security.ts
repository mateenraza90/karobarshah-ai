import crypto from "node:crypto";
import { serverEnv } from "@/lib/env.server";
export function verifyWhatsAppSignature(rawBody:string,signature:string|undefined){if(!serverEnv.WHATSAPP_APP_SECRET||!signature)return false;const expected=`sha256=${crypto.createHmac("sha256",serverEnv.WHATSAPP_APP_SECRET).update(rawBody).digest("hex")}`;const a=Buffer.from(expected);const b=Buffer.from(signature);return a.length===b.length&&crypto.timingSafeEqual(a,b);}
export function verifyWhatsAppChallenge(mode:string|null,token:string|null,challenge:string|null){return mode==="subscribe"&&!!serverEnv.WHATSAPP_VERIFY_TOKEN&&token===serverEnv.WHATSAPP_VERIFY_TOKEN?challenge:null;}
