/**
 * ViewModel types for Tutorial Detail View
 * These types transform DTOs from the API into presentation-ready data
 */

import type { DifficultyLevel } from "../../types";
import type { ApiErrorResponse } from "../../types";

/**
 * Main view model for tutorial detail
 * Aggregates header, sections, and completion data
 */
export interface TutorialDetailVM {
  id: string;
  header: TutorialHeaderVM;
  sections: TutorialSectionsVM;
  completion?: TutorialCompletionVM; // Only present when authenticated
}

/**
 * Header view model - metadata displayed at the top
 * Labels are pre-formatted for display
 */
export interface TutorialHeaderVM {
  title: string;
  categoryLabel: string; // e.g. "Practical"
  levelLabel: string; // e.g. "Beginner"
  difficultyLabel: string; // e.g. "Difficulty 2/5"
  createdAtLabel: string; // Localized date string
}

/**
 * Content sections view model
 * Contains all tutorial content blocks in display order
 */
export interface TutorialSectionsVM {
  summary: string;
  content: string;
  steps: TutorialStepVM[];
  practiceRecommendations: string;
  keyTakeaways: string;
}

/**
 * Individual tutorial step view model
 * Steps are pre-sorted by order before rendering
 */
export interface TutorialStepVM {
  order: number;
  title: string;
  content: string;
}

/**
 * Completion status view model
 * Only populated for authenticated users
 */
export interface TutorialCompletionVM {
  isCompleted: boolean;
  completedAt: string | null;
}

/**
 * Error view model for tutorial detail fetch failures
 * Provides structured error information for error UI
 */
export interface TutorialDetailErrorVM {
  kind: "http" | "network";
  status?: number; // For http errors
  message: string; // User-facing error message
  api?: ApiErrorResponse; // Original API error response if available
}

/**
 * Completion CTA state view model
 * Tracks submission state and inline errors for the CTA component
 */
export interface CompletionCTAStateVM {
  isSubmitting: boolean;
  error: string | null; // User-facing error message for inline display
}

/**
 * Props for TutorialDetailView component
 */
export interface TutorialDetailViewProps {
  tutorialId: string;
  isAuthenticated: boolean;
  userSelectedLevel?: DifficultyLevel;
}

/**
 * Props for ContentHeader component
 */
export interface ContentHeaderProps {
  header: TutorialHeaderVM;
}

/**
 * Props for ContentSections component
 */
export interface ContentSectionsProps {
  sections: TutorialSectionsVM;
}

/**
 * Props for CompletionCallToAction component
 */
export interface CompletionCallToActionProps {
  tutorialId: string;
  isCompleted: boolean;
  completedAt: string | null;
  onCompleted: (completedAt: string) => void;
}

/**
 * Helper function to check if a string is a valid UUID
 * Used for client-side validation before API calls
 */
export function isUuid(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Format category enum for display
 * e.g. "PRACTICAL" -> "Practical"
 */
export function formatCategory(category: string): string {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

/**
 * Format difficulty level enum for display
 * e.g. "BEGINNER" -> "Beginner"
 */
export function formatLevel(level: string): string {
  return level.charAt(0) + level.slice(1).toLowerCase();
}

/**
 * Format difficulty weight as label
 * e.g. 2 -> "Difficulty 2/5"
 */
export function formatDifficultyLabel(weight: number): string {
  return `Difficulty ${weight}/5`;
}

/**
 * Format ISO date string to localized date
 * e.g. "2024-01-15T10:30:00Z" -> "Jan 15, 2024" (locale-dependent)
 */
export function formatCreatedAtLabel(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
