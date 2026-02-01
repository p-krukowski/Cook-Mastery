/**
 * GET /api/tutorials
 *
 * Lists tutorials with optional filtering, sorting, and pagination.
 * Public endpoint accessible to both authenticated and anonymous users.
 * Authenticated users can optionally include their completion status.
 */

import type { APIContext } from "astro";
import { z } from "zod";
import { listTutorials } from "../../../lib/services/tutorial.service";
import { createErrorResponse, createJsonResponse, formatZodError, logError } from "../../../lib/utils/error-handler";

// Disable prerendering for this API route
export const prerender = false;

/**
 * Zod schema for validating query parameters
 * Includes type coercion for numbers and booleans from URL query strings
 */
const ListTutorialsQuerySchema = z.object({
  level: z.enum(["BEGINNER", "INTERMEDIATE", "EXPERIENCED"]).optional(),
  category: z.enum(["PRACTICAL", "THEORETICAL", "EQUIPMENT"]).optional(),
  sort: z.enum(["difficulty_asc", "newest"]).optional().default("difficulty_asc"),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  include_completed: z.coerce.boolean().optional().default(true),
});

/**
 * GET handler for listing tutorials
 *
 * Query Parameters:
 * - level: Filter by difficulty level (BEGINNER, INTERMEDIATE, EXPERIENCED)
 * - category: Filter by category (PRACTICAL, THEORETICAL, EQUIPMENT)
 * - sort: Sort order (difficulty_asc, newest)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - include_completed: Include completion status for authenticated users (default: true)
 *
 * Returns:
 * - 200: Success with tutorials list and pagination metadata
 * - 400: Invalid query parameters
 * - 500: Internal server error
 */
export async function GET(context: APIContext): Promise<Response> {
  try {
    // Extract query parameters from URL
    const url = new URL(context.request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    // Validate query parameters using Zod schema
    const validationResult = ListTutorialsQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return createJsonResponse(formatZodError(validationResult.error), 400);
    }

    const validatedParams = validationResult.data;

    // Check if user is authenticated (optional for this endpoint)
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
      logError("GET /api/tutorials - Auth check", authError);
    }

    // Call service to fetch tutorials
    const response = await listTutorials(supabase, validatedParams, userId);

    // Set cache headers for anonymous requests
    const cacheHeaders: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Cache anonymous requests for 10 minutes
    if (!userId) {
      cacheHeaders["Cache-Control"] = "public, max-age=600";
    } else {
      // Don't cache authenticated requests (user-specific data)
      cacheHeaders["Cache-Control"] = "private, no-cache";
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: cacheHeaders,
    });
  } catch (error) {
    // Log the error with context
    logError("GET /api/tutorials", error, {
      url: context.request.url,
    });

    // Return generic error response
    return createJsonResponse(
      createErrorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred while fetching tutorials"),
      500
    );
  }
}
