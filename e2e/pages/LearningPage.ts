import { type Page, type Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * LearningPage - Page Object Model for the Learning page
 * Handles browsing tutorials and articles with filtering
 */
export class LearningPage extends BasePage {
  // Main page elements
  readonly pageHeading: Locator;
  readonly pageDescription: Locator;

  // Filter elements
  readonly typeFilterSelect: Locator;

  // Content list
  readonly contentList: Locator;
  readonly contentCards: Locator;

  // Loading and error states
  readonly loadingState: Locator;
  readonly errorState: Locator;
  readonly emptyState: Locator;

  // Pagination
  readonly prevButton: Locator;
  readonly nextButton: Locator;

  constructor(page: Page) {
    super(page);

    // Main page elements
    this.pageHeading = page.getByRole("heading", { name: /learning/i });
    this.pageDescription = page.getByText(/browse all tutorials and articles/i);

    // Filters - using select element
    this.typeFilterSelect = page.locator("select#learning-type");

    // Content list
    this.contentList = page.locator('ul[role="list"]');
    this.contentCards = this.contentList.locator("li");

    // Loading and error states
    this.loadingState = page.getByText(/loading/i);
    this.errorState = page.getByText(/failed to load content/i);
    this.emptyState = page.getByText(/no content found/i);

    // Pagination buttons
    this.prevButton = page.getByRole("button", { name: /previous/i });
    this.nextButton = page.getByRole("button", { name: /next/i });
  }

  /**
   * Navigate to Learning page
   */
  async goto(): Promise<void> {
    await this.page.goto("/learning");
    await this.waitForPageLoad();
  }

  /**
   * Wait for content to load
   */
  async waitForContentToLoad(): Promise<void> {
    // Wait for loading state to disappear or content to appear
    await this.page.waitForFunction(
      () => {
        const hasContent = document.querySelector('ul[role="list"]');
        const isLoading = document.querySelector("*")?.textContent?.includes("Loading");
        return hasContent || !isLoading;
      },
      { timeout: 10000 }
    );
  }

  /**
   * Get count of content cards displayed
   */
  async getContentCount(): Promise<number> {
    return await this.contentCards.count();
  }

  /**
   * Get content card by index
   */
  getContentCard(index: number): Locator {
    return this.contentCards.nth(index);
  }

  /**
   * Get content card title
   */
  async getCardTitle(index: number): Promise<string | null> {
    const card = this.getContentCard(index);
    const title = card.locator("h3");
    return await title.textContent();
  }

  /**
   * Get content card type badge (Tutorial or Article)
   */
  async getCardType(index: number): Promise<string | null> {
    const card = this.getContentCard(index);
    const badge = card.locator("span").first();
    return await badge.textContent();
  }

  /**
   * Click on a content card to open details
   */
  async openContent(index: number): Promise<void> {
    const card = this.getContentCard(index);
    const link = card.locator("a");
    await link.click();
  }

  /**
   * Filter by type (all, tutorials, articles)
   */
  async filterByType(type: "all" | "tutorials" | "articles"): Promise<void> {
    await this.typeFilterSelect.selectOption(type);
    await this.waitForContentToLoad();
  }

  /**
   * Get current selected type filter value
   */
  async getSelectedType(): Promise<string | null> {
    return await this.typeFilterSelect.inputValue();
  }

  /**
   * Go to next page
   */
  async goToNextPage(): Promise<void> {
    await this.nextButton.click();
    await this.waitForContentToLoad();
  }

  /**
   * Go to previous page
   */
  async goToPreviousPage(): Promise<void> {
    await this.prevButton.click();
    await this.waitForContentToLoad();
  }

  /**
   * Check if content exists on the page
   */
  async hasContent(): Promise<boolean> {
    const count = await this.getContentCount();
    return count > 0;
  }

  /**
   * Check if empty state is shown
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.emptyState.isVisible();
  }

  /**
   * Check if error state is shown
   */
  async isErrorStateVisible(): Promise<boolean> {
    return await this.errorState.isVisible();
  }
}
