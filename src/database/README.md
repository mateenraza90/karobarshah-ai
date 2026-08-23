# Database layer (reserved)

Milestone 0 creates no application tables — only Supabase Auth, which
Supabase manages internally. `src/types/database.ts` is currently a
placeholder for exactly that reason.

From Milestone 1 onward, this folder holds typed query helpers per entity
(e.g. `contacts.ts`, `bookings.ts`) that wrap the generated Supabase types.
Actual SQL migrations live in a `supabase/migrations` directory managed by
the Supabase CLI, not here — this folder is TypeScript access code only.
