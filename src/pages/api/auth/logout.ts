import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client.ts";
import { createJsonResponse, createErrorResponse, logError } from "../../../lib/utils/error-handler.ts";

/**
 * Disable prerendering for this API route
 */
export const prerender = false;

/**
 * POST /api/auth/logout
 *
 * Logs out the current user by ending their session
 * Clears authentication cookies and redirects to home page
 */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    // Create request-scoped Supabase client
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Sign out the user (clears session and removes cookies)
    const { error } = await supabase.auth.signOut();

    if (error) {
      logError("POST /api/auth/logout - signOut", error);
      return createJsonResponse(createErrorResponse("INTERNAL_SERVER_ERROR", "Failed to log out"), 500);
    }

    // Redirect to home page after successful logout
    return redirect("/", 303);
  } catch (error) {
    logError("POST /api/auth/logout", error);
    return createJsonResponse(createErrorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred"), 500);
  }
};
