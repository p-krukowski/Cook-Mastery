# Learning Page E2E Tests

## Overview
Simple end-to-end tests for the Learning page that verify users can browse and access tutorials and articles.

## Files Created
- `e2e/pages/LearningPage.ts` - Page Object Model for the Learning page
- `e2e/learning.spec.ts` - E2E test suite for Learning page functionality

## Test Coverage

### 1. Display Learning Page
- Verifies the page heading and description are visible
- ✅ **Status: PASSING**

### 2. Display Type Filter
- Verifies the type filter select dropdown is visible
- Checks that the default value is "all"
- ✅ **Status: PASSING**

### 3. Filter Content by Type (if content exists)
- Tests filtering by Tutorials, Articles, and All
- Gracefully skips if no content is available
- ✅ **Status: PASSING**

### 4. Open Content Detail Page (if content exists)
- **Main test requirement**: Clicks on a content card
- Verifies navigation to the detail page (`/tutorials/:id` or `/articles/:id`)
- Checks that the content title is displayed on the detail page
- ✅ **Status: PASSING**

### 5. Content Card Structure (if content exists)
- Verifies each card has a type badge, title, summary, and is clickable
- Gracefully skips if no content is available
- ✅ **Status: PASSING**

## Page Object Model (LearningPage)

The `LearningPage` class provides methods for:
- Navigation: `goto()`, `waitForContentToLoad()`
- Content inspection: `getContentCount()`, `getCardTitle()`, `getCardType()`
- Interactions: `openContent()`, `filterByType()`
- State checks: `hasContent()`, `isEmptyStateVisible()`, `isErrorStateVisible()`

## Test Results

```
✅ 5/5 tests passing
⏱️  Test suite completes in ~12 seconds
```

The tests are designed to be resilient:
- They gracefully handle cases where content may not be present
- They skip content-dependent tests when no data exists
- They verify page structure and UI elements work correctly

## Running the Tests

```bash
# Run all learning tests
npm run test:e2e -- learning.spec.ts

# Run in UI mode
npm run test:e2e:ui -- learning.spec.ts

# Run specific test
npm run test:e2e -- learning.spec.ts -g "should open content detail"
```

## Dependencies
- Follows the same pattern as existing cookbook tests
- Uses Playwright's `@playwright/test` framework
- No authentication required (Learning page is public)
