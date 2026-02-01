import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerInstance } from "../db/supabase.client.ts";
import type { ProfileDTO } from "../types.ts";

/**
 * Public paths that don't require authentication
 * Note: Home (/) is public but shows personalized content when authenticated
 */
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  // API auth endpoints
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/logout",
];

/**
 * Auth page paths that should redirect authenticated users away
 */
const AUTH_PAGE_PATHS = ["/login", "/signup"];

/**
 * Protected paths that require authentication
 */
const PROTECTED_PATHS = ["/profile", "/cookbook"];

/**
 * Check if path is protected
 */
function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Middleware: Authentication and session management
 *
 * Responsibilities:
 * - Create request-scoped Supabase client with cookie-backed auth
 * - Populate locals.user and locals.profile for all authenticated requests
 * - Redirect authenticated users away from auth pages (/login, /signup)
 * - Redirect unauthenticated users away from protected pages
 */
export const onRequest = defineMiddleware(async ({ locals, cookies, url, request, redirect }, next) => {
  // Create request-scoped Supabase server client
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // Store supabase client in locals for use in API routes
  locals.supabase = supabase;

  // Get authenticated user from session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is authenticated, fetch profile and populate locals
  if (user) {
    locals.user = {
      id: user.id,
      email: user.email ?? "",
    };

    // Fetch profile from database
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, selected_level, created_at, updated_at")
      .eq("id", user.id)
      .single();

    if (profile) {
      locals.profile = profile as ProfileDTO;
    }

    // Redirect authenticated users away from auth pages
    if (AUTH_PAGE_PATHS.includes(url.pathname)) {
      return redirect("/");
    }
  } else {
    // User is not authenticated
    // Redirect to login if trying to access protected path
    if (isProtectedPath(url.pathname) && !PUBLIC_PATHS.includes(url.pathname)) {
      return redirect("/login");
    }
  }

  return next();
});
