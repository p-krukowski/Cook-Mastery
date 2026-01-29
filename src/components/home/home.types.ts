/**
 * View-specific types for the Home view
 * These types are used to manage state and presentation logic
 */

import type { DifficultyLevel, ApiErrorResponse } from "../../types";
import type { ContentCardItemVM } from "../content/content.types";

/**
 * Home view mode - determines which data to fetch and how to display it
 */
export type HomeViewMode = "anonymous" | "authenticated";

/**
 * Error information for feed loading failures
 */
export interface HomeFeedErrorVM {
  kind: "network" | "http" | "unknown";
  status?: number; // present for HTTP errors
  message: string; // user-friendly message
  api?: ApiErrorResponse; // present if server returned structured error
}

/**
 * Normalized content item for ContentCard
 * Alias for shared ContentCardItemVM to maintain backward compatibility
 * @deprecated Use ContentCardItemVM from content.types.ts instead
 */
export type HomeContentItemVM = ContentCardItemVM;

/**
 * Complete state for the Home view feeds
 */
export interface HomeFeedStateVM {
  mode: HomeViewMode;
  selectedLevel?: DifficultyLevel;

  tutorials: ContentCardItemVM[];
  articles: ContentCardItemVM[];

  isLoadingTutorials: boolean;
  isLoadingArticles: boolean;
  tutorialsError: HomeFeedErrorVM | null;
  articlesError: HomeFeedErrorVM | null;
}

/**
 * Optional session model for future authentication support
 */
export interface SessionVM {
  userId: string;
  username?: string;
  selectedLevel?: DifficultyLevel;
}
