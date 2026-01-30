/**
 * Profile Service
 * 
 * Handles user profile operations including fetching and updating profile information.
 */

import type { SupabaseClient } from '../../db/supabase.client';
import type { ProfileDTO, UpdateProfileCommand } from '../../types';
import { createErrorResponse } from '../utils/error-handler';

/**
 * Updates user profile information
 * 
 * @param supabase - Authenticated Supabase client
 * @param userId - ID of the user to update
 * @param command - Update command with fields to change
 * @returns Updated profile DTO
 * @throws ApiErrorResponse if update fails
 */
export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  command: UpdateProfileCommand
): Promise<ProfileDTO> {
  // Handle edge case: reject empty update command
  if (!command.username && !command.selected_level) {
    throw createErrorResponse(
      'VALIDATION_ERROR',
      'At least one field must be provided for update',
      { general: 'No fields to update' }
    );
  }

  // Build update object
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (command.username !== undefined) {
    updateData.username = command.username;
  }

  if (command.selected_level !== undefined) {
    updateData.selected_level = command.selected_level;
  }

  // Perform update
  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId)
    .select('id, username, selected_level, created_at, updated_at')
    .single();

  // Handle database errors
  if (error) {
    // Check for unique constraint violation on username
    if (error.code === '23505') {
      throw createErrorResponse(
        'CONFLICT',
        'Username already taken',
        { username: 'This username is already in use' }
      );
    }

    console.error('[profile.service] Update failed:', error);
    throw createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to update profile'
    );
  }

  // Validate that record was updated
  if (!data) {
    throw createErrorResponse(
      'NOT_FOUND',
      'Profile not found'
    );
  }

  return data;
}
