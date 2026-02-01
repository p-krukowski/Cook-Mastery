/**
 * ContentCard - Unified card component for tutorials and articles
 * Displays content with type badge, title, summary, metadata, and optional completion status
 */

import type { ContentCardItemVM } from "./content.types";
import { NewBadge } from "./NewBadge";

interface ContentCardProps {
  item: ContentCardItemVM;
}

/**
 * Format difficulty level for display
 */
function formatLevel(level: string): string {
  return level.charAt(0) + level.slice(1).toLowerCase();
}

/**
 * Format tutorial category for display
 */
function formatCategory(category: string): string {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

export function ContentCard({ item }: ContentCardProps) {
  const typeBadge = item.type === "tutorial" ? "Tutorial" : "Article";
  const typeColor =
    item.type === "tutorial"
      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";

  return (
    <li>
      <a
        href={item.href}
        className="group block rounded-lg border bg-card p-4 transition-colors hover:border-primary hover:bg-accent/50"
      >
        {/* Header: Type badge and New badge */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColor}`}>
            {typeBadge}
          </span>
          {item.isNew && <NewBadge />}
        </div>

        {/* Title */}
        <h3 className="mb-2 text-lg font-semibold text-foreground group-hover:text-primary">{item.title}</h3>

        {/* Summary */}
        <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{item.summary}</p>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">{formatLevel(item.level)}</span>
          <span aria-hidden="true">•</span>
          <span>Difficulty {item.difficultyWeight}/5</span>
          {item.category && (
            <>
              <span aria-hidden="true">•</span>
              <span>{formatCategory(item.category)}</span>
            </>
          )}
        </div>

        {/* Completion indicator (only for authenticated users) */}
        {item.isCompleted !== undefined && item.isCompleted && (
          <div className="mt-3 flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Completed</span>
          </div>
        )}
      </a>
    </li>
  );
}
