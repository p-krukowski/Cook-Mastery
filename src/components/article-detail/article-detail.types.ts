/**
 * Type definitions for Article Detail View
 * Includes ViewModels, component props, and utility functions
 */

import type { DifficultyLevel, ApiErrorResponse } from "../../types";

// ============================================================================
// View Models
// ============================================================================

/**
 * Article detail view model - top-level VM for the detail view
 */
export interface ArticleDetailVM {
  id: string;
  header: ArticleHeaderVM;
  sections: ArticleSectionsVM;
  completion?: ArticleCompletionVM; // Only present when authenticated
}

/**
 * Article header view model - contains formatted metadata for display
 */
export interface ArticleHeaderVM {
  title: string;
  levelLabel: string; // e.g., "Beginner"
  difficultyLabel: string; // e.g., "Difficulty 3/5"
  createdAtLabel: string; // Localized date
}

/**
 * Article sections view model - contains article content sections
 */
export interface ArticleSectionsVM {
  summary: string;
  content: string;
  keyTakeaways: string;
}

/**
 * Article completion view model - tracks user completion status
 */
export interface ArticleCompletionVM {
  isCompleted: boolean;
  completedAt: string | null;
}

/**
 * Article detail error view model - describes fetch errors
 */
export interface ArticleDetailErrorVM {
  kind: "http" | "network";
  status?: number;
  message: string;
  api?: ApiErrorResponse;
}

/**
 * Completion CTA state view model - tracks CTA component state
 */
export interface CompletionCTAStateVM {
  isSubmitting: boolean;
  error: string | null;
}

// ============================================================================
// Component Props
// ============================================================================

/**
 * Props for ArticleDetailView component
 */
export interface ArticleDetailViewProps {
  articleId: string;
  isAuthenticated: boolean;
  userSelectedLevel?: DifficultyLevel;
}

/**
 * Props for ContentHeader component
 */
export interface ContentHeaderProps {
  header: ArticleHeaderVM;
  headingId?: string;
}

/**
 * Props for ContentSections component
 */
export interface ContentSectionsProps {
  sections: ArticleSectionsVM;
}

/**
 * Props for CompletionCallToAction component
 */
export interface CompletionCallToActionProps {
  articleId: string;
  isCompleted: boolean;
  completedAt: string | null;
  onCompleted: (completedAt: string) => void;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * UUID validation regex
 * Matches standard UUID v4 format
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a valid UUID
 */
export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Formats difficulty level enum to display label
 */
export function formatLevel(level: string): string {
  const levelMap: Record<string, string> = {
    BEGINNER: "Beginner",
    INTERMEDIATE: "Intermediate",
    EXPERIENCED: "Experienced",
  };
  return levelMap[level] || level;
}

/**
 * Formats difficulty weight to display label
 */
export function formatDifficultyLabel(weight: number): string {
  return `Difficulty ${weight}/5`;
}

/**
 * Formats ISO date string to localized date label
 */
export function formatCreatedAtLabel(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return isoDate;
  }
}
