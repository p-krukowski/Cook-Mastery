/**
 * Shared content types for ContentCard component
 * Decouples card rendering from view-specific types (Home, Learning, etc.)
 */

import type { DifficultyLevel, TutorialCategory } from "../../types";

/**
 * Content type discriminator for cards
 */
export type ContentCardItemType = "tutorial" | "article";

/**
 * Shared view model for content cards
 * Used by Home, Learning, and other views that display content items
 */
export interface ContentCardItemVM {
  type: ContentCardItemType;
  id: string;
  title: string;
  summary: string;
  level: DifficultyLevel;
  difficultyWeight: number;
  createdAt: string;
  href: string;

  category?: TutorialCategory; // tutorial-only
  isNew: boolean;

  // completion (optional; only include when authenticated + include_completed=true)
  isCompleted?: boolean;
  completedAt?: string | null;
}
