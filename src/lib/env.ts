import { z } from "zod";

/**
 * Every environment variable the app depends on is declared here.
 * If one is missing at startup, we fail immediately with a message
 * that says exactly what's missing — instead of letting a library
 * three layers down throw an opaque "invalid URL" error.
 */
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({
    error: "NEXT_PUBLIC_SUPABASE_URL must be a valid URL (see .env.example)",
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
    error: "NEXT_PUBLIC_SUPABASE_ANON_KEY is required (see .env.example)",
  }),
  NEXT_PUBLIC_SITE_URL: z.url({
    error: "NEXT_PUBLIC_SITE_URL must be a valid URL (see .env.example)",
  }),
});

type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

function loadEnv(): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `\n\nInvalid or missing environment variables:\n${issues}\n\n` +
        `Copy .env.example to .env.local and fill in your Supabase project credentials.\n`,
    );
  }

  cached = parsed.data;
  return cached;
}

/**
 * Validated lazily, on first property access, rather than at module
 * evaluation time. Next.js's build-time "collect page data" step imports
 * every route module to read its exported config — for a route like
 * /auth/confirm that never actually runs during a build, that import alone
 * used to be enough to throw if these variables weren't set locally, well
 * before any request-specific runtime context existed. Deferring the read
 * to actual property access means the build only needs these to be *set*
 * when a request genuinely reaches code that uses them — which in
 * production (Vercel) it always does, since these are configured as
 * project environment variables there. The validation itself, and its
 * behavior when a variable really is missing, are unchanged.
 */
export const env: Env = {
  get NEXT_PUBLIC_SUPABASE_URL() {
    return loadEnv().NEXT_PUBLIC_SUPABASE_URL;
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY() {
    return loadEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY;
  },
  get NEXT_PUBLIC_SITE_URL() {
    return loadEnv().NEXT_PUBLIC_SITE_URL;
  },
};
