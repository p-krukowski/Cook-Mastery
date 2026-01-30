## View Implementation Plan — Tutorial detail

## 1. Overview
The **Tutorial detail** view provides a structured, readable page for a single tutorial, and (when the user is authenticated) a one-click **“Mark as passed”** action. It must:
- Render tutorial metadata (title, category, level, difficulty, created date).
- Render all tutorial sections: **summary**, **main content**, **steps/sections**, **practice recommendations**, **key takeaways**.
- For authenticated users only: show completion state + allow marking as passed (idempotent, no “unpass” in MVP).
- For transient completion failures (429/500/network) show a **toast** (and keep the CTA enabled for retry), per the UI plan.

## 2. View Routing
- **Route path**: `/tutorials/:id`
- **Astro page**: `src/pages/tutorials/[id].astro` (new)
- **Route param**:
  - `id: string` (expected UUID; invalid values should lead to Not Found-like UI)

## 3. Component Structure
Recommended structure (Astro route + React island that does data fetching + shared states):

```text
src/pages/tutorials/[id].astro
└─ Layout (Astro)
   ├─ ToastHost (React island; client:load) (recommended, if not already present globally)
   └─ <main.container>
      └─ TutorialDetailView (React island; client:load)
         ├─ TutorialDetailSkeleton | FullPageError | NotFoundState | TutorialArticle
         └─ (success) TutorialArticle (<article>)
            ├─ ContentHeader
            │  ├─ TypeBadge ("Tutorial")
            │  ├─ Title
            │  └─ MetadataRow (level, difficulty, category, created date)
            ├─ ContentSections
            │  ├─ Section: Summary
            │  ├─ Section: Content
            │  ├─ Section: Steps (ordered list)
            │  ├─ Section: Practice recommendations
            │  └─ Section: Key takeaways
            └─ CompletionCallToAction (authenticated only)
```

## 4. Component Details

### `src/pages/tutorials/[id].astro` (TutorialDetailPage)
- **Component description**: Route entry for `/tutorials/:id`. Determines auth context from `Astro.locals` (public route) and mounts the React view.
- **Main elements**:
  - `<Layout title="Tutorial — Cook Mastery">`
  - `<main class="container mx-auto w-full max-w-4xl px-4 py-6">`
  - `<TutorialDetailView client:load ... />`
- **Handled events**: none (Astro page).
- **Handled validation**:
  - Ensure `id` exists and is a string; pass it to the React component.
  - Derive auth flags from locals (see Props).
- **Types**: none.
- **Props passed to child**:
  - `tutorialId: string`
  - `isAuthenticated: boolean` (recommended: `!!Astro.locals.user`)
  - `userSelectedLevel?: DifficultyLevel` (optional; `Astro.locals.profile?.selected_level`)

**Proposed prop usage in page (shape only)**:
- `const isAuthenticated = !!Astro.locals.user;`
- `const userSelectedLevel = Astro.locals.profile?.selected_level;`

---

### `src/components/tutorial-detail/TutorialDetailView.tsx` (TutorialDetailView)
- **Component description**: Top-level client component responsible for:
  - fetching tutorial detail (`GET /api/tutorials/:id`)
  - switching between loading/error/not-found/success UI states
  - orchestrating completion action (delegated to `CompletionCallToAction`)
- **Main elements**:
  - Root wrapper: `<section aria-labelledby={headingId}>`
  - Conditional UI:
    - `TutorialDetailSkeleton` while loading (or reuse `LoadingState` with count=1 + custom skeleton)
    - `FullPageError` for fetch failures (5xx/network/unknown)
    - `NotFoundState` for 404 (and 400 invalid UUID treated as not found)
    - `<article className="prose-like...">` content (success)
- **Handled events**:
  - On mount → trigger fetch via `useTutorialDetail(tutorialId)`
  - Retry button click (from `FullPageError`) → `retry()`
  - Completion action callback: `onCompleted(nextCompletedAt)`
- **Validation conditions (API-aligned)**:
  - **Route param**: if `tutorialId` is not a UUID (client-side check), skip fetch and show `NotFoundState`.
    - This avoids a guaranteed `400 VALIDATION_ERROR` from the API route (`z.string().uuid()` in `src/pages/api/tutorials/[id].ts`).
  - **DTO invariants**:
    - `difficulty_weight` should be displayed as `1..5` (do not clamp; assume backend correctness).
    - `steps` should be rendered in a stable order: sort by `order` ascending before rendering.
  - **Completion UI**:
    - Render completion UI only if `isAuthenticated === true` (to avoid leaking per-user semantics).
    - If `tutorial.is_completed === true`, show passed state and do not show any “unpass” control.
- **Types (DTO + VM)**:
  - DTOs: `GetTutorialDetailResponseDTO`, `ApiErrorResponse`
  - VMs: `TutorialDetailVM`, `TutorialDetailErrorVM`
- **Props**:
  - `tutorialId: string`
  - `isAuthenticated: boolean`
  - `userSelectedLevel?: DifficultyLevel`

---

### `src/components/tutorial-detail/ContentHeader.tsx` (ContentHeader)
- **Component description**: Renders the header section: type badge (“Tutorial”), title, and metadata row.
- **Main elements**:
  - `<header>`
  - Type badge: `<span className="...rounded-full...">Tutorial</span>` (match `ContentCard` badge styles)
  - `<h1>` title
  - Metadata row: `<dl>` or `<div>` with level/difficulty/category/created date
- **Handled events**: none.
- **Validation conditions**:
  - Must handle unknown/empty strings defensively (render `—` if needed), but DTO should be complete per PRD.
- **Types**:
  - Uses `TutorialHeaderVM` (from `TutorialDetailVM.header`)
- **Props**:
  - `header: TutorialHeaderVM`

---

### `src/components/tutorial-detail/ContentSections.tsx` (ContentSections)
- **Component description**: Renders structured tutorial sections in the required order:
  1. Summary
  2. Content
  3. Steps/sections
  4. Practice recommendations
  5. Key takeaways
- **Main elements**:
  - `<div className="space-y-8">`
  - Each section:
    - `<section aria-labelledby="...">`
    - `<h2>` section title
    - `<p className="whitespace-pre-wrap">` for plain text blocks
  - Steps section:
    - `<ol className="space-y-4">`
    - Each step:
      - `<li>`
      - `<h3>` step title (or `<p className="font-semibold">`)
      - `<div className="whitespace-pre-wrap">` step content
- **Handled events**: none.
- **Validation conditions**:
  - Steps array may be empty; in that case render a short empty message or omit the entire Steps section (pick one approach and keep it consistent).
  - Preserve newlines from database text fields using `whitespace-pre-wrap`.
- **Types**:
  - Uses `TutorialSectionsVM`
- **Props**:
  - `sections: TutorialSectionsVM`

---

### `src/components/tutorial-detail/CompletionCallToAction.tsx` (CompletionCallToAction)
- **Component description**: Authenticated-only interactive component to mark the tutorial as passed. Implements idempotent behavior in the UI: once completed, button stays disabled and no “unpass” is shown.
- **Main elements**:
  - Wrapper `<section aria-label="Completion">` at the bottom of the tutorial
  - Status callout:
    - If completed: green success row (“Passed”) + optional completed date
    - If not completed: explanatory text
  - Primary button:
    - `<Button onClick={handleMarkPassed} disabled={isSubmitting || isCompleted}>`
  - Inline error message area (consistent with auth forms):
    - `<div role="alert" className="...bg-destructive/10...">...</div>`
- **Handled events**:
  - Click “Mark as passed” → `POST /api/tutorials/:id/complete`
- **Validation conditions (API-aligned)**:
  - Only enable button when:
    - `isAuthenticated === true`
    - `tutorialId` is valid UUID
    - `isCompleted === false`
    - not currently submitting
  - If `tutorial.is_completed === true`:
    - do not allow mutation
    - do not render any UI that implies “undo”
- **Types (DTO + VM)**:
  - DTOs: `CompleteTutorialResponseDTO`, `ApiErrorResponse`
  - VM: `CompletionCTAStateVM`
- **Props**:
  - `tutorialId: string`
  - `isCompleted: boolean`
  - `completedAt: string | null`
  - `onCompleted: (completedAt: string) => void` (used to update parent state)

- **Toast behavior (UI plan requirement)**:
  - On success: show toast “Marked as passed” (optional but recommended).
  - On 429/500/network: show toast with a short retry message, and keep the button enabled.

**Backend dependency note**:
- This view expects `POST /api/tutorials/:id/complete` to exist and follow the idempotent semantics from the API plan.
- If the endpoint is not yet implemented, the CTA should be hidden or replaced with a non-interactive note until available.

---

### `src/components/shared/NotFoundState.tsx` (NotFoundState) (optional new shared component)
- **Component description**: Standardized not-found UI for detail pages.
- **Main elements**:
  - `<div role="status" className="...">`
  - Title: “Tutorial not found”
  - Description and link back to `/learning`
- **Handled events**: navigation link click.
- **Validation conditions**: none.
- **Types**: none.
- **Props**:
  - `title: string`
  - `description?: string`
  - `backHref?: string` (default `/learning`)

---

### `src/components/shared/ToastHost.tsx` (ToastHost) (recommended new shared component, if the app has no toasts yet)
- **Component description**: Provides a single global toast container so views can trigger toasts for transient errors and mutation success states.
- **Main elements**:
  - A shadcn-compatible toast system (recommended: `sonner` + shadcn `Toaster` wrapper) mounted once.
- **Handled events**: none.
- **Validation conditions**: none.
- **Types**: none.
- **Props**: none.

## 5. Types

### Existing DTOs (from `src/types.ts`)
- **Tutorial detail fetch**:
  - `GetTutorialDetailResponseDTO` (alias of `TutorialDetailDTO`)
  - `TutorialDetailDTO` fields:
    - `id: string`
    - `title: string`
    - `category: TutorialCategory`
    - `level: DifficultyLevel`
    - `difficulty_weight: number`
    - `summary: string`
    - `content: string`
    - `steps: TutorialStep[]`
    - `practice_recommendations: string`
    - `key_takeaways: string`
    - `created_at: string`
    - `updated_at: string`
    - `is_completed: boolean`
    - `completed_at: string | null`
- **Tutorial completion**:
  - `CompleteTutorialResponseDTO` fields:
    - `tutorial_id: string`
    - `user_id: string`
    - `completed_at: string`
    - `status: 'created' | 'already_completed'`
- **Errors**:
  - `ApiErrorResponse`

### New ViewModel types (recommended)
Create `src/components/tutorial-detail/tutorial-detail.types.ts`:

- **`TutorialDetailVM`**
  - `id: string`
  - `header: TutorialHeaderVM`
  - `sections: TutorialSectionsVM`
  - `completion?: TutorialCompletionVM` (only set/used when authenticated)

- **`TutorialHeaderVM`**
  - `title: string`
  - `categoryLabel: string` (e.g. “Practical”)
  - `levelLabel: string` (e.g. “Beginner”)
  - `difficultyLabel: string` (e.g. “Difficulty 2/5”)
  - `createdAtLabel: string` (localized date)

- **`TutorialSectionsVM`**
  - `summary: string`
  - `content: string`
  - `steps: TutorialStepVM[]`
  - `practiceRecommendations: string`
  - `keyTakeaways: string`

- **`TutorialStepVM`**
  - `order: number`
  - `title: string`
  - `content: string`

- **`TutorialCompletionVM`**
  - `isCompleted: boolean`
  - `completedAt: string | null`

- **`TutorialDetailErrorVM`** (match existing hook patterns)
  - `kind: 'http' | 'network'`
  - `status?: number` (for http)
  - `message: string`
  - `api?: ApiErrorResponse`

- **`CompletionCTAStateVM`**
  - `isSubmitting: boolean`
  - `error: string | null` (user-facing message for the CTA)

### Mapping DTO → VM
In the detail hook (or a dedicated mapper), map:
- `difficulty_weight → difficultyLabel`
- `created_at → createdAtLabel` using `toLocaleDateString`
- `steps → sort by order asc → TutorialStepVM[]`
- `is_completed/completed_at` into `TutorialCompletionVM` only if `isAuthenticated`

## 6. State Management
Use local state + a custom hook, following existing `useHomeFeeds` / `useLearningFeed` patterns:

- **Hook**: `useTutorialDetail({ tutorialId, isAuthenticated })`
  - State:
    - `data: TutorialDetailVM | null`
    - `isLoading: boolean`
    - `error: TutorialDetailErrorVM | null`
  - Actions:
    - `retry(): void` (re-fetch)
  - Implementation notes:
    - Use `AbortController` and abort on unmount.
    - Pre-validate UUID (client-side) and short-circuit into not-found UI state.
    - Parse API errors with the same pattern used in other hooks (`ApiErrorResponse` parsing).

- **Completion state**:
  - Keep completion as part of the parent VM so the CTA can update the “passed” UI immediately after success:
    - On success: set `completion.isCompleted = true`, `completion.completedAt = response.completed_at`.
  - CTA local state:
    - `isSubmitting`, `error` (CTA-only error message)

## 7. API Integration

### 7.1 Fetch tutorial detail
- **Request**: `GET /api/tutorials/:id`
  - Headers: none required (cookies automatically included in browser fetch).
- **Success (200)**: body is `GetTutorialDetailResponseDTO`
- **Errors**:
  - `400 VALIDATION_ERROR` (invalid UUID) → treat as NotFound UI
  - `404 NOT_FOUND` → NotFound UI
  - `500 INTERNAL_SERVER_ERROR` / network → FullPageError with retry

**Frontend action**:
- `fetch(`/api/tutorials/${tutorialId}`)`
- If `response.ok`:
  - `const dto = (await response.json()) as GetTutorialDetailResponseDTO`
  - map to `TutorialDetailVM`
- Else:
  - parse `ApiErrorResponse` and set `error` state

### 7.2 Mark tutorial as passed (completion)
- **Request**: `POST /api/tutorials/:id/complete`
  - Body: none required (id is in path) unless backend expects `CompleteTutorialCommand` (`{ tutorial_id }`). Prefer **no body** and let backend use the path param; if backend requires body, send `{ tutorial_id: id }` and document this in the endpoint.
  - Headers: `Content-Type: application/json` only if sending a JSON body.
- **Success**:
  - `201 Created` or `200 OK` (idempotent) with `CompleteTutorialResponseDTO`
- **Errors**:
  - `401 UNAUTHORIZED` → `window.location.href = '/login'`
  - `404 NOT_FOUND` → show CTA error (“This tutorial no longer exists.”) and optionally navigate back
  - `429 RATE_LIMIT_EXCEEDED` → CTA error + **toast**, keep button enabled
  - `500` / network → CTA error + **toast**, keep button enabled

## 8. User Interactions
- **Open tutorial**:
  - User clicks a tutorial card (`href: /tutorials/:id`) → navigates to tutorial detail page.
- **Read content**:
  - User scrolls through sections; content is presented with clear headings and preserved line breaks.
- **Mark as passed (authenticated only)**:
  - Click button → show loading label (“Marking…”) and disable button while pending.
  - On success (200/201) → show “Passed” state and keep button disabled.
  - Clicking again is not possible in UI; if it happens due to stale UI, backend is idempotent and UI still ends in “Passed”.
- **Retry on fetch error**:
  - Clicking “Try again” in `FullPageError` triggers `retry()`.

## 9. Conditions and Validation
Conditions to verify and how they affect UI:

- **Tutorial ID validity (UUID)**:
  - Verified in `TutorialDetailView` (or hook) before fetching.
  - If invalid: render `NotFoundState` immediately.
- **Not found (404)**:
  - Render `NotFoundState` with link to `/learning`.
- **Authenticated-only completion UI**:
  - Condition: `isAuthenticated === true`
  - If false: do not render completion state nor CTA button.
- **No “unpass” in MVP**:
  - Condition: `tutorial.is_completed === true`
  - Effect: button disabled/replaced by success state; no other controls.
- **Steps ordering**:
  - Condition: steps may arrive out of order
  - Effect: sort by `order asc` before rendering.

## 10. Error Handling
- **GET `/api/tutorials/:id`**
  - Network error / fetch throws: show `FullPageError` with message “Couldn't load tutorial. Check your connection.”
  - 500: show `FullPageError` with backend message if available, else generic.
  - 400 invalid UUID: show `NotFoundState` (not “Something went wrong”).
  - 404: show `NotFoundState`.
- **POST `/api/tutorials/:id/complete`**
  - 401: redirect to `/login` (session expired or user not authenticated).
  - 429: show inline CTA error + **toast**; keep button enabled for retry.
  - 500/network: show inline CTA error + **toast**; keep button enabled for retry.
  - Any non-OK response: parse `ApiErrorResponse` when possible; fall back to generic message.

## 11. Implementation Steps
0. **(If missing) add a toast system** (recommended to satisfy the UI plan):
   - Add shadcn toast infrastructure (recommended: `sonner`) and a `ToastHost` mounted in `Layout.astro` so any view can show toasts.
   - Keep toasts as enhancement; still render inline error text for accessibility.
1. **Create the route page**: add `src/pages/tutorials/[id].astro` using `Layout.astro`, add container classes, read `Astro.locals` auth, and mount `<TutorialDetailView client:load ... />`.
2. **Add new tutorial detail folder**: create `src/components/tutorial-detail/` and add:
   - `TutorialDetailView.tsx`
   - `tutorial-detail.types.ts`
   - `useTutorialDetail.ts`
   - `ContentHeader.tsx`
   - `ContentSections.tsx`
   - `CompletionCallToAction.tsx`
3. **Implement UUID pre-validation**: add a small `isUuid(v: string): boolean` helper (regex) in the hook or `tutorial-detail.types.ts` utilities; treat invalid IDs as not found.
4. **Implement `useTutorialDetail`**:
   - Fetch `GET /api/tutorials/:id`
   - Parse `ApiErrorResponse` for non-OK
   - Map DTO → VM
   - Provide `retry` and handle abort on unmount
5. **Implement view state switching in `TutorialDetailView`**:
   - loading → skeleton
   - error → `FullPageError`
   - not found → `NotFoundState`
   - success → render `<article>` with `ContentHeader`, `ContentSections`, and CTA (auth only)
6. **Implement completion CTA**:
   - Add `POST /api/tutorials/:id/complete` call integration (assuming endpoint exists).
   - Handle 401 redirect, idempotent success, and inline error messages.
   - Update parent completion state via `onCompleted`.
7. **(If missing) coordinate/implement backend endpoint**:
   - Ensure `POST /api/tutorials/:id/complete` exists and returns `CompleteTutorialResponseDTO` with idempotent 200/201.
8. **Manual test checklist**:
   - Invalid id (`/tutorials/not-a-uuid`) → NotFoundState
   - Valid id, anonymous → content shows, no completion UI
   - Valid id, authenticated + not completed → CTA enabled; click marks passed; UI updates and disables
   - Re-click/refresh after completion → shows passed state
   - Non-existent uuid → NotFoundState
   - Simulate 500/network → FullPageError retry works
