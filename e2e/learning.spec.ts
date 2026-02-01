import { test, expect } from '@playwright/test';
import { LearningPage } from './pages';

/**
 * E2E Tests: Learning Page
 * Tests for browsing tutorials and articles on the Learning page
 */

test.describe('Learning Page', () => {
  test('should display learning page', async ({ page }) => {
    const learningPage = new LearningPage(page);
    await learningPage.goto();

    // Verify page heading and description are visible
    await expect(learningPage.pageHeading).toBeVisible();
    await expect(learningPage.pageDescription).toBeVisible();
  });

  test('should display type filter', async ({ page }) => {
    const learningPage = new LearningPage(page);
    await learningPage.goto();

    // Verify type filter select is visible
    await expect(learningPage.typeFilterSelect).toBeVisible();

    // Verify it has the correct default value
    const selectedType = await learningPage.getSelectedType();
    expect(selectedType).toBe('all');
  });

  test('should filter content by type when content exists', async ({
    page,
  }) => {
    const learningPage = new LearningPage(page);
    await learningPage.goto();
    await learningPage.waitForContentToLoad();

    // Only run this test if content exists
    const hasInitialContent = await learningPage.hasContent();

    if (hasInitialContent) {
      // Filter by tutorials
      await learningPage.filterByType('tutorials');
      const selectedType = await learningPage.getSelectedType();
      expect(selectedType).toBe('tutorials');

      // Filter by articles
      await learningPage.filterByType('articles');
      const selectedType2 = await learningPage.getSelectedType();
      expect(selectedType2).toBe('articles');

      // Filter back to all
      await learningPage.filterByType('all');
      const selectedType3 = await learningPage.getSelectedType();
      expect(selectedType3).toBe('all');
    } else {
      console.log('Skipping filter test - no content available');
    }
  });

  test('should open content detail page when clicking on a card (if content exists)', async ({
    page,
  }) => {
    const learningPage = new LearningPage(page);
    await learningPage.goto();
    await learningPage.waitForContentToLoad();

    // Only run this test if content exists
    const hasContent = await learningPage.hasContent();

    if (hasContent) {
      // Get the first content card's title and type
      const firstCardTitle = await learningPage.getCardTitle(0);
      const firstCardType = await learningPage.getCardType(0);

      expect(firstCardTitle).toBeTruthy();
      expect(firstCardType).toMatch(/Tutorial|Article/);

      // Click on the first content card
      await learningPage.openContent(0);

      // Wait for navigation to detail page
      await page.waitForLoadState('domcontentloaded');

      // Verify we navigated to a detail page
      // Should be either /tutorials/:id or /articles/:id
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/(tutorials|articles)\/[a-f0-9-]+$/);

      // Verify the detail page shows the title
      const pageContent = await page.locator('body').textContent();
      expect(pageContent).toContain(firstCardTitle);
    } else {
      console.log('Skipping detail page test - no content available');
    }
  });

  test('should show content cards with expected structure (if content exists)', async ({
    page,
  }) => {
    const learningPage = new LearningPage(page);
    await learningPage.goto();
    await learningPage.waitForContentToLoad();

    const hasContent = await learningPage.hasContent();

    if (hasContent) {
      // Get first card and verify its structure
      const firstCard = learningPage.getContentCard(0);

      // Should have type badge
      const typeBadge = firstCard.locator('span').first();
      await expect(typeBadge).toBeVisible();

      // Should have title (h3)
      const title = firstCard.locator('h3');
      await expect(title).toBeVisible();

      // Should have summary paragraph
      const summary = firstCard.locator('p');
      await expect(summary.first()).toBeVisible();

      // Should be a clickable link
      const link = firstCard.locator('a');
      await expect(link).toBeVisible();
    } else {
      console.log('Skipping card structure test - no content available');
    }
  });
});
