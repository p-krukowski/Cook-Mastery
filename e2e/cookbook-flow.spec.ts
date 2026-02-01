import { test, expect } from '@playwright/test';

/**
 * E2E Test: Cookbook Flow
 * Tests the complete flow of creating a new cookbook entry
 * Flow: Login → Navigate to Cookbook → Create Entry → Fill Form → Save
 */

test('should create a new cookbook entry', async ({ page }) => {
  // Get credentials from environment
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'E2E user credentials not found. Please set E2E_USERNAME and E2E_PASSWORD in .env.test'
    );
  }

  // Step 0: Logout first to ensure clean state
  await page.request.post('/api/auth/logout').catch(() => {
    // Ignore errors if not logged in
  });
  await page.context().clearCookies();

  // Step 1: Login
  await page.goto('/login', { waitUntil: 'networkidle' });
  
  // Debug: Check what's on the page
  console.log('Current URL:', page.url());
  const bodyText = await page.locator('body').textContent();
  console.log('Page content preview:', bodyText?.substring(0, 200));

  // Wait for form elements using roles (works even if React hasn't hydrated)
  const identifierInput = page.getByRole('textbox', { name: /email or username/i });
  const passwordInput = page.getByRole('textbox', { name: /password/i });
  const loginButton = page.getByRole('button', { name: /log in/i });

  await identifierInput.waitFor({ state: 'visible', timeout: 10000 });
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
  await loginButton.waitFor({ state: 'visible', timeout: 10000 });

  // Fill login form
  await identifierInput.fill(username);
  await passwordInput.fill(password);

// Verify fields are filled
await expect(identifierInput).toHaveValue(username);
await expect(passwordInput).toHaveValue(password);

// Submit login form
await loginButton.click();

// Wait a moment for the request to complete and check for errors
await page.waitForTimeout(2000);

// Check if there's an error message (which would mean login failed)
const errorElement = page.getByTestId('login-error');
const hasError = await errorElement.isVisible().catch(() => false);

if (hasError) {
  const errorText = await errorElement.textContent();
  throw new Error(`Login failed with error: ${errorText}`);
}

// Wait for redirect to complete
await page.waitForURL(/^(?!.*\/login)/, { timeout: 10000 });

  // Verify we're logged in
  expect(page.url()).not.toContain('/login');

  // Step 2: Go to Cookbook page
  await page.goto('/cookbook');

  // Wait for cookbook page to load
  await expect(page.getByRole('heading', { name: 'Cookbook' })).toBeVisible();

  // Step 3: Click button to create new entry
  const newEntryButton = page.getByRole('link', { name: /new entry/i });
  await expect(newEntryButton).toBeVisible();
  await newEntryButton.click();

  // Wait for navigation to new entry page
  await page.waitForURL('/cookbook/new', { timeout: 5000 });

  // Step 4: Wait for entry form and fill it
  // Wait for form fields using roles
  const urlInput = page.locator('input#url');
  const titleInput = page.locator('input#title');
  const notesTextarea = page.locator('textarea#notes');
  const submitButton = page.getByRole('button', { name: /save/i });

  await expect(urlInput).toBeVisible();
  await expect(titleInput).toBeVisible();
  await expect(notesTextarea).toBeVisible();
  await expect(submitButton).toBeVisible();

  // Fill the form with test data
  const testUrl = 'https://example.com/test-recipe';
  const testTitle = 'Test Recipe Entry';
  const testNotes = 'This is a test recipe entry created by e2e test';

  await urlInput.fill(testUrl);
  await titleInput.fill(testTitle);
  await notesTextarea.fill(testNotes);

  // Verify fields are filled
  await expect(urlInput).toHaveValue(testUrl);
  await expect(titleInput).toHaveValue(testTitle);
  await expect(notesTextarea).toHaveValue(testNotes);

  // Step 5: Save new entry
  await submitButton.click();

  // Wait for redirect to the created entry's detail page
  // The redirect goes to /cookbook/:id
  await page.waitForURL(/\/cookbook\/[0-9a-f-]+$/, { timeout: 10000 });

  // Verify we're on a cookbook detail page (not the list page or new page)
  const currentUrl = page.url();
  expect(currentUrl).toMatch(/\/cookbook\/[0-9a-f-]+$/);
  expect(currentUrl).not.toContain('/new');

  // Optional: Verify the entry was created by checking the page contains our data
  // (This assumes the detail page shows the entry information)
  await expect(page.locator('body')).toContainText(testTitle);
});
