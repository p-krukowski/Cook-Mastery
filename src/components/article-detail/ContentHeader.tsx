/**
 * ContentHeader - Article header with type badge, title, and metadata
 * Displays article identity and key metadata in a structured format
 */

import type { ContentHeaderProps } from "./article-detail.types";

export function ContentHeader({ header, headingId }: ContentHeaderProps) {
  return (
    <header className="space-y-4">
      {/* Type badge */}
      <div>
        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
          Article
        </span>
      </div>

      {/* Title */}
      <h1 id={headingId} className="text-3xl font-bold text-foreground sm:text-4xl">
        {header.title}
      </h1>

      {/* Metadata row */}
      <dl className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        {/* Level */}
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Level</dt>
          <dd className="font-medium">{header.levelLabel}</dd>
        </div>

        <span aria-hidden="true">•</span>

        {/* Difficulty */}
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Difficulty</dt>
          <dd>{header.difficultyLabel}</dd>
        </div>

        <span aria-hidden="true">•</span>

        {/* Created date */}
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Published</dt>
          <dd>
            <time dateTime={header.createdAtLabel}>{header.createdAtLabel}</time>
          </dd>
        </div>
      </dl>
    </header>
  );
}
