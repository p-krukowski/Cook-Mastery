/**
 * POST /api/tutorials/:id/complete
 *
 * Records tutorial completion for the authenticated user.
 * This endpoint is idempotent - calling it multiple times for the same tutorial
 * will not create duplicate completion records.
 *
 * Authentication: Required
 */

import type { APIContext } from "astro";
import { z } from "zod";
import { completeTutorial } from "../../../../lib/services/tutorial.service";
import { createErrorResponse, createJsonResponse, formatZodError, logError } from "../../../../lib/utils/error-handler";

// Disable prerendering for this API route
export const prerender = false;

/**
 * Zod schema for validating path parameters
 */
const TutorialIdParamSchema = z.object({
  id: z.string().uuid({ message: "Invalid tutorial ID format" }),
});

/**
 * POST handler for recording tutorial completion
 *
 * Path Parameters:
 * - id: UUID of the tutorial to mark as completed
 *
 * Returns:
 * - 200: Already completed (idempotent response)
 * - 201: Successfully marked as completed (new record created)
 * - 400: Invalid UUID format
 * - 401: User not authenticated
 * - 404: Tutorial not found
 * - 500: Internal server error
 */
export async function POST(context: APIContext): Promise<Response> {
  try {
    // Step 1: Validate path parameter
    const validationResult = TutorialIdParamSchema.safeParse(context.params);

    if (!validationResult.success) {
      return createJsonResponse(formatZodError(validationResult.error), 400);
    }

    const { id: tutorialId } = validationResult.data;

    // Step 2: Check authentication
    const supabase = context.locals.supabase;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createJsonResponse(
        createErrorResponse("UNAUTHORIZED", "You must be logged in to complete tutorials"),
        401
      );
    }

    const userId = user.id;

    // Step 3: Call service to record completion
    try {
      const completionData = await completeTutorial(supabase, tutorialId, userId);

      // Return appropriate status code based on whether record was created or already existed
      const statusCode = completionData.status === "created" ? 201 : 200;

      return new Response(JSON.stringify(completionData), {
        status: statusCode,
        headers: {
          "Content-Type": "application/json",
          // Don't cache user-specific completion data
          "Cache-Control": "private, no-cache",
        },
      });
    } catch (serviceError) {
      // Handle service-level errors
      if (serviceError instanceof Error && serviceError.message === "Tutorial not found") {
        return createJsonResponse(createErrorResponse("NOT_FOUND", "Tutorial not found"), 404);
      }

      // Re-throw unexpected errors to be caught by outer handler
      throw serviceError;
    }
  } catch (error) {
    // Step 4: Handle unexpected errors
    logError("POST /api/tutorials/:id/complete", error, {
      tutorialId: context.params.id,
      url: context.request.url,
    });

    return createJsonResponse(
      createErrorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred while recording tutorial completion"),
      500
    );
  }
}
