/**
 * GET /api/tutorials/:id
 *
 * Retrieves comprehensive information about a specific tutorial.
 * Public endpoint accessible to both authenticated and anonymous users.
 * Authenticated users receive their completion status and completion timestamp.
 */

import type { APIContext } from "astro";
import { z } from "zod";
import { getTutorialDetail } from "../../../lib/services/tutorial.service";
import { createErrorResponse, createJsonResponse, formatZodError, logError } from "../../../lib/utils/error-handler";

// Disable prerendering for this API route
export const prerender = false;

/**
 * Zod schema for validating path parameters
 * Ensures the tutorial ID is a valid UUID format
 */
const TutorialIdParamSchema = z.object({
  id: z.string().uuid({ message: "Invalid tutorial ID format" }),
});

/**
 * GET handler for retrieving a specific tutorial
 *
 * Path Parameters:
 * - id: UUID of the tutorial to retrieve
 *
 * Returns:
 * - 200: Success with full tutorial details
 * - 400: Invalid UUID format
 * - 404: Tutorial not found
 * - 500: Internal server error
 */
export async function GET(context: APIContext): Promise<Response> {
  try {
    // Step 1: Extract and validate path parameter
    const validationResult = TutorialIdParamSchema.safeParse(context.params);

    if (!validationResult.success) {
      return createJsonResponse(formatZodError(validationResult.error), 400);
    }

    const { id: tutorialId } = validationResult.data;

    // Step 2: Check if user is authenticated (optional for this endpoint)
    const supabase = context.locals.supabase;
    let userId: string | undefined;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id;
    } catch (authError) {
      // Authentication check failed, continue as anonymous user
      // This is acceptable for this public endpoint
      logError("GET /api/tutorials/:id - Auth check", authError);
    }

    // Step 3: Call service to fetch tutorial detail
    const tutorial = await getTutorialDetail(supabase, tutorialId, userId);

    // Step 4: Handle not found
    if (!tutorial) {
      return createJsonResponse(createErrorResponse("NOT_FOUND", "Tutorial not found"), 404);
    }

    // Step 5: Return success response with appropriate cache headers
    const cacheHeaders: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Cache public content for 5 minutes, don't cache user-specific data
    if (!userId) {
      cacheHeaders["Cache-Control"] = "public, max-age=300, stale-while-revalidate=600";
    } else {
      // User-specific data (includes completion status)
      cacheHeaders["Cache-Control"] = "private, no-cache";
    }

    return new Response(JSON.stringify(tutorial), {
      status: 200,
      headers: cacheHeaders,
    });
  } catch (error) {
    // Step 6: Handle unexpected errors
    logError("GET /api/tutorials/:id", error, {
      tutorialId: context.params.id,
      url: context.request.url,
    });

    // Return generic error response
    return createJsonResponse(
      createErrorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred while retrieving the tutorial"),
      500
    );
  }
}
