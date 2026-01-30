## View Implementation Plan — Article detail

## 1. Overview
The **Article detail** view provides a structured reading experience for a single article and (when the user is authenticated) a one-click **“Mark as read”** action at the bottom of the page. It must:
- Render article metadata (title, level, difficulty, created date).
- Render the required sections: **summary**, **main content**, **key takeaways**.
- For authenticated users only: show completion state + allow marking as read (**idempotent**, no “unread” in MVP).
- For transient completion failures (429/500/network): show a **toast** and keep the CTA enabled for retry (consistent with the UI plan).

## 2. View Routing
- **Route path**: `/articles/:id`
- **Astro page**: `src/pages/articles/[id].astro` (new)
- **Route param**:
  - `id: string` (expected UUID; invalid values should produce a Not Found-style UI, not a hard crash)

## 3. Component Structure
Recommended structure mirrors the existing tutorial detail implementation (Astro route + React island handling fetch/state):

```text
src/pages/articles/[id].astro
└─ Layout (Astro)
   └─ <main.container>
      └─ ArticleDetailView (React island; client:load)
         ├─ ArticleDetailSkeleton | FullPageError | NotFoundState | Article
         └─ (success) Article (<article>)
            ├─ ContentHeader
            │  ├─ TypeBadge ("Article")
            │  ├─ Title
            │  └─ MetadataRow (level, difficulty, created date)
            ├─ ContentSections
            │  ├─ Section: Summary
            │  ├─ Section: Content
            │  └─ Section: Key takeaways
            └─ CompletionCallToAction (authenticated only; rendered at bottom)
```

## 4. Component Details

### `src/pages/articles/[id].astro` (ArticleDetailPage)
- **Component description**: Route entry for `/articles/:id`. Reads auth context from `Astro.locals` (public route) and mounts the React view.
- **Main elements**:
  - `<Layout title="Article — Cook Mastery">`
  - `<main class="container mx-auto w-full max-w-4xl px-4 py-6">`
  - `<ArticleDetailView client:load ... />`
- **Handled events**: none (Astro page).
- **Validation conditions**:
  - Ensure `id` exists and is a string; pass it to the React component (empty string should lead to Not Found UI).
  - Derive `isAuthenticated` from locals (see Props).
- **Types**: none.
- **Props passed to child**:
  - `articleId: string`
  - `isAuthenticated: boolean` (recommended: `!!Astro.locals.user && !!Astro.locals.profile`)
  - `userSelectedLevel?: DifficultyLevel` (optional; from `Astro.locals.profile?.selected_level`)

---

### `src/components/article-detail/ArticleDetailView.tsx` (ArticleDetailView)
- **Component description**: Top-level client component responsible for:
  - fetching article detail (`GET /api/articles/:id`)
  - switching between loading/error/not-found/success UI states
  - orchestrating completion action (delegated to `CompletionCallToAction`)
- **Main elements**:
  - Root wrapper: `<section aria-labelledby={headingId}>`
  - Conditional UI:
    - `ArticleDetailSkeleton` while loading
    - `FullPageError` for fetch failures (5xx/network/unknown)
    - `NotFoundState` for 404 (and 400 invalid UUID treated as not found)
    - `<article className="space-y-8">` content (success)
- **Handled events**:
  - On mount → trigger fetch via `useArticleDetail({ articleId, isAuthenticated })`
  - Retry button click (from `FullPageError`) → `retry()`
  - Completion action callback: `onCompleted(nextCompletedAt)`
- **Validation conditions (API-aligned)**:
  - **Route param**: if `articleId` is not a UUID (client-side check), skip fetch and show `NotFoundState`.
    - This avoids a guaranteed `400` from the API route (`z.string().uuid()` in `src/pages/api/articles/[id].ts`).
  - **Completion UI**:
    - Render completion UI only if `isAuthenticated === true`.
    - If `article.is_completed === true`, show “Read” state and do not show any “unread” control.
- **Types (DTO + VM)**:
  - DTOs: `GetArticleDetailResponseDTO`, `ApiErrorResponse`
  - VMs: `ArticleDetailVM`, `ArticleDetailErrorVM`
- **Props** (`src/components/article-detail/article-detail.types.ts`):
  - `articleId: string`
  - `isAuthenticated: boolean`
  - `userSelectedLevel?: DifficultyLevel`

---

### `src/components/article-detail/ContentHeader.tsx` (ContentHeader)
- **Component description**: Renders the header section: type badge (“Article”), title, and metadata row.
- **Main elements**:
  - `<header className="space-y-4">`
  - Type badge: `<span className="...rounded-full...">Article</span>` (match tutorial badge styling for consistency)
  - `<h1>` title
  - Metadata row: `<dl>` with level/difficulty/created date
- **Handled events**: none.
- **Validation conditions**:
  - Must render safely if any field is empty, but DTO is expected complete per PRD.
- **Types**:
  - Uses `ArticleHeaderVM` (from `ArticleDetailVM.header`)
- **Props**:
  - `header: ArticleHeaderVM`
  - `headingId?: string` (optional, to connect section heading for a11y)

---

### `src/components/article-detail/ContentSections.tsx` (ContentSections)
- **Component description**: Renders structured article sections in the required order:
  1. Summary
  2. Content
  3. Key takeaways
- **Main elements**:
  - `<div className="space-y-8">`
  - Each section:
    - `<section aria-labelledby="...">`
    - `<h2>` section title
    - `<p className="whitespace-pre-wrap">` for plain text blocks
  - Key takeaways can be visually highlighted (match tutorial’s takeaways callout styling):
    - `<section className="...border border-primary/20 bg-primary/5 p-6...">`
- **Handled events**: none.
- **Validation conditions**:
  - Preserve newlines from database text fields using `whitespace-pre-wrap`.
- **Types**:
  - Uses `ArticleSectionsVM`
- **Props**:
  - `sections: ArticleSectionsVM`

---

### `src/components/article-detail/CompletionCallToAction.tsx` (CompletionCallToAction)
- **Component description**: Authenticated-only interactive component to mark the article as read. Implements idempotent behavior in UI (once completed, stays disabled; no “unread”).
- **Main elements** (reuse patterns from tutorial CTA):
  - Wrapper `<section aria-label="Completion" className="...border border-border bg-card p-6...">` at the bottom
  - Status callout:
    - If completed: success row (“Read”) + optional completed date
    - If not completed: explanatory text
  - Primary button:
    - `<Button onClick={handleMarkRead} disabled={isSubmitting || isCompleted}>`
  - Inline error message area:
    - `<div role="alert" className="...border-destructive/20 bg-destructive/10...">...</div>`
- **Handled events**:
  - Click “Mark as read” → `POST /api/articles/:id/complete`
- **Validation conditions (API-aligned)**:
  - Only enable button when:
    - `isAuthenticated === true`
    - `articleId` is valid UUID (defensive; should already be validated in parent/hook)
    - `isCompleted === false`
    - not currently submitting
  - If `isCompleted === true`:
    - do not allow mutation
    - do not render any UI that implies “undo”
- **Types (DTO + VM)**:
  - DTOs: `CompleteArticleResponseDTO`, `ApiErrorResponse`
  - VM: `CompletionCTAStateVM`
- **Props**:
  - `articleId: string`
  - `isCompleted: boolean`
  - `completedAt: string | null`
  - `onCompleted: (completedAt: string) => void` (update parent state immediately)
- **Toast behavior**:
  - On success: `toast.success("Marked as read")`
  - On 429/500/network: `toast.error(message)` and keep button enabled

---

### `src/components/article-detail/ArticleDetailSkeleton.tsx` (ArticleDetailSkeleton)
- **Component description**: Loading skeleton for the detail view that approximates header + 3 sections layout.
- **Main elements**:
  - A few skeleton blocks (title, metadata row, section headings, paragraphs)
- **Handled events**: none.
- **Validation conditions**: none.
- **Types**: none.
- **Props**: none.

## 5. Types

### Existing DTOs (from `src/types.ts`)
- **Article detail fetch**:
  - `GetArticleDetailResponseDTO` (alias of `ArticleDetailDTO`)
  - `ArticleDetailDTO` fields:
    - `id: string`
    - `title: string`
    - `level: DifficultyLevel`
    - `difficulty_weight: number`
    - `summary: string`
    - `content: string`
    - `key_takeaways: string`
    - `created_at: string`
    - `updated_at: string`
    - `is_completed: boolean`
    - `completed_at: string | null`
- **Article completion**:
  - `CompleteArticleResponseDTO` fields:
    - `article_id: string`
    - `user_id: string`
    - `completed_at: string`
    - `status: 'created' | 'already_completed'`
- **Errors**:
  - `ApiErrorResponse`

### New ViewModel types (recommended)
Create `src/components/article-detail/article-detail.types.ts`:

- **`ArticleDetailVM`**
  - `id: string`
  - `header: ArticleHeaderVM`
  - `sections: ArticleSectionsVM`
  - `completion?: ArticleCompletionVM` (only present when authenticated)

- **`ArticleHeaderVM`**
  - `title: string`
  - `levelLabel: string` (e.g. “Beginner”)
  - `difficultyLabel: string` (e.g. “Difficulty 3/5”)
  - `createdAtLabel: string` (localized date)

- **`ArticleSectionsVM`**
  - `summary: string`
  - `content: string`
  - `keyTakeaways: string`

- **`ArticleCompletionVM`**
  - `isCompleted: boolean`
  - `completedAt: string | null`

- **`ArticleDetailErrorVM`**
  - `kind: 'http' | 'network'`
  - `status?: number`
  - `message: string`
  - `api?: ApiErrorResponse`

- **`CompletionCTAStateVM`**
  - `isSubmitting: boolean`
  - `error: string | null`

- **Component props types**
  - `ArticleDetailViewProps`:
    - `articleId: string`
    - `isAuthenticated: boolean`
    - `userSelectedLevel?: DifficultyLevel`
  - `ContentHeaderProps`: `header: ArticleHeaderVM`
  - `ContentSectionsProps`: `sections: ArticleSectionsVM`
  - `CompletionCallToActionProps`:
    - `articleId: string`
    - `isCompleted: boolean`
    - `completedAt: string | null`
    - `onCompleted: (completedAt: string) => void`

### DTO → VM mapping
Implement mapping in the data hook (or a small mapper function):
- `difficulty_weight → difficultyLabel` using the shared pattern: `Difficulty ${weight}/5`
- `created_at → createdAtLabel` using `toLocaleDateString`
- `is_completed/completed_at` mapped only when `isAuthenticated === true`

## 6. State Management
Use local state + a custom hook, matching the existing tutorial detail approach.

### Custom hook: `useArticleDetail({ articleId, isAuthenticated })`
- **State**:
  - `data: ArticleDetailVM | null`
  - `isLoading: boolean`
  - `error: ArticleDetailErrorVM | null`
  - `isNotFound: boolean`
- **Actions**:
  - `retry(): void`
- **Implementation notes**:
  - Use `AbortController` and abort on unmount.
  - Pre-validate UUID (client-side) and short-circuit into `isNotFound` without calling the API.
  - Treat `400` and `404` as `isNotFound` (consistent with the UUID validation and API behavior).

### Local completion state in `ArticleDetailView`
Keep completion in parent for immediate UI update after successful mutation:
- `localCompletion: { isCompleted: boolean; completedAt: string | null } | null`
- `currentCompletion = localCompletion ?? data?.completion`
- On success from CTA: `setLocalCompletion({ isCompleted: true, completedAt })`

## 7. API Integration

### 7.1 Fetch article detail
- **Request**: `GET /api/articles/:id`
  - Cookies are included automatically; anonymous users still get public data.
- **Success (200)**: body is `GetArticleDetailResponseDTO`
- **Errors**:
  - `400 VALIDATION_ERROR` (invalid UUID) → treat as Not Found UI
  - `404 NOT_FOUND` → Not Found UI
  - `500 INTERNAL_SERVER_ERROR` / network → Full page error with retry

**Frontend action**:
- `fetch(`/api/articles/${articleId}`)`
- If `response.ok`: parse DTO and map to `ArticleDetailVM`
- Else: parse `ApiErrorResponse` when possible

### 7.2 Mark article as read (completion)
- **Request**: `POST /api/articles/:id/complete`
  - No request body required (id is in path). Follow the tutorial completion pattern.
- **Success**:
  - `201 Created` or `200 OK` (idempotent) with `CompleteArticleResponseDTO`
- **Errors**:
  - `401 UNAUTHORIZED` → redirect to `/login`
  - `404 NOT_FOUND` → show CTA inline error (“This article no longer exists.”)
  - `429 RATE_LIMIT_EXCEEDED` → CTA inline error + toast; keep button enabled
  - `500` / network → CTA inline error + toast; keep button enabled

**Backend dependency note (important)**:
- The view requires `POST /api/articles/:id/complete` to exist and to follow idempotent semantics (API plan: 200 if already completed, 201 if created).
- If it’s not implemented yet, implement it with the same structure as `src/pages/api/tutorials/[id]/complete.ts`, returning `CompleteArticleResponseDTO`.

## 8. User Interactions
- **Open article detail**:
  - User clicks an article card (`href: /articles/:id`) → navigates to detail page and loads content.
- **Read content**:
  - User scrolls through sections; line breaks are preserved in text fields.
- **Mark as read (authenticated only)**:
  - Click button → disable while pending, show “Marking...”
  - On success (200/201) → show “Read” state, keep button disabled permanently (MVP “no unread”)
  - On 401 → redirect to `/login`
  - On 429/500/network → show toast + inline error, keep button enabled for retry
- **Retry on fetch error**:
  - Clicking “Try again” in `FullPageError` triggers `retry()`

## 9. Conditions and Validation
Conditions to verify and how they affect UI:
- **Article ID validity (UUID)**:
  - Verified in `useArticleDetail` (or in `ArticleDetailView` before calling the hook).
  - If invalid: render `NotFoundState` immediately.
- **Not found (404 or 400 invalid UUID)**:
  - Render `NotFoundState` with navigation back to `/learning`.
- **Authenticated-only completion UI**:
  - Condition: `isAuthenticated === true`
  - Effect: if false, do not render completion state nor CTA (even if API returns `is_completed: false`).
- **No “unread” in MVP**:
  - Condition: `isCompleted === true`
  - Effect: disable button and show completed status; do not render any additional control.

## 10. Error Handling
- **GET `/api/articles/:id`**
  - Network error / fetch throws: show `FullPageError` message “Couldn't load article. Check your connection.”
  - 500: show `FullPageError` with backend message if available, else generic.
  - 400 invalid UUID: show `NotFoundState`.
  - 404: show `NotFoundState`.
- **POST `/api/articles/:id/complete`**
  - 401: redirect to `/login`.
  - 429: show inline CTA error + toast; keep button enabled.
  - 500/network: show inline CTA error + toast; keep button enabled.
  - Other non-OK: attempt to parse `ApiErrorResponse`; fall back to a generic CTA error message.

## 11. Implementation Steps
1. **Create the route page**:
   - Add `src/pages/articles/[id].astro` mirroring `src/pages/tutorials/[id].astro`:
     - read `Astro.locals.user` and `Astro.locals.profile`
     - compute `isAuthenticated`
     - pass `articleId` from `Astro.params.id ?? ""`
     - mount `<ArticleDetailView client:load ... />`
2. **Add the article detail component folder**:
   - Create `src/components/article-detail/` with:
     - `ArticleDetailView.tsx`
     - `ArticleDetailSkeleton.tsx`
     - `ContentHeader.tsx`
     - `ContentSections.tsx`
     - `CompletionCallToAction.tsx`
     - `useArticleDetail.ts`
     - `article-detail.types.ts`
3. **Implement shared formatting helpers**:
   - In `article-detail.types.ts`, add:
     - `isUuid(value: string): boolean` (copy existing regex)
     - `formatLevel(level: string): string`
     - `formatDifficultyLabel(weight: number): string`
     - `formatCreatedAtLabel(isoDate: string): string`
4. **Implement `useArticleDetail`**:
   - Pre-validate UUID → set `isNotFound` if invalid.
   - Fetch `GET /api/articles/:id`
   - Treat `400/404` as `isNotFound`.
   - Map DTO → VM and expose `retry()`.
5. **Implement `ArticleDetailView` state switching**:
   - loading → skeleton
   - not found → `NotFoundState` (“Article not found”)
   - error → `FullPageError` + retry
   - success → render `ContentHeader`, `ContentSections`, CTA (auth only)
6. **Implement completion CTA**:
   - Call `POST /api/articles/:id/complete`
   - Handle 401 redirect, idempotent success (200/201), and transient errors with toast + retryable UI
   - On success, call `onCompleted(completedAt)` to update parent completion state
7. **Ensure backend completion endpoint exists**:
   - If missing, add `src/pages/api/articles/[id]/complete.ts` and a corresponding service function (mirroring tutorial completion behavior) returning `CompleteArticleResponseDTO`.
8. **Manual test checklist**:
   - `/articles/not-a-uuid` → NotFoundState
   - Valid id, anonymous → content shows, no completion UI
   - Valid id, authenticated + not completed → CTA enabled; click marks read; UI updates and disables
   - Refresh after completion → shows read state
   - Non-existent uuid → NotFoundState
   - Simulate 500/network on GET → FullPageError retry works
   - Simulate 429/500 on POST → toast + CTA stays retryable
