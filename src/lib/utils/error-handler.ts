/**
 * Error Handling Utilities
 * 
 * Provides standardized error response formatting and HTTP status code handling
 * for API endpoints across the application.
 */

import type { ApiErrorResponse } from '../../types';
import { ZodError } from 'zod';

/**
 * Creates a standardized API error response
 * 
 * @param code - Error code identifier
 * @param message - Human-readable error message
 * @param details - Optional additional error details
 * @returns ApiErrorResponse object
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, string>
): ApiErrorResponse {
  return {
    error: {
      code,
      message,
      details,
    },
  };
}

/**
 * Formats Zod validation errors into API error response format
 * 
 * @param error - ZodError from validation failure
 * @returns ApiErrorResponse with validation error details
 */
export function formatZodError(error: ZodError): ApiErrorResponse {
  const details: Record<string, string> = {};

  error.errors.forEach((err) => {
    // Use 'general' as key if path is empty (for refine/superRefine errors)
    const path = err.path.length > 0 ? err.path.join('.') : 'general';
    details[path] = err.message;
  });

  return createErrorResponse(
    'VALIDATION_ERROR',
    'Validation failed',
    details
  );
}

/**
 * Creates a JSON response with appropriate status code
 * 
 * @param data - Response data to serialize
 * @param status - HTTP status code
 * @returns Response object
 */
export function createJsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Logs error with context information
 * 
 * @param context - Context string (e.g., 'GET /api/tutorials')
 * @param error - Error object
 * @param additionalInfo - Optional additional context
 */
export function logError(
  context: string,
  error: unknown,
  additionalInfo?: Record<string, unknown>
): void {
  console.error(`[${context}]`, {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...additionalInfo,
  });
}
