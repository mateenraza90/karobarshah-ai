import "server-only";
import crypto from "node:crypto";
import { serverEnv } from "@/lib/env.server";
function key(){if(!serverEnv.WHATSAPP_ENCRYPTION_KEY)throw new Error("WhatsApp credential encryption is not configured.");const k=Buffer.from(serverEnv.WHATSAPP_ENCRYPTION_KEY,"base64");if(k.length!==32)throw new Error("WHATSAPP_ENCRYPTION_KEY must decode to 32 bytes.");return k;}
export function encryptSecret(value:string){const iv=crypto.randomBytes(12);const cipher=crypto.createCipheriv("aes-256-gcm",key(),iv);const ciphertext=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);return{ciphertext:ciphertext.toString("base64"),iv:iv.toString("base64"),tag:cipher.getAuthTag().toString("base64")};}
export function decryptSecret(ciphertext:string,iv:string,tag:string){const decipher=crypto.createDecipheriv("aes-256-gcm",key(),Buffer.from(iv,"base64"));decipher.setAuthTag(Buffer.from(tag,"base64"));return Buffer.concat([decipher.update(Buffer.from(ciphertext,"base64")),decipher.final()]).toString("utf8");}
