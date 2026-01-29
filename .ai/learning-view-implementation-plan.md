## View Implementation Plan — Learning

## 1. Overview
The **Learning** view (`/learning`) is the app’s primary **browse** surface for “all content”, allowing users to:
- Browse **tutorials and articles** with **deterministic pagination**
- Apply only minimal filters (MVP):
  - **Type**: All (default) / Tutorials / Articles
  - **Level**: All (default for anonymous) / Beginner / Intermediate / Experienced (default for authenticated: user’s `selected_level`)

Key UX rules (from UI plan):
- Sorting is always **newest first** for Learning results (`created_at desc`).
- **Type=All** aggregates **both endpoints** (tutorials + articles) in parallel:
  - `limit=5` each → **10** combined items per page
  - Merge + sort client-side by `created_at desc`
- **Single type** uses only the selected endpoint with `limit=10`.
- Changing **Type** resets pagination to **page 1** (recommended: Level change resets too).
- Anonymous users can browse read-only; **no completion indicators**.

## 2. View Routing
- **Route path**: `/learning`
- **Astro page**: `src/pages/learning.astro`
- **Auth**: Public route (must work anonymous + authenticated). Middleware will still populate `Astro.locals.user/profile` when authenticated.

## 3. Component Structure
Recommended structure (Astro page + React island for interactive state/data fetching):

```text
src/pages/learning.astro
└─ Layout (Astro)  [app shell]
   ├─ Navbar (Astro)
   └─ <main>
      └─ LearningView (React island; client:load)
         ├─ SectionHeader (shared)  [title + short explanatory copy]
         ├─ FiltersBar
         │  ├─ TypeFilter (select)
         │  └─ LevelFilter (select)
         ├─ LoadingState | FullPageError | EmptyState | ResultsGrid
         │  └─ ContentCard (x10 max per page)
         │     └─ NewBadge (optional)
         └─ PaginationControls (Prev/Next + “Page X of Y”)
```

## 4. Component Details

### `src/pages/learning.astro` (LearningPage)
- **Component description**: Route entry for `/learning`. Reads authenticated context (if present) from middleware-populated `Astro.locals` and mounts the Learning React island.
- **Main elements**:
  - `<Layout title="Learning — Cook Mastery">`
  - `<div class="container ...">` wrapper consistent with other pages (optional)
  - `<LearningView client:load ... />`
- **Handled events**: none (Astro page).
- **Validation conditions**:
  - Do not assume authentication; treat `Astro.locals.profile` as optional.
- **Types**:
  - `DifficultyLevel` (for passing `selected_level` when authenticated)
- **Props (to `LearningView`)**:
  - `isAuthenticated: boolean`
  - `userSelectedLevel?: DifficultyLevel` (only when authenticated)
  - `initialLevelFilter: DifficultyLevel | "ALL"` (derived: authenticated → `userSelectedLevel`, else `"ALL"`)
  - `initialTypeFilter?: LearningTypeFilter` (default `"all"`)

### `src/components/learning/LearningView.tsx` (LearningView)
- **Component description**: Page-level container that wires:
  - header + microcopy,
  - filters,
  - results list states (loading/error/empty/success),
  - deterministic pagination UI.
- **Main elements**:
  - `<section aria-labelledby={headingId}>`
  - `SectionHeader` (title “Learning”, description describing filters and ordering)
  - `FiltersBar` (Type + Level)
  - Results area:
    - `LoadingState` (count=10 for “All”, count=10 for single-type)
    - `FullPageError` (retry triggers current mode refetch)
    - `EmptyState` (when combined/single results empty)
    - `<ul role="list" className="grid ...">` with `ContentCard`
  - `PaginationControls` (only when there is at least 1 item OR `totalItems > 0`)
- **Handled events**:
  - `onTypeChange(nextType)` → updates filter; **resets page to 1**; triggers refetch
  - `onLevelChange(nextLevel)` → updates filter; recommended: resets page to 1; triggers refetch
  - `onPrevPage()` / `onNextPage()` → updates page; triggers refetch
  - `onRetry()` (error state) → triggers refetch for the current filter mode
- **Validation conditions (API-aligned, before making requests)**:
  - **Type filter** must be one of: `"all" | "tutorials" | "articles"`.
  - **Level filter** must be either:
    - `"ALL"` (means “no `level` query param”), or
    - a valid `DifficultyLevel`: `"BEGINNER" | "INTERMEDIATE" | "EXPERIENCED"`.
  - **Sort** must always be `"newest"`.
  - **Page** must always be a positive integer (`>= 1`).
  - **Limit**:
    - Type=`all`: `5` per endpoint call (10 combined per page)
    - Type=`tutorials` or `articles`: `10` for the single endpoint
    - Must remain within API constraints `1..100`.
  - **include_completed**:
    - Anonymous: send `include_completed=false` (ensures no completion indicators)
    - Authenticated: send `include_completed=true` (optional; enables completion indicators on cards)
- **Types required**:
  - DTOs: `ListTutorialsResponseDTO`, `ListArticlesResponseDTO`, `TutorialListItemDTO`, `ArticleListItemDTO`, `PaginationMeta`, `ApiErrorResponse`, `DifficultyLevel`
  - View models (new): `LearningTypeFilter`, `LearningLevelFilter`, `LearningFeedStateVM`, `LearningPaginationVM`, `LearningFeedErrorVM`
  - Shared VM for cards (recommended refactor): `ContentCardItemVM` (see “Types” section)
- **Props (component interface)**:
  - `isAuthenticated: boolean`
  - `userSelectedLevel?: DifficultyLevel`
  - `initialLevelFilter: DifficultyLevel | "ALL"`
  - `initialTypeFilter?: LearningTypeFilter`

### `src/components/learning/FiltersBar.tsx` (FiltersBar)
- **Component description**: Horizontal bar holding the two filters and the “context” label (e.g., “Sorted by newest” and optional “Showing your level vs other level”).
- **Main elements**:
  - `<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">`
  - Left cluster: Type + Level controls (each with `<label>` + `<select>`)
  - Right cluster: helper text (“Newest first”) and optional note when browsing other levels
- **Handled events**:
  - `onChange` from each `<select>`
- **Validation conditions**:
  - Only emit allowed enum values; never emit `"ALL"` as a `level` query parameter.
- **Types**:
  - `LearningTypeFilter`, `LearningLevelFilter`, `DifficultyLevel`
- **Props**:
  - `type: LearningTypeFilter`
  - `level: LearningLevelFilter`
  - `userSelectedLevel?: DifficultyLevel`
  - `onTypeChange: (next: LearningTypeFilter) => void`
  - `onLevelChange: (next: LearningLevelFilter) => void`

### `src/components/learning/TypeFilter.tsx` (TypeFilter)
- **Component description**: Select control for content type. Defaults to `All`.
- **Main elements**:
  - `<label htmlFor="learning-type">Type</label>`
  - `<select id="learning-type">` with options: All / Tutorials / Articles
- **Handled events**:
  - `onChange` → `onTypeChange(nextType)`
- **Validation conditions**:
  - Map UI values to `LearningTypeFilter` only.
- **Types**:
  - `LearningTypeFilter`
- **Props**:
  - `value: LearningTypeFilter`
  - `onChange: (next: LearningTypeFilter) => void`

### `src/components/learning/LevelFilter.tsx` (LevelFilter)
- **Component description**: Select control for level. Defaults:
  - Authenticated: user’s `selected_level`
  - Anonymous: `All`
- **Main elements**:
  - `<label htmlFor="learning-level">Level</label>`
  - `<select id="learning-level">` with options: All / Beginner / Intermediate / Experienced
  - Optional helper text when `value !== "ALL"` and `value !== userSelectedLevel`: “Browsing other levels (not recommended)”
- **Handled events**:
  - `onChange` → `onLevelChange(nextLevel)`
- **Validation conditions**:
  - Only emit `"ALL"` or a valid `DifficultyLevel` value.
- **Types**:
  - `LearningLevelFilter`, `DifficultyLevel`
- **Props**:
  - `value: LearningLevelFilter`
  - `userSelectedLevel?: DifficultyLevel`
  - `onChange: (next: LearningLevelFilter) => void`

### `src/components/shared/PaginationControls.tsx` (PaginationControls)
- **Component description**: Shared pagination component displaying:
  - Prev/Next buttons
  - “Page X of Y”
  - Disabled states when at bounds or when loading.
- **Main elements**:
  - `<nav aria-label="Pagination">`
  - `Button` (shadcn) or `<button>` for Prev/Next
  - `<span>` for “Page X of Y”
- **Handled events**:
  - Prev click → `onPrev()`
  - Next click → `onNext()`
- **Validation conditions**:
  - `currentPage` is clamped to `1..totalPages` in parent before enabling buttons.
  - Hide or disable if `totalPages <= 1`.
- **Types**:
  - `LearningPaginationVM` (or a small shared pagination props type)
- **Props**:
  - `currentPage: number`
  - `totalPages: number`
  - `isLoading?: boolean`
  - `onPrev: () => void`
  - `onNext: () => void`

### `src/components/content/ContentCard.tsx` (ContentCard)
- **Component description**: Reused card UI for tutorial/article items (type badge, title, summary, metadata, optional New/Completed).
- **Learning-specific behavior**:
  - If `isAuthenticated === false`, do not pass `isCompleted` fields into the card VM so the “Completed” indicator stays hidden.
- **Types**:
  - Recommended: decouple from Home by introducing a shared `ContentCardItemVM` (see “Types”).

## 5. Types

### Existing DTOs (already defined in `src/types.ts`)
- `DifficultyLevel`
- `TutorialCategory`
- `TutorialListItemDTO`
- `ArticleListItemDTO`
- `ListTutorialsParams`, `ListArticlesParams`
- `ListTutorialsResponseDTO`, `ListArticlesResponseDTO`
- `PaginationMeta`
- `ApiErrorResponse`

### New view models (create in `src/components/learning/learning.types.ts`)

#### `LearningTypeFilter`
```ts
export type LearningTypeFilter = "all" | "tutorials" | "articles";
```

#### `LearningLevelFilter`
Use `"ALL"` as a UI-only sentinel; do not send it to the API.
```ts
import type { DifficultyLevel } from "../../types";

export type LearningLevelFilter = DifficultyLevel | "ALL";
```

#### `LearningFeedErrorVM`
```ts
import type { ApiErrorResponse } from "../../types";

export interface LearningFeedErrorVM {
  kind: "network" | "http" | "unknown";
  status?: number;
  message: string;
  api?: ApiErrorResponse;
}
```

#### `LearningPaginationVM`
```ts
export interface LearningPaginationVM {
  page: number;        // current page (>=1)
  totalPages: number;  // computed (>=1 for display; may be 0 internally when totalItems=0)
  totalItems: number;
  pageSize: number;    // 10 for aggregated; 10 for single-type (kept explicit)
}
```

#### `LearningFeedStateVM`
```ts
import type { DifficultyLevel } from "../../types";
import type { ContentCardItemVM } from "../content/content.types";
import type { LearningTypeFilter, LearningLevelFilter, LearningFeedErrorVM, LearningPaginationVM } from "./learning.types";

export interface LearningFeedStateVM {
  isAuthenticated: boolean;
  userSelectedLevel?: DifficultyLevel;

  type: LearningTypeFilter;
  level: LearningLevelFilter;

  items: ContentCardItemVM[];
  pagination: LearningPaginationVM;

  isLoading: boolean;
  error: LearningFeedErrorVM | null;
}
```

### Recommended shared VM type for cards (decouple Home ↔ ContentCard)
Today `ContentCard` imports `HomeContentItemVM` from `home/home.types.ts`, which will force Learning to depend on “Home” naming. For clean architecture, introduce:
- `src/components/content/content.types.ts` with `ContentCardItemVM`
- Update `ContentCard.tsx` to use that shared type
- Update Home’s types/hook to map to `ContentCardItemVM` instead of `HomeContentItemVM`

Proposed shared type:
```ts
import type { DifficultyLevel, TutorialCategory } from "../../types";

export type ContentCardItemType = "tutorial" | "article";

export interface ContentCardItemVM {
  type: ContentCardItemType;
  id: string;
  title: string;
  summary: string;
  level: DifficultyLevel;
  difficultyWeight: number;
  createdAt: string;
  href: string;

  category?: TutorialCategory; // tutorial-only
  isNew: boolean;

  // completion (optional; only include when authenticated + include_completed=true)
  isCompleted?: boolean;
  completedAt?: string | null;
}
```

## 6. State Management
Implement all Learning state locally in a dedicated hook to keep `LearningView` mostly presentational.

### Suggested hook
- **Hook file**: `src/components/hooks/useLearningFeed.ts`
- **Responsibilities**:
  - Own `type`, `level`, and `page` state (component-state only; no URL query params in MVP).
  - Fetch the correct API data based on current filters:
    - Aggregated (all): tutorials + articles in parallel; merge + sort.
    - Single: one endpoint only.
  - Compute deterministic pagination model for rendering.
  - Handle loading/error states and expose event handlers (`setType`, `setLevel`, `goPrev`, `goNext`, `retry`).
  - Use `AbortController` to cancel in-flight requests on filter/page changes and unmount.

### State variables (inside hook)
- `type: LearningTypeFilter`
- `level: LearningLevelFilter`
- `page: number`
- `items: ContentCardItemVM[]`
- `pagination: LearningPaginationVM`
- `isLoading: boolean`
- `error: LearningFeedErrorVM | null`
- `abortRef: AbortController | null` (or separate refs per endpoint in aggregated mode)

### Key derived rules
- **Page reset**:
  - On `type` change: `setPage(1)` (required).
  - On `level` change: `setPage(1)` (recommended for UX + avoids invalid pages).
- **Disable pagination buttons**:
  - While `isLoading`
  - When `page <= 1` for Prev
  - When `page >= totalPages` for Next
- **Show/hide pagination UI**:
  - Hide when `totalItems === 0` (empty state), otherwise show.

## 7. API Integration

### Endpoints used
- `GET /api/tutorials` (list)
- `GET /api/articles` (list)

### Request and response types
- **Tutorials**
  - Request params type: `ListTutorialsParams`
  - Response type: `ListTutorialsResponseDTO`
- **Articles**
  - Request params type: `ListArticlesParams`
  - Response type: `ListArticlesResponseDTO`

### Concrete requests for Learning

#### Type = All (aggregated)
Two calls in parallel:
- Tutorials: `GET /api/tutorials?sort=newest&limit=5&page=<page>&include_completed=<true|false>[&level=<DifficultyLevel>]`
- Articles: `GET /api/articles?sort=newest&limit=5&page=<page>&include_completed=<true|false>[&level=<DifficultyLevel>]`

Client-side merge:
- Convert both DTO lists into `ContentCardItemVM[]`
- Merge arrays and sort by `createdAt desc` (ISO string → Date compare)
- Display first 10 items (should already be <=10 due to limits)

Combined pagination computation:
- `combinedTotalItems = tutorials.pagination.total_items + articles.pagination.total_items`
- `combinedPageSize = 10`
- `combinedTotalPages = ceil(combinedTotalItems / combinedPageSize)`
- Use `combinedTotalPages` for Prev/Next and “Page X of Y”

#### Type = Tutorials (single)
- `GET /api/tutorials?sort=newest&limit=10&page=<page>&include_completed=<true|false>[&level=<DifficultyLevel>]`
- Pagination comes directly from `response.pagination`.

#### Type = Articles (single)
- `GET /api/articles?sort=newest&limit=10&page=<page>&include_completed=<true|false>[&level=<DifficultyLevel>]`
- Pagination comes directly from `response.pagination`.

### Parameter encoding rules (must match API validation)
- Only send `level` when `level !== "ALL"`.
- `sort` must be `"newest"` for Learning.
- `page` must be `>= 1`.
- `limit` must be within `1..100` (Learning uses 5 or 10).
- `include_completed` is a boolean-like query string:
  - `"true"` when authenticated and you want completion indicators
  - `"false"` when anonymous (required by view spec)

### Error parsing
Follow the Home hook pattern:
- For non-2xx, attempt to parse `ApiErrorResponse` and surface `error.error.message`.
- Otherwise use generic user-friendly messages:
  - “Couldn’t load learning content. Try again.”

## 8. User Interactions
- **Change Type** (All/Tutorials/Articles):
  - Updates list to the selected mode
  - Resets to **Page 1**
  - Keeps Level selection intact
- **Change Level** (All/Beginner/Intermediate/Experienced):
  - Refetches content for the selected level
  - Recommended: resets to **Page 1**
  - When browsing a non-selected level while authenticated, show a small note that it is “not recommended”
- **Pagination**:
  - Prev/Next navigates pages deterministically
  - “Page X of Y” updates accordingly
- **Click content card**:
  - Tutorials → `/tutorials/:id`
  - Articles → `/articles/:id`
- **Retry (error state)**:
  - Retries the current request(s) (single endpoint, or both endpoints for aggregated)

## 9. Conditions and Validation

### UI-verified conditions (before fetch)
- **Type** must be within `LearningTypeFilter`.
- **Level** must be `"ALL"` or a valid `DifficultyLevel`.
- **Query parameters**:
  - `page` is a positive integer
  - `limit` is either 5 (aggregated per endpoint) or 10 (single), and within `1..100`
  - `sort="newest"`
  - `include_completed` is explicitly set to `"false"` for anonymous users
- **Do not send unsupported params**:
  - No search query
  - No tags/category filter in Learning UI (even though `/api/tutorials` supports `category`)

### Deterministic ordering
- Trust API ordering for each endpoint (`created_at desc` with `sort=newest`).
- In aggregated mode, enforce determinism by **client-side sorting** merged items by `createdAt desc`.

### Recommendation labeling constraints (US-010)
- Learning is a browse surface; do **not** label items as “recommended”.
- If authenticated and user selects a different level than `userSelectedLevel`, show copy like:
  - “Browsing other levels (not recommended)” (no badges on cards).

## 10. Error Handling

### Expected error scenarios
- **Network/offline**: `fetch()` rejects.
- **400 VALIDATION_ERROR**: should not occur if UI enforces constraints; if it does, treat as a developer-facing bug and show server message.
- **500 INTERNAL_SERVER_ERROR**: show `FullPageError` with retry.
- **Aggregated partial failures**:
  - Tutorials succeed, Articles fail (or vice versa).

### Handling strategy
- **Clarity-first (recommended)**:
  - Aggregated mode: if either request fails, show a single `FullPageError` for the whole results area; retry triggers both calls.
- **Optional enhancement (degraded mode)**:
  - Render the successful items and show a small inline warning (“Some content failed to load”) with a “Retry” action for the failed endpoint.

### Empty states
- If there are **no results** for the current filters (aggregated combined total = 0, or single list empty):
  - Show `EmptyState` with clear copy:
    - Title: “No content found”
    - Description: “Try a different type or level, or check back later.”
  - Hide pagination controls.

## 11. Implementation Steps
1. **Create the route page**:
   - Add `src/pages/learning.astro` using `Layout`.
   - Read `Astro.locals.user/profile` to derive:
     - `isAuthenticated`
     - `userSelectedLevel`
     - `initialLevelFilter`
2. **Create Learning components**:
   - `src/components/learning/LearningView.tsx`
   - `src/components/learning/FiltersBar.tsx`
   - `src/components/learning/TypeFilter.tsx`
   - `src/components/learning/LevelFilter.tsx`
3. **Add pagination UI**:
   - Create `src/components/shared/PaginationControls.tsx` using existing shadcn `Button`.
4. **Add Learning view-local types**:
   - Create `src/components/learning/learning.types.ts` with:
     - `LearningTypeFilter`, `LearningLevelFilter`
     - `LearningFeedErrorVM`, `LearningPaginationVM`, `LearningFeedStateVM`
5. **Implement data fetching hook**:
   - Create `src/components/hooks/useLearningFeed.ts` following the `useHomeFeeds` patterns:
     - Explicit query param construction with `URLSearchParams`
     - Abort handling on changes/unmount
     - Parse structured `ApiErrorResponse` for HTTP errors
6. **(Recommended) Decouple ContentCard from Home types**:
   - Add `src/components/content/content.types.ts` with `ContentCardItemVM`
   - Update `src/components/content/ContentCard.tsx` to use the shared type
   - Update Home view to map to `ContentCardItemVM` (rename `HomeContentItemVM` or keep as alias)
7. **Wire visual states**:
   - Loading → `LoadingState` (count=10)
   - Error → `FullPageError` with retry
   - Empty → `EmptyState`
   - Success → `<ul>` grid with `ContentCard`
8. **Implement pagination rules**:
   - Disable Prev/Next at bounds.
   - Reset page to 1 on Type change (and Level change).
   - Compute combined totals/pages in aggregated mode.
9. **Add cross-level browse messaging (US-010)**:
   - When authenticated and `level !== "ALL"` and `level !== userSelectedLevel`, show “not recommended” note in `FiltersBar`.
10. **Sanity check API constraints**:
   - Ensure Learning never sends `level=ALL` (must omit).
   - Ensure `sort=newest` always.
   - Ensure `limit` stays within `1..100`.
