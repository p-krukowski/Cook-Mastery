/**
 * PaginationControls - Shared pagination component
 * Displays Prev/Next buttons and "Page X of Y" indicator
 * Handles disabled states when at bounds or while loading
 */

import { Button } from "../ui/button";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  isLoading?: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function PaginationControls({
  currentPage,
  totalPages,
  isLoading = false,
  onPrev,
  onNext,
}: PaginationControlsProps) {
  // Don't render if there's only one page or no pages
  if (totalPages <= 1) {
    return null;
  }

  const isPrevDisabled = isLoading || currentPage <= 1;
  const isNextDisabled = isLoading || currentPage >= totalPages;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-4">
      {/* Previous button */}
      <Button variant="outline" onClick={onPrev} disabled={isPrevDisabled} aria-label="Go to previous page">
        Previous
      </Button>

      {/* Page indicator */}
      <span className="text-sm text-muted-foreground" aria-live="polite" aria-atomic="true">
        Page {currentPage} of {totalPages}
      </span>

      {/* Next button */}
      <Button variant="outline" onClick={onNext} disabled={isNextDisabled} aria-label="Go to next page">
        Next
      </Button>
    </nav>
  );
}
