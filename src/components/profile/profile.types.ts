/**
 * Type definitions for Profile view components
 * View-scoped ViewModels for rendering logic
 */

import type { DifficultyLevel } from '../../types';

/**
 * View model for level settings card
 */
export interface ProfileLevelSettingsVM {
  savedLevel: DifficultyLevel;
  draftLevel: DifficultyLevel;
  isDirty: boolean;
  helperText: string;
}

/**
 * View model for save state
 */
export interface ProfileSaveStateVM {
  isSaving: boolean;
  error: string | null;
}

/**
 * View model for progress panel display
 */
export interface ProfileProgressVM {
  selectedLevel: DifficultyLevel;
  completionPercent: number; // 0-100
  isUpToDate: boolean; // >= 85%
  isEligibleToAdvance: boolean; // >= 85% AND not EXPERIENCED
  totalCount: number;
  completedCount: number;
  emptyState: boolean; // totalCount === 0
}

/**
 * View model for logout state
 */
export interface ProfileLogoutStateVM {
  isLoggingOut: boolean;
  error: string | null;
}
