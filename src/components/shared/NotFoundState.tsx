/**
 * NotFoundState - Standardized not-found UI for detail pages
 * Used when a specific resource (tutorial, article, etc.) cannot be found
 */

import { Button } from "../ui/button";

interface NotFoundStateProps {
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}

export function NotFoundState({
  title = "Content not found",
  description = "The content you're looking for doesn't exist or may have been removed.",
  backHref = "/learning",
  backLabel = "Back to Learning",
}: NotFoundStateProps) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center rounded-lg border border-border bg-card px-6 py-12 text-center"
    >
      <div className="mb-4 text-6xl" aria-hidden="true">
        🔍
      </div>
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <Button asChild variant="default" className="mt-6">
        <a href={backHref}>{backLabel}</a>
      </Button>
    </div>
  );
}
