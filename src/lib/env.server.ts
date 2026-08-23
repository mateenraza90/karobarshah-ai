import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, { error: "SUPABASE_SERVICE_ROLE_KEY is required for server-only admin operations." }),
  AI_PROVIDER: z.enum(["mock", "openai", "anthropic"]).default("mock"),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_BASE_URL: z.url().default("https://api.openai.com/v1"),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_BASE_URL: z.url().default("https://api.anthropic.com/v1"),
  WHATSAPP_MODE: z.enum(["mock", "meta"]).default("mock"),
  WHATSAPP_APP_SECRET: z.string().min(1).optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1).optional(),
  WHATSAPP_ENCRYPTION_KEY: z.string().min(32).optional(),
});

type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

function loadServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    AI_PROVIDER: process.env.AI_PROVIDER,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL,
    WHATSAPP_MODE: process.env.WHATSAPP_MODE,
    WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET,
    WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
    WHATSAPP_ENCRYPTION_KEY: process.env.WHATSAPP_ENCRYPTION_KEY,
  });

  if (!parsed.success) {
    throw new Error(
      `\n\nInvalid server environment variables:\n${parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n")}\n`,
    );
  }

  cached = parsed.data;
  return cached;
}

/**
 * Validated lazily, on first property access — see the matching comment in
 * src/lib/env.ts for why. This module is imported (directly or transitively)
 * by route handlers that don't run during `next build`'s page-data
 * collection, so eager validation here caused the same unnecessary
 * build-time crash for any code path that pulled it in.
 */
export const serverEnv: ServerEnv = {
  get SUPABASE_SERVICE_ROLE_KEY() {
    return loadServerEnv().SUPABASE_SERVICE_ROLE_KEY;
  },
  get AI_PROVIDER() {
    return loadServerEnv().AI_PROVIDER;
  },
  get OPENAI_API_KEY() {
    return loadServerEnv().OPENAI_API_KEY;
  },
  get OPENAI_BASE_URL() {
    return loadServerEnv().OPENAI_BASE_URL;
  },
  get ANTHROPIC_API_KEY() {
    return loadServerEnv().ANTHROPIC_API_KEY;
  },
  get ANTHROPIC_BASE_URL() {
    return loadServerEnv().ANTHROPIC_BASE_URL;
  },
  get WHATSAPP_MODE() {
    return loadServerEnv().WHATSAPP_MODE;
  },
  get WHATSAPP_APP_SECRET() {
    return loadServerEnv().WHATSAPP_APP_SECRET;
  },
  get WHATSAPP_VERIFY_TOKEN() {
    return loadServerEnv().WHATSAPP_VERIFY_TOKEN;
  },
  get WHATSAPP_ENCRYPTION_KEY() {
    return loadServerEnv().WHATSAPP_ENCRYPTION_KEY;
  },
};
