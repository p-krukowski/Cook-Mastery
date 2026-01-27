## View Implementation Plan — Home

## 1. Overview
The **Home** view (`/`) is the app’s “what to learn next” entry point. It shows two small feeds:
- **Tutorials** (5 items)
- **Articles** (5 items)

It supports two modes:
- **Anonymous**: show **newest** items per section; hide completion indicators.
- **Authenticated**: show **recommended** items aligned to the user’s **selected level**, sorted easiest → hardest (deterministic secondary order: `created_at desc`).

Each item can display a subtle **“New”** badge if created within the last **7 days**.

## 2. View Routing
- **Route path**: `/`
- **Astro page**: `src/pages/index.astro`

## 3. Component Structure
Recommended structure (Astro page + React island for data fetching):

```text
src/pages/index.astro
└─ Layout (Astro)  [app shell]
   ├─ Navbar (Astro/React)
   └─ <main>
      └─ HomeView (React island; client:load)
         ├─ HomeSection (Tutorials)
         │  ├─ SectionHeader
         │  ├─ LoadingState | FullPageError | EmptyState | ContentGrid
         │  └─ ContentCard (x5)
         │     └─ NewBadge (optional)
         └─ HomeSection (Articles)
            ├─ SectionHeader
            ├─ LoadingState | FullPageError | EmptyState | ContentGrid
            └─ ContentCard (x5)
               └─ NewBadge (optional)
```

## 4. Component Details

### `src/pages/index.astro` (HomePage)
- **Component description**: Route entry for `/`. Renders the global layout and mounts the Home React island.
- **Main elements**:
  - `<Layout title="Cook Mastery — Home">`
  - `<HomeView client:load />`
- **Handled events**: none (Astro page).
- **Handled validation**:
  - Ensure the page does not assume authenticated state on the server.
- **Types**: none.
- **Props**: none.

### `src/layouts/Layout.astro` (App shell)
- **Component description**: Global page chrome (document shell + navbar + main container). Replace the starter-only content with an app shell appropriate for Cook Mastery.
- **Main elements**:
  - `<html lang="en">`, `<body>`
  - `<header>` containing `Navbar`
  - `<main>` containing `<slot />`
- **Handled events**: none (layout).
- **Handled validation**:
  - None; it is presentational.
- **Types**:
  - `Props`: `{ title?: string }`
- **Props**:
  - `title?: string`

### `src/components/nav/Navbar.(astro|tsx)` (Navbar)
- **Component description**: Top navigation with primary links: Home (`/`), Learning (`/learning`), Cookbook (`/cookbook`), Profile (`/profile`). Right side shows Login/Signup when anonymous, or username/profile link when authenticated (when session support exists).
- **Main elements**:
  - `<nav aria-label="Primary">`
  - Brand link (e.g., “Cook Mastery”) to `/`
  - `<a>` links (use `aria-current="page"` for active route if implemented client-side)
  - Right-side actions: `<a href="/login">Log in</a>`, `<a href="/signup">Sign up</a>` OR username link.
- **Handled events**:
  - Link navigation (native).
- **Handled validation**:
  - If session data is missing/unknown, default to anonymous controls (Log in/Sign up).
- **Types**:
  - `SessionVM` (optional): used to conditionally show authenticated UI.
- **Props** (if implemented as a pure component):
  - `session?: SessionVM | null`

### `src/components/home/HomeView.tsx` (HomeView)
- **Component description**: Fetches both feeds (tutorials and articles) and renders two sections with consistent loading/error/empty states.
- **Main elements**:
  - Wrapper `<div className="mx-auto w-full max-w-6xl px-4 py-6">`
  - Two `<section>` blocks (Tutorials, Articles)
  - For each section: `SectionHeader` + `ContentGrid` (list of `ContentCard`)
- **Handled events**:
  - `onRetry` (from `FullPageError`): triggers refetch for one/both feeds.
  - Optional: “View all” links to `/learning` (if added).
- **Handled validation (API-aligned)**:
  - `limit` is always `5` (must be `1..100`).
  - `page` is always `1` (must be positive integer).
  - `sort` is restricted to `'difficulty_asc' | 'newest'`.
  - `level` is only sent when it is a valid `DifficultyLevel` (`BEGINNER | INTERMEDIATE | EXPERIENCED`).
  - `include_completed`:
    - Anonymous: force `false` (avoid user-specific semantics and extra DB work).
    - Authenticated: `true` (allows completion indicators if desired).
  - If selected level is unknown (session not available), fall back to anonymous mode (newest).
- **Types**:
  - DTOs: `ListTutorialsResponseDTO`, `ListArticlesResponseDTO`, `TutorialListItemDTO`, `ArticleListItemDTO`, `ApiErrorResponse`
  - View models: `HomeViewMode`, `HomeFeedStateVM`, `HomeContentItemVM`
- **Props**:
  - `initialMode?: HomeViewMode` (optional; defaults to `'anonymous'`)
  - `selectedLevel?: DifficultyLevel` (optional; when present enables recommended mode)

### `src/components/home/HomeSection.tsx` (HomeSection)
- **Component description**: Section wrapper that renders a `SectionHeader` and switches between loading/error/empty/success states.
- **Main elements**:
  - `<section aria-labelledby={headingId}>`
  - `SectionHeader`
  - Conditional render:
    - `LoadingState` (skeletons)
    - `FullPageError` (section-scoped)
    - `EmptyState`
    - `<ul role="list">` grid with `ContentCard` items
- **Handled events**:
  - Retry button click → calls `onRetry()`
- **Handled validation**:
  - If `items.length === 0` → show `EmptyState`
  - If `error != null` → show error state
- **Types**:
  - `HomeContentItemVM[]`
  - `HomeSectionKind = 'tutorials' | 'articles'`
- **Props**:
  - `kind: HomeSectionKind`
  - `title: string`
  - `description: string`
  - `items: HomeContentItemVM[]`
  - `isLoading: boolean`
  - `error: HomeFeedErrorVM | null`
  - `onRetry: () => void`

### `src/components/shared/SectionHeader.tsx` (SectionHeader)
- **Component description**: Displays section title and small explanatory copy. Adjust copy based on mode: “Newest” vs “Recommended for your level”.
- **Main elements**:
  - `<div className="mb-4">`
  - `<h2 id={id}>...</h2>`
  - `<p className="text-muted-foreground">...</p>`
- **Handled events**: none.
- **Handled validation**:
  - Ensure an `id` is always provided for `aria-labelledby` wiring.
- **Types**: none beyond props.
- **Props**:
  - `id: string`
  - `title: string`
  - `description: string`

### `src/components/content/ContentCard.tsx` (ContentCard)
- **Component description**: Shared tutorial/article card with type badge, title, summary, and metadata row (level, difficulty weight, optional category). Entire card is a link.
- **Main elements**:
  - `<li>`
  - `<a href={item.href} className="block rounded-lg border bg-card p-4 ...">`
  - Type badge (“Tutorial” / “Article”)
  - Title (e.g., `<h3 className="font-semibold">`)
  - Summary `<p>`
  - Metadata row: level, difficulty weight; category only for tutorials
  - `NewBadge` when `item.isNew === true`
  - Optional completion indicator for authenticated users only (e.g., “Completed”)
- **Handled events**:
  - Link navigation.
- **Handled validation**:
  - `href` must be non-empty.
  - `difficultyWeight` must be displayed as a number (expects `1..5` from API).
  - Completion indicator must be hidden when `item.isCompleted === undefined` (anonymous mode).
- **Types**:
  - `HomeContentItemVM`
- **Props**:
  - `item: HomeContentItemVM`

### `src/components/content/NewBadge.tsx` (NewBadge)
- **Component description**: Renders a small “New” badge when content is within a threshold window.
- **Main elements**:
  - `<span className="rounded-full bg-accent px-2 py-0.5 text-xs">New</span>`
- **Handled events**: none.
- **Handled validation**:
  - `createdAt` must parse as a valid date; if not, do not render “New”.
- **Types**:
  - Uses `createdAt: string` and `nowMs: number` in helper calculations.
- **Props**:
  - `createdAt: string`
  - `days?: number` (default `7`)

### `src/components/shared/EmptyState.tsx` (EmptyState)
- **Component description**: Friendly empty state shown per section when there are no items.
- **Main elements**:
  - `<div role="status">` with heading + description
- **Handled events**: none.
- **Handled validation**: none.
- **Types**: none beyond props.
- **Props**:
  - `title: string`
  - `description?: string`

### `src/components/shared/FullPageError.tsx` (FullPageError)
- **Component description**: Error state for failed fetch. For Home, prefer one of:
  - **Strict mode**: show a single full-page error if either feed fails (clarity-first).
  - **Degraded mode**: show per-section errors while still rendering the other section.
- **Main elements**:
  - `<div role="alert">` with message and retry button
  - Shadcn `Button` for retry
- **Handled events**:
  - Retry click → `onRetry()`
- **Handled validation**:
  - If error is an `ApiErrorResponse`, show `error.error.message`; otherwise show a generic message.
- **Types**:
  - `HomeFeedErrorVM`
- **Props**:
  - `title?: string`
  - `message: string`
  - `onRetry: () => void`

### `src/components/shared/LoadingState.tsx` (LoadingState)
- **Component description**: Skeletons for list loading.
- **Main elements**:
  - `<div aria-busy="true">` with skeleton cards
- **Handled events**: none.
- **Handled validation**: none.
- **Types**: none.
- **Props**:
  - `count?: number` (default `5`)

## 5. Types
Use existing DTOs from `src/types.ts` and add small view-specific VMs.

### Existing DTOs (already defined)
- `DifficultyLevel` (enum): `'BEGINNER' | 'INTERMEDIATE' | 'EXPERIENCED'`
- `TutorialCategory` (enum): `'PRACTICAL' | 'THEORETICAL' | 'EQUIPMENT'`
- `TutorialListItemDTO`
- `ArticleListItemDTO`
- `ListTutorialsParams`, `ListArticlesParams`
- `ListTutorialsResponseDTO`, `ListArticlesResponseDTO`
- `ApiErrorResponse`

### New view models (add in a view-local file, e.g. `src/components/home/home.types.ts`)

#### `HomeViewMode`
```ts
export type HomeViewMode = "anonymous" | "authenticated";
```

#### `HomeFeedErrorVM`
```ts
export interface HomeFeedErrorVM {
  kind: "network" | "http" | "unknown";
  status?: number; // present for HTTP errors
  message: string; // user-friendly
  api?: import("../../types").ApiErrorResponse; // present if server returned structured error
}
```

#### `HomeContentType`
```ts
export type HomeContentType = "tutorial" | "article";
```

#### `HomeContentItemVM`
Normalized fields for `ContentCard` to avoid conditional rendering logic in many places.
```ts
import type { DifficultyLevel, TutorialCategory } from "../../types";

export interface HomeContentItemVM {
  type: "tutorial" | "article";
  id: string;
  title: string;
  summary: string;
  level: DifficultyLevel;
  difficultyWeight: number; // maps from difficulty_weight
  createdAt: string; // ISO string
  href: string; // "/tutorials/:id" | "/articles/:id"

  // tutorial-only
  category?: TutorialCategory;

  // derived UI flags
  isNew: boolean;

  // completion (only when authenticated + include_completed=true)
  isCompleted?: boolean;
  completedAt?: string | null; // for articles (optional)
}
```

#### `HomeFeedStateVM`
```ts
import type { DifficultyLevel } from "../../types";

export interface HomeFeedStateVM {
  mode: "anonymous" | "authenticated";
  selectedLevel?: DifficultyLevel;

  tutorials: HomeContentItemVM[];
  articles: HomeContentItemVM[];

  isLoadingTutorials: boolean;
  isLoadingArticles: boolean;
  tutorialsError: HomeFeedErrorVM | null;
  articlesError: HomeFeedErrorVM | null;
}
```

#### `SessionVM` (optional, only if Home/ Navbar needs it now)
If session support exists later, keep Home compatible by consuming a minimal session model:
```ts
import type { DifficultyLevel } from "../../types";

export interface SessionVM {
  userId: string;
  username?: string;
  selectedLevel?: DifficultyLevel;
}
```

## 6. State Management
Implement state locally in `HomeView` via a dedicated hook.

### Suggested hook
- **Hook file**: `src/components/hooks/useHomeFeeds.ts`
- **Responsibilities**:
  - Determine mode (`anonymous` vs `authenticated`) based on availability of `selectedLevel` (and/or session presence).
  - Fetch tutorials and articles in parallel.
  - Map DTOs → `HomeContentItemVM`.
  - Track loading and error state per feed.
  - Expose `refetchTutorials()`, `refetchArticles()`, and `refetchAll()`.

### State variables (inside hook)
- `mode: HomeViewMode`
- `selectedLevel?: DifficultyLevel`
- `tutorials: HomeContentItemVM[]`
- `articles: HomeContentItemVM[]`
- `isLoadingTutorials: boolean`
- `isLoadingArticles: boolean`
- `tutorialsError: HomeFeedErrorVM | null`
- `articlesError: HomeFeedErrorVM | null`

### Derived state (for rendering)
- `isLoadingAny = isLoadingTutorials || isLoadingArticles`
- `hasAnyError = tutorialsError != null || articlesError != null`
- `shouldShowFullPageError`:
  - strict: `hasAnyError`
  - degraded: `false` (render section errors instead)

## 7. API Integration

### Endpoints used
- `GET /api/tutorials`
- `GET /api/articles`

### Request types
Use the existing parameter DTOs:
- `ListTutorialsParams` (from `src/types.ts`)
- `ListArticlesParams` (from `src/types.ts`)

### Response types
- `ListTutorialsResponseDTO` → `{ tutorials: TutorialListItemDTO[]; pagination: PaginationMeta }`
- `ListArticlesResponseDTO` → `{ articles: ArticleListItemDTO[]; pagination: PaginationMeta }`

### Concrete requests for Home

#### Anonymous mode (Newest)
- Tutorials:
  - `GET /api/tutorials?sort=newest&limit=5&page=1&include_completed=false`
- Articles:
  - `GET /api/articles?sort=newest&limit=5&page=1&include_completed=false`

#### Authenticated mode (Recommended for selected level)
Assumes `selectedLevel` is known (e.g., from profile/session).
- Tutorials:
  - `GET /api/tutorials?level=<selectedLevel>&sort=difficulty_asc&limit=5&page=1&include_completed=true`
- Articles:
  - `GET /api/articles?level=<selectedLevel>&sort=difficulty_asc&limit=5&page=1&include_completed=true`

### Fetch implementation details
- Use `fetch()` from the client (React island).
- Treat non-2xx as failure:
  - Try to parse `ApiErrorResponse` and show `error.error.message`.
  - Otherwise show a generic message: “Failed to load tutorials/articles.”
- Use `AbortController` to cancel in-flight requests on unmount and on retry.

### Mapping DTO → VM
- Tutorials (`TutorialListItemDTO`):
  - `difficultyWeight = dto.difficulty_weight`
  - `href = /tutorials/${dto.id}`
  - `isCompleted = mode === "authenticated" ? dto.is_completed : undefined`
- Articles (`ArticleListItemDTO`):
  - `difficultyWeight = dto.difficulty_weight`
  - `href = /articles/${dto.id}`
  - `isCompleted = mode === "authenticated" ? dto.is_completed : undefined`
  - `completedAt = mode === "authenticated" ? dto.completed_at : undefined`
- New badge:
  - `isNew = isCreatedWithinDays(dto.created_at, 7)`

## 8. User Interactions

### Interactions on Home
- **Click a tutorial card** → navigate to `/tutorials/:id`.
- **Click an article card** → navigate to `/articles/:id`.
- **Retry on error**:
  - If strict full-page error: retry triggers both API calls again.
  - If degraded: retry triggers only the failed section.

### What Home must NOT include (MVP)
- No search input.
- No filter chips/tags.
- No “Mark as passed/read” buttons on the Home cards (completion actions belong to detail views).

## 9. Conditions and Validation

### UI-verified conditions (component-level)
- **Query parameter safety** (before fetch):
  - `limit` must be `5` and within `1..100`
  - `page` must be `1` (positive integer)
  - `sort` must be one of `difficulty_asc | newest`
  - `level` must be one of `DifficultyLevel` when present; otherwise omit
  - `include_completed`:
    - anonymous: `false`
    - authenticated: `true`
- **Deterministic ordering**:
  - Rely on the API ordering:
    - `difficulty_asc` → `difficulty_weight asc`, `created_at desc`
    - `newest` → `created_at desc`
  - Do not apply additional client-side sorting on Home (avoids accidental reshuffles).
- **“New” badge rule**:
  - If `created_at` is within the last 7 days (strictly by UTC timestamps), show `NewBadge`.
  - If parsing fails, do not show the badge (fail safe).

### Auth-related conditions
Because current codebase does not yet expose a session/profile endpoint, Home must be resilient:
- If selected level is not available, Home behaves as **anonymous**.
- Once a session source exists, Home switches to authenticated mode only when it can reliably read `selectedLevel`.

## 10. Error Handling

### Expected error scenarios
- **Network error / offline**: `fetch()` rejects.
- **Non-2xx response**:
  - `400 VALIDATION_ERROR` (should not happen if UI validates params)
  - `500 INTERNAL_SERVER_ERROR`
- **Partial failure**:
  - tutorials loaded, articles failed (or vice versa)

### Handling strategy
- **Preferred (clarity-first / strict)**:
  - If either feed fails during initial load, show a single `FullPageError` with “Retry”.
  - Rationale: Home is a “two-panel summary”; partial data can be misleading.
- **Alternative (degraded)**:
  - Render the successful section and show `FullPageError` only inside the failed section.
  - Still keep copy clear (“Tutorials unavailable right now”).

### Error messaging guidelines
- Do not mention personalization for anonymous users.
- Use short, action-oriented errors:
  - “Couldn’t load tutorials. Try again.”
  - “Couldn’t load articles. Try again.”

## 11. Implementation Steps
1. **Replace the starter Home**:
   - Update `src/pages/index.astro` to render the Home view instead of `Welcome.astro`.
2. **Update the layout into an app shell**:
   - Enhance `src/layouts/Layout.astro` to include a navbar and a main container.
3. **Create navigation UI**:
   - Add `src/components/nav/Navbar.(astro|tsx)` with primary links and auth placeholders.
4. **Create Home React island**:
   - Add `src/components/home/HomeView.tsx` and mount it in `index.astro` with `client:load`.
5. **Implement the data hook**:
   - Add `src/components/hooks/useHomeFeeds.ts` that calls `/api/tutorials` and `/api/articles` in parallel and returns `HomeFeedStateVM` + retry functions.
6. **Add shared presentational components**:
   - `src/components/home/HomeSection.tsx`
   - `src/components/shared/SectionHeader.tsx`
   - `src/components/content/ContentCard.tsx`
   - `src/components/content/NewBadge.tsx`
   - `src/components/shared/EmptyState.tsx`
   - `src/components/shared/FullPageError.tsx`
   - `src/components/shared/LoadingState.tsx`
7. **Add view-local types**:
   - Create `src/components/home/home.types.ts` for `HomeViewMode`, `HomeContentItemVM`, `HomeFeedStateVM`, etc.
8. **Wire copy and labels**:
   - Anonymous: label sections “Newest Tutorials” / “Newest Articles”.
   - Authenticated: label sections “Recommended Tutorials” / “Recommended Articles” and include a short note referencing selected level.
9. **Validate and harden edge cases**:
   - Ensure empty arrays show per-section `EmptyState`.
   - Ensure invalid `created_at` doesn’t break rendering (no “New”).
10. **Prepare for future session support** (non-blocking):
   - Keep `HomeView` props-compatible with `selectedLevel` so when profile/session is introduced, Home can switch to authenticated mode without refactor.
