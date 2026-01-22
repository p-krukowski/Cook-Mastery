/**
 * /api/cookbook
 *
 * Handles cookbook entry operations:
 * - GET: Lists cookbook entries saved by the authenticated user
 * - POST: Creates a new cookbook entry
 *
 * Requires authentication - returns 401 if user is not logged in.
 */

import type { APIContext } from 'astro';
import { z } from 'zod';
import { listCookbookEntries, createCookbookEntry } from '../../../lib/services/cookbook.service';
import {
  createErrorResponse,
  createJsonResponse,
  formatZodError,
  logError,
} from '../../../lib/utils/error-handler';
import type { CreateCookbookEntryCommand } from '../../../types';

// Disable prerendering for this API route
export const prerender = false;

/**
 * Zod schema for validating query parameters for GET /api/cookbook
 * Includes type coercion for numbers from URL query strings and default values
 */
const ListCookbookEntriesQuerySchema = z.object({
  sort: z.enum(['newest', 'oldest', 'title_asc']).optional().default('newest'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * Zod schema for validating POST /api/cookbook request body
 * Validates required url and title fields, with optional notes
 */
const CreateCookbookEntryBodySchema = z.object({
  url: z.string().url('Must be a valid URL'),
  title: z.string().min(1, 'Title is required and cannot be empty'),
  notes: z.string().optional(),
});

/**
 * GET handler for listing cookbook entries
 *
 * Query Parameters:
 * - sort: Sort order (newest, oldest, title_asc) - default: newest
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 *
 * Returns:
 * - 200: Success with cookbook entries list and pagination metadata
 * - 400: Invalid query parameters
 * - 401: User not authenticated
 * - 500: Internal server error
 */
export async function GET(context: APIContext): Promise<Response> {
  try {
    // Parse query parameters from URL
    const url = new URL(context.request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    // Validate query parameters with Zod
    const validationResult = ListCookbookEntriesQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return createJsonResponse(formatZodError(validationResult.error), 400);
    }

    const validatedParams = validationResult.data;

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

    // Call service to fetch cookbook entries
    const response = await listCookbookEntries(supabase, validatedParams, user.id);

    // Return successful response with cache control headers for user-specific data
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    // Log error with context
    logError('GET /api/cookbook', error, {
      url: context.request.url,
    });

    // Return generic 500 error (don't leak internal details)
    return createJsonResponse(
      createErrorResponse(
        'INTERNAL_SERVER_ERROR',
        'An unexpected error occurred while fetching cookbook entries'
      ),
      500
    );
  }
}

/**
 * POST handler for creating a new cookbook entry
 *
 * Request Body:
 * - url: Valid URL string (required)
 * - title: Non-empty string (required)
 * - notes: String (optional)
 *
 * Returns:
 * - 201: Success with created cookbook entry
 * - 400: Invalid request body
 * - 401: User not authenticated
 * - 500: Internal server error
 */
export async function POST(context: APIContext): Promise<Response> {
  try {
    // Authenticate user using Supabase from context.locals
    const supabase = context.locals.supabase;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Return 401 if authentication fails or user is missing
    if (authError || !user) {
      return createJsonResponse(
        createErrorResponse(
          'UNAUTHORIZED',
          'Authentication required to create cookbook entries'
        ),
        401
      );
    }

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
    const validationResult = CreateCookbookEntryBodySchema.safeParse(requestBody);

    if (!validationResult.success) {
      return createJsonResponse(formatZodError(validationResult.error), 400);
    }

    const validatedBody = validationResult.data;

    // Prepare command object
    const command: CreateCookbookEntryCommand = {
      url: validatedBody.url,
      title: validatedBody.title,
      notes: validatedBody.notes,
    };

    // Call service to create cookbook entry
    const createdEntry = await createCookbookEntry(supabase, user.id, command);

    // Return successful response with 201 Created status
    return new Response(JSON.stringify(createdEntry), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    // Log error with context
    logError('POST /api/cookbook', error, {
      url: context.request.url,
    });

    // Return generic 500 error (don't leak internal details)
    return createJsonResponse(
      createErrorResponse(
        'INTERNAL_SERVER_ERROR',
        'An unexpected error occurred while creating cookbook entry'
      ),
      500
    );
  }
}
