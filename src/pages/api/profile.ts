/**
 * /api/profile
 *
 * Handles user profile operations:
 * - PATCH: Updates profile information (username or selected_level)
 *
 * Requires authentication - returns 401 if user is not logged in.
 */

import type { APIContext } from 'astro';
import { z } from 'zod';
import { updateProfile } from '../../lib/services/profile.service';
import {
  createErrorResponse,
  createJsonResponse,
  formatZodError,
  logError,
} from '../../lib/utils/error-handler';
import type { UpdateProfileCommand, ProfileDTO } from '../../types';

// Disable prerendering for this API route
export const prerender = false;

/**
 * Zod schema for validating PATCH /api/profile request body
 * At least one field must be present
 */
const UpdateProfileBodySchema = z
  .object({
    username: z.string().min(1, 'Username cannot be empty').optional(),
    selected_level: z.enum(['BEGINNER', 'INTERMEDIATE', 'EXPERIENCED']).optional(),
  })
  .refine(
    (data) => data.username !== undefined || data.selected_level !== undefined,
    {
      message: 'At least one field must be provided for update',
      path: ['general'],
    }
  );

/**
 * PATCH handler for updating user profile
 *
 * Request Body:
 * - username: New username (optional)
 * - selected_level: New difficulty level (optional)
 *
 * Returns:
 * - 200: Success with updated profile DTO
 * - 400: Invalid request body
 * - 401: User not authenticated
 * - 409: Conflict (e.g., username already taken)
 * - 500: Internal server error
 */
export async function PATCH(context: APIContext): Promise<Response> {
  try {
    // Authenticate user using Supabase from context.locals
    const supabase = context.locals.supabase;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Return 401 if authentication fails or user is missing
    if (authError || !user) {
      return createJsonResponse(
        createErrorResponse('UNAUTHORIZED', 'Authentication required to update profile'),
        401
      );
    }

    // Parse and validate request body
    let requestBody: unknown;
    try {
      requestBody = await context.request.json();
    } catch {
      return createJsonResponse(
        createErrorResponse('VALIDATION_ERROR', 'Invalid JSON in request body'),
        400
      );
    }

    const validationResult = UpdateProfileBodySchema.safeParse(requestBody);

    if (!validationResult.success) {
      return createJsonResponse(formatZodError(validationResult.error), 400);
    }

    const command: UpdateProfileCommand = validationResult.data;

    // Call service to update profile
    const updatedProfile: ProfileDTO = await updateProfile(supabase, user.id, command);

    // Return successful response
    return new Response(JSON.stringify(updatedProfile), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error: unknown) {
    // Handle service-level errors (thrown as ApiErrorResponse)
    if (
      error &&
      typeof error === 'object' &&
      'error' in error &&
      typeof error.error === 'object' &&
      error.error !== null &&
      'code' in error.error
    ) {
      const apiError = error as { error: { code: string; message: string } };
      const statusMap: Record<string, number> = {
        VALIDATION_ERROR: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        INTERNAL_SERVER_ERROR: 500,
      };
      const status = statusMap[apiError.error.code] || 500;
      return createJsonResponse(error, status);
    }

    // Log unexpected errors
    logError('PATCH /api/profile', error, { userId: context.locals.user?.id });

    // Return generic 500 error
    return createJsonResponse(
      createErrorResponse('INTERNAL_SERVER_ERROR', 'An unexpected error occurred'),
      500
    );
  }
}
