/**
 * HomeView - Main container for the Home page
 * Fetches and displays tutorials and articles feeds
 */

import type { DifficultyLevel } from "../../types";
import type { HomeViewMode } from "./home.types";
import { useHomeFeeds } from "../hooks/useHomeFeeds";
import { HomeSection } from "./HomeSection";

interface HomeViewProps {
  initialMode?: HomeViewMode;
  selectedLevel?: DifficultyLevel;
}

export default function HomeView({ initialMode, selectedLevel }: HomeViewProps) {
  const {
    mode,
    tutorials,
    articles,
    isLoadingTutorials,
    isLoadingArticles,
    tutorialsError,
    articlesError,
    refetchTutorials,
    refetchArticles,
  } = useHomeFeeds({ initialMode, selectedLevel });

  // Determine section titles and descriptions based on mode
  const tutorialsSectionTitle =
    mode === "authenticated" ? "Recommended Tutorials" : "Newest Tutorials";
  const tutorialsSectionDescription =
    mode === "authenticated"
      ? `Tutorials matched to your ${selectedLevel?.toLowerCase() || ""} level`
      : "Latest practical and theoretical cooking tutorials";

  const articlesSectionTitle =
    mode === "authenticated" ? "Recommended Articles" : "Newest Articles";
  const articlesSectionDescription =
    mode === "authenticated"
      ? `Articles matched to your ${selectedLevel?.toLowerCase() || ""} level`
      : "Latest cooking knowledge and technique articles";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6" suppressHydrationWarning>
      {/* Tutorials Section */}
      <HomeSection
        kind="tutorials"
        title={tutorialsSectionTitle}
        description={tutorialsSectionDescription}
        items={tutorials}
        isLoading={isLoadingTutorials}
        error={tutorialsError}
        onRetry={refetchTutorials}
      />

      {/* Articles Section */}
      <div className="mt-12" suppressHydrationWarning>
        <HomeSection
          kind="articles"
          title={articlesSectionTitle}
          description={articlesSectionDescription}
          items={articles}
          isLoading={isLoadingArticles}
          error={articlesError}
          onRetry={refetchArticles}
        />
      </div>
    </div>
  );
}
