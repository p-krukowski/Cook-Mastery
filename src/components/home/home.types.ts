/**
 * View-specific types for the Home view
 * These types are used to manage state and presentation logic
 */

import type { DifficultyLevel, TutorialCategory, ApiErrorResponse } from "../../types";

/**
 * Home view mode - determines which data to fetch and how to display it
 */
export type HomeViewMode = "anonymous" | "authenticated";

/**
 * Type of content displayed on Home
 */
export type HomeContentType = "tutorial" | "article";

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
 * Combines tutorial and article data into a unified structure
 */
export interface HomeContentItemVM {
  type: HomeContentType;
  id: string;
  title: string;
  summary: string;
  level: DifficultyLevel;
  difficultyWeight: number; // maps from difficulty_weight
  createdAt: string; // ISO string
  href: string; // "/tutorials/:id" | "/articles/:id"

  // tutorial-only
  category?: TutorialCategory;

  // derived UI flags
  isNew: boolean;

  // completion (only when authenticated + include_completed=true)
  isCompleted?: boolean;
  completedAt?: string | null; // for articles (optional)
}

/**
 * Complete state for the Home view feeds
 */
export interface HomeFeedStateVM {
  mode: HomeViewMode;
  selectedLevel?: DifficultyLevel;

  tutorials: HomeContentItemVM[];
  articles: HomeContentItemVM[];

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
