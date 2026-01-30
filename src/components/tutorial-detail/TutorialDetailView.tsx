/**
 * TutorialDetailView - Top-level client component for tutorial detail page
 * Handles data fetching, loading/error/success states, and orchestrates child components
 */

import { useId, useCallback, useState } from "react";
import { useTutorialDetail } from "./useTutorialDetail";
import { TutorialDetailSkeleton } from "./TutorialDetailSkeleton";
import { NotFoundState } from "../shared/NotFoundState";
import { FullPageError } from "../shared/FullPageError";
import { ContentHeader } from "./ContentHeader";
import { ContentSections } from "./ContentSections";
import { CompletionCallToAction } from "./CompletionCallToAction";
import type { TutorialDetailViewProps } from "./tutorial-detail.types";

export function TutorialDetailView({
  tutorialId,
  isAuthenticated,
  userSelectedLevel,
}: TutorialDetailViewProps) {
  const headingId = useId();
  
  // Fetch tutorial detail
  const { data, isLoading, error, isNotFound, retry } = useTutorialDetail({
    tutorialId,
    isAuthenticated,
  });

  // Local completion state for optimistic updates
  const [localCompletion, setLocalCompletion] = useState<{
    isCompleted: boolean;
    completedAt: string | null;
  } | null>(null);

  /**
   * Handle completion callback from CTA
   * Updates local state immediately for optimistic UI
   */
  const handleCompleted = useCallback((completedAt: string) => {
    setLocalCompletion({
      isCompleted: true,
      completedAt,
    });
  }, []);

  // Determine current completion state (local override takes precedence)
  const currentCompletion = localCompletion ?? data?.completion;

  // Loading state
  if (isLoading) {
    return (
      <section aria-labelledby={headingId} aria-busy="true">
        <TutorialDetailSkeleton />
      </section>
    );
  }

  // Not found state (404 or invalid UUID)
  if (isNotFound) {
    return (
      <section aria-labelledby={headingId}>
        <NotFoundState
          title="Tutorial not found"
          description="The tutorial you're looking for doesn't exist or may have been removed."
          backHref="/learning"
          backLabel="Back to Learning"
        />
      </section>
    );
  }

  // Error state (500, network, etc.)
  if (error) {
    const errorMessage =
      error.kind === "network"
        ? "Couldn't load tutorial. Check your connection."
        : error.message || "Something went wrong while loading the tutorial.";

    return (
      <section aria-labelledby={headingId}>
        <FullPageError message={errorMessage} onRetry={retry} />
      </section>
    );
  }

  // Guard: data should exist at this point
  if (!data) {
    return (
      <section aria-labelledby={headingId}>
        <FullPageError
          message="Tutorial data is missing."
          onRetry={retry}
        />
      </section>
    );
  }

  // Success state - render tutorial article
  return (
    <section aria-labelledby={headingId}>
      <article className="space-y-8">
        {/* Header: Badge, Title, Metadata */}
        <ContentHeader header={data.header} headingId={headingId} />

        {/* Content Sections */}
        <ContentSections sections={data.sections} />

        {/* Completion CTA (authenticated users only) */}
        {isAuthenticated && currentCompletion && (
          <CompletionCallToAction
            tutorialId={tutorialId}
            isCompleted={currentCompletion.isCompleted}
            completedAt={currentCompletion.completedAt}
            onCompleted={handleCompleted}
          />
        )}
      </article>
    </section>
  );
}
