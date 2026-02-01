/**
 * ArticleDetailView - Top-level client component for article detail page
 * Handles data fetching, loading/error/success states, and orchestrates child components
 */

import { useId, useCallback, useState } from "react";
import { useArticleDetail } from "./useArticleDetail";
import { ArticleDetailSkeleton } from "./ArticleDetailSkeleton";
import { NotFoundState } from "../shared/NotFoundState";
import { FullPageError } from "../shared/FullPageError";
import { ContentHeader } from "./ContentHeader";
import { ContentSections } from "./ContentSections";
import { CompletionCallToAction } from "./CompletionCallToAction";
import type { ArticleDetailViewProps } from "./article-detail.types";

export function ArticleDetailView({ articleId, isAuthenticated }: ArticleDetailViewProps) {
  const headingId = useId();

  // Fetch article detail
  const { data, isLoading, error, isNotFound, retry } = useArticleDetail({
    articleId,
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
        <ArticleDetailSkeleton />
      </section>
    );
  }

  // Not found state (404 or invalid UUID)
  if (isNotFound) {
    return (
      <section aria-labelledby={headingId}>
        <NotFoundState
          title="Article not found"
          description="The article you're looking for doesn't exist or may have been removed."
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
        ? "Couldn't load article. Check your connection."
        : error.message || "Something went wrong while loading the article.";

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
        <FullPageError message="Article data is missing." onRetry={retry} />
      </section>
    );
  }

  // Success state - render article
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
            articleId={articleId}
            isCompleted={currentCompletion.isCompleted}
            completedAt={currentCompletion.completedAt}
            onCompleted={handleCompleted}
          />
        )}
      </article>
    </section>
  );
}
