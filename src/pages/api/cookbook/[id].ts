/**
 * /api/cookbook/:id
 *
 * Handles individual cookbook entry operations:
 * - GET: Retrieves a single cookbook entry by ID
 * - PATCH: Updates an existing cookbook entry
 * - DELETE: Deletes a cookbook entry
 *
 * Requires authentication - returns 401 if user is not logged in.
 * Returns 404 if entry doesn't exist or doesn't belong to user.
 */

import type { APIContext } from 'astro';
import { z } from 'zod';
import {
  getCookbookEntry,
  updateCookbookEntry,
  deleteCookbookEntry,
} from '../../../lib/services/cookbook.service';
import {
  createErrorResponse,
  createJsonResponse,
  formatZodError,
  logError,
} from '../../../lib/utils/error-handler';
import type { UpdateCookbookEntryCommand } from '../../../types';

// Disable prerendering for this API route
export const prerender = false;

/**
 * Zod schema for validating UUID path parameter
 */
const UuidParamSchema = z.string().uuid('Invalid entry ID format');

/**
 * Zod schema for validating PATCH /api/cookbook/:id request body
 * All fields are optional, but at least one must be provided
 */
const UpdateCookbookEntryBodySchema = z
  .object({
    url: z.string().url('Must be a valid URL').optional(),
    title: z.string().min(1, 'Title cannot be empty').optional(),
    notes: z.string().optional(),
  })
  .refine((data) => data.url !== undefined || data.title !== undefined || data.notes !== undefined, {
    message: 'At least one field (url, title, or notes) must be provided',
  });

/**
 * GET handler for retrieving a single cookbook entry
 *
 * Path Parameters:
 * - id: UUID of the cookbook entry
 *
 * Returns:
 * - 200: Success with cookbook entry data
 * - 400: Invalid UUID format
 * - 401: User not authenticated
 * - 404: Entry not found or doesn't belong to user
 * - 500: Internal server error
 */
export async function GET(context: APIContext): Promise<Response> {
  try {
    // Authenticate user using Supabase from context.locals
    const supabase = context.locals.supabase;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Return 401 if authentication fails or user is missing
    if (authError || !user) {
      return createJsonResponse(
        createErrorResponse(
          'UNAUTHORIZED',
          'Authentication required to access cookbook entries'
        ),
        401
      );
    }

    // Validate path parameter (entry ID)
    const entryId = context.params.id;
    const validationResult = UuidParamSchema.safeParse(entryId);

    if (!validationResult.success) {
      return createJsonResponse(
        createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid entry ID format',
          { id: validationResult.error.errors[0].message }
        ),
        400
      );
    }

    const validatedId = validationResult.data;

    // Call service to fetch cookbook entry
    const entry = await getCookbookEntry(supabase, user.id, validatedId);

    // Return 404 if entry not found or doesn't belong to user
    if (!entry) {
      return createJsonResponse(
        createErrorResponse(
          'NOT_FOUND',
          'Cookbook entry not found'
        ),
        404
      );
    }

    // Return successful response
    return new Response(JSON.stringify(entry), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    // Log error with context
    logError('GET /api/cookbook/:id', error, {
      entryId: context.params.id,
    });

    // Return generic 500 error
    return createJsonResponse(
      createErrorResponse(
        'INTERNAL_SERVER_ERROR',
        'An unexpected error occurred while fetching cookbook entry'
      ),
      500
    );
  }
}

/**
 * PATCH handler for updating a cookbook entry
 *
 * Path Parameters:
 * - id: UUID of the cookbook entry
 *
 * Request Body (at least one field required):
 * - url: Valid URL string (optional)
 * - title: Non-empty string (optional)
 * - notes: String (optional)
 *
 * Returns:
 * - 200: Success with updated cookbook entry
 * - 400: Invalid UUID format or invalid request body
 * - 401: User not authenticated
 * - 404: Entry not found or doesn't belong to user
 * - 500: Internal server error
 */
export async function PATCH(context: APIContext): Promise<Response> {
  try {
    // Authenticate user using Supabase from context.locals
    const supabase = context.locals.supabase;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Return 401 if authentication fails or user is missing
    if (authError || !user) {
      return createJsonResponse(
        createErrorResponse(
          'UNAUTHORIZED',
          'Authentication required to update cookbook entries'
        ),
        401
      );
    }

    // Validate path parameter (entry ID)
    const entryId = context.params.id;
    const idValidationResult = UuidParamSchema.safeParse(entryId);

    if (!idValidationResult.success) {
      return createJsonResponse(
        createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid entry ID format',
          { id: idValidationResult.error.errors[0].message }
        ),
        400
      );
    }

    const validatedId = idValidationResult.data;

    // Parse request body
    let requestBody: unknown;
    try {
      requestBody = await context.request.json();
    } catch (parseError) {
      return createJsonResponse(
        createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid JSON in request body'
        ),
        400
      );
    }

    // Validate request body with Zod
    const bodyValidationResult = UpdateCookbookEntryBodySchema.safeParse(requestBody);

    if (!bodyValidationResult.success) {
      return createJsonResponse(formatZodError(bodyValidationResult.error), 400);
    }

    const validatedBody = bodyValidationResult.data;

    // Prepare command object
    const command: UpdateCookbookEntryCommand = {
      url: validatedBody.url,
      title: validatedBody.title,
      notes: validatedBody.notes,
    };

    // Call service to update cookbook entry
    const updatedEntry = await updateCookbookEntry(supabase, user.id, validatedId, command);

    // Return 404 if entry not found or doesn't belong to user
    if (!updatedEntry) {
      return createJsonResponse(
        createErrorResponse(
          'NOT_FOUND',
          'Cookbook entry not found'
        ),
        404
      );
    }

    // Return successful response
    return new Response(JSON.stringify(updatedEntry), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    // Log error with context
    logError('PATCH /api/cookbook/:id', error, {
      entryId: context.params.id,
    });

    // Return generic 500 error
    return createJsonResponse(
      createErrorResponse(
        'INTERNAL_SERVER_ERROR',
        'An unexpected error occurred while updating cookbook entry'
      ),
      500
    );
  }
}

/**
 * DELETE handler for deleting a cookbook entry
 *
 * Path Parameters:
 * - id: UUID of the cookbook entry
 *
 * Returns:
 * - 200: Success with deletion confirmation message
 * - 400: Invalid UUID format
 * - 401: User not authenticated
 * - 404: Entry not found or doesn't belong to user
 * - 500: Internal server error
 */
export async function DELETE(context: APIContext): Promise<Response> {
  try {
    // Authenticate user using Supabase from context.locals
    const supabase = context.locals.supabase;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Return 401 if authentication fails or user is missing
    if (authError || !user) {
      return createJsonResponse(
        createErrorResponse(
          'UNAUTHORIZED',
          'Authentication required to delete cookbook entries'
        ),
        401
      );
    }

    // Validate path parameter (entry ID)
    const entryId = context.params.id;
    const validationResult = UuidParamSchema.safeParse(entryId);

    if (!validationResult.success) {
      return createJsonResponse(
        createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid entry ID format',
          { id: validationResult.error.errors[0].message }
        ),
        400
      );
    }

    const validatedId = validationResult.data;

    // Call service to delete cookbook entry
    const wasDeleted = await deleteCookbookEntry(supabase, user.id, validatedId);

    // Return 404 if entry not found or doesn't belong to user
    if (!wasDeleted) {
      return createJsonResponse(
        createErrorResponse(
          'NOT_FOUND',
          'Cookbook entry not found'
        ),
        404
      );
    }

    // Return successful response with confirmation message
    return new Response(
      JSON.stringify({ message: 'Cookbook entry deleted successfully' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, no-cache',
        },
      }
    );
  } catch (error) {
    // Log error with context
    logError('DELETE /api/cookbook/:id', error, {
      entryId: context.params.id,
    });

    // Return generic 500 error
    return createJsonResponse(
      createErrorResponse(
        'INTERNAL_SERVER_ERROR',
        'An unexpected error occurred while deleting cookbook entry'
      ),
      500
    );
  }
}
