/**
 * Type definitions for the Learning view
 * Learning allows users to browse all tutorials and articles with filtering and pagination
 */

import type { DifficultyLevel } from "../../types";
import type { ContentCardItemVM } from "../content/content.types";

/**
 * Type filter for Learning view
 * "all" = both tutorials and articles (aggregated)
 * "tutorials" = only tutorials
 * "articles" = only articles
 */
export type LearningTypeFilter = "all" | "tutorials" | "articles";

/**
 * Level filter for Learning view
 * "ALL" is a UI-only sentinel that means no level filter (do not send to API)
 * Otherwise, must be a valid DifficultyLevel
 */
export type LearningLevelFilter = DifficultyLevel | "ALL";

/**
 * Error view model for Learning feed
 * Categorizes errors for appropriate user messaging
 */
export interface LearningFeedErrorVM {
  kind: "network" | "http" | "unknown";
  status?: number;
  message: string;
  api?: {
    error: {
      code: string;
      message: string;
      details?: Record<string, string>;
    };
  };
}

/**
 * Pagination view model for Learning
 * Supports deterministic pagination with combined totals for aggregated mode
 */
export interface LearningPaginationVM {
  page: number; // current page (>=1)
  totalPages: number; // computed (>=1 for display; may be 0 internally when totalItems=0)
  totalItems: number;
  pageSize: number; // 10 for aggregated; 10 for single-type (kept explicit)
}

/**
 * Complete state view model for Learning feed
 * Encapsulates all state needed to render the Learning view
 */
export interface LearningFeedStateVM {
  isAuthenticated: boolean;
  userSelectedLevel?: DifficultyLevel;

  type: LearningTypeFilter;
  level: LearningLevelFilter;

  items: ContentCardItemVM[];
  pagination: LearningPaginationVM;

  isLoading: boolean;
  error: LearningFeedErrorVM | null;
}
