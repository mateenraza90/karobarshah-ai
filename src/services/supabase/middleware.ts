import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";

const PROTECTED_PREFIXES = ["/dashboard", "/calls", "/appointments", "/crm", "/reviews", "/analytics", "/settings", "/patients", "/conversations"];
// Routes an already-authenticated user should be bounced away from.
// Deliberately excludes /reset-password: reaching it *with* a session is
// the expected flow after clicking the emailed recovery link — that link
// signs the user in via a recovery token specifically so they can set a
// new password, so redirecting them to /dashboard here would break
// password reset entirely.
const SIGNED_OUT_ONLY_PREFIXES = ["/login", "/signup", "/forgot-password"];

/**
 * Refreshes the Supabase session cookie on every request and performs an
 * *optimistic* redirect for unauthenticated/authenticated users hitting the
 * wrong side of the app. This only reads the session from the cookie (fast,
 * no DB round-trip) — it is not a substitute for checking auth again in
 * Server Components/Actions that touch real data, per the Next.js Data
 * Access Layer pattern.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() re-validates the token against Supabase Auth on
  // every call. Never swap this for getSession() here — a session read
  // from the cookie alone can't be trusted for authorization decisions.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isSignedOutOnlyRoute = SIGNED_OUT_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isProtectedRoute && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isSignedOutOnlyRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}
