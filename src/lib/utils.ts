import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind class lists safely — later classes win over earlier
 * conflicting ones (e.g. cn("p-2", condition && "p-4") resolves to "p-4"),
 * which plain string concatenation can't do.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Strips characters that are syntactically meaningful in PostgREST's
 * filter-string grammar (`,` separates conditions, `.` separates
 * column/operator/value, `()` group logic) from user-supplied search
 * text before it's interpolated into an `.or("col.ilike.%value%")` call.
 * Row Level Security is still the actual tenant boundary regardless of
 * what a filter string contains — but a malformed or unexpected filter
 * shouldn't be buildable from raw user input either.
 */
export function sanitizeSearchQuery(query: string): string {
  return query.replace(/\\/g, "\\\\").replace(/[,.()]/g, " ").replace(/%/g, "\\%").replace(/_/g, "\\_").trim();
}
