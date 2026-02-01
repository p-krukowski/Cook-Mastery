/**
 * Progress Service
 *
 * Handles user progress tracking and aggregation across difficulty levels.
 */

import type { SupabaseClient } from "../../db/supabase.client";
import type { UserProgressSummaryDTO, LevelProgressDTO, DifficultyLevel } from "../../types";
import { createErrorResponse } from "../utils/error-handler";

/**
 * Fetches user progress summary across all difficulty levels
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - ID of the user
 * @param selectedLevel - User's currently selected difficulty level
 * @returns Progress summary with level-specific progress data
 * @throws ApiErrorResponse if fetch fails
 */
export async function getUserProgressSummary(
  supabase: SupabaseClient,
  userId: string,
  selectedLevel: DifficultyLevel
): Promise<UserProgressSummaryDTO> {
  // Query the user_level_progress view for all levels
  const { data, error } = await supabase.from("user_level_progress").select("*").eq("user_id", userId);

  // Handle database errors
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[progress.service] Failed to fetch progress:", error);
    throw createErrorResponse("INTERNAL_SERVER_ERROR", "Failed to fetch progress data");
  }

  // Transform raw data into LevelProgressDTO array
  const levelProgress: LevelProgressDTO[] = (data || []).map((row) => ({
    level: row.level as DifficultyLevel,
    total_count: row.total_count || 0,
    completed_count: row.completed_count || 0,
    completion_percent: row.completion_percent || 0,
    is_up_to_date: row.is_up_to_date || false,
  }));

  // Ensure all three levels are represented (fill in missing levels with zero progress)
  const allLevels: DifficultyLevel[] = ["BEGINNER", "INTERMEDIATE", "EXPERIENCED"];
  const completeLevelProgress: LevelProgressDTO[] = allLevels.map((level) => {
    const existing = levelProgress.find((lp) => lp.level === level);
    return (
      existing || {
        level,
        total_count: 0,
        completed_count: 0,
        completion_percent: 0,
        is_up_to_date: false,
      }
    );
  });

  // Find selected level's progress to determine advancement eligibility
  const selectedLevelProgress = completeLevelProgress.find((lp) => lp.level === selectedLevel);
  const completionPercent = selectedLevelProgress?.completion_percent || 0;

  // User can advance if:
  // 1. Completion >= 85% for selected level
  // 2. Selected level is not already EXPERIENCED
  const canAdvance = completionPercent >= 85 && selectedLevel !== "EXPERIENCED";

  return {
    user_id: userId,
    selected_level: selectedLevel,
    level_progress: completeLevelProgress,
    can_advance: canAdvance,
  };
}
