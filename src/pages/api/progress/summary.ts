/**
 * /api/progress/summary
 *
 * Handles user progress tracking:
 * - GET: Returns progress summary across all difficulty levels
 *
 * Requires authentication - returns 401 if user is not logged in.
 */

import type { APIContext } from "astro";
import { getUserProgressSummary } from "../../../lib/services/progress.service";
import { createErrorResponse, createJsonResponse, logError } from "../../../lib/utils/error-handler";

// Disable prerendering for this API route
export const prerender = false;

/**
 * GET handler for fetching user progress summary
 *
 * Returns:
 * - 200: Success with UserProgressSummaryDTO
 * - 401: User not authenticated
 * - 500: Internal server error
 */
export async function GET(context: APIContext): Promise<Response> {
  try {
    // Authenticate user using Supabase from context.locals
    const supabase = context.locals.supabase;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Return 401 if authentication fails or user is missing
    if (authError || !user) {
      return createJsonResponse(createErrorResponse("UNAUTHORIZED", "Authentication required to view progress"), 401);
    }

    // Get user's profile to determine selected level
    const profile = context.locals.profile;
    if (!profile) {
      return createJsonResponse(createErrorResponse("UNAUTHORIZED", "Profile not found"), 401);
    }

    // Call service to fetch progress summary
    const progressSummary = await getUserProgressSummary(supabase, user.id, profile.selected_level);

    // Return successful response
    return new Response(JSON.stringify(progressSummary), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error: unknown) {
    // Handle service-level errors (thrown as ApiErrorResponse)
    if (
      error &&
      typeof error === "object" &&
      "error" in error &&
      typeof error.error === "object" &&
      error.error !== null &&
      "code" in error.error
    ) {
      const apiError = error as { error: { code: string; message: string } };
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        INTERNAL_SERVER_ERROR: 500,
      };
      const status = statusMap[apiError.error.code] || 500;
      return createJsonResponse(error, status);
    }

    // Log unexpected errors
    logError("GET /api/progress/summary", error, { userId: context.locals.user?.id });

    // Return generic 500 error
    return createJsonResponse(createErrorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred"), 500);
  }
}
