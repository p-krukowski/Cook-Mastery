## View Implementation Plan — Cookbook (List / Create / Detail + Edit)

## 1. Overview
The **Cookbook** feature provides authenticated users with a private space to save and manage recipe links found on the internet. It consists of three protected views:
- **Cookbook list** (`/cookbook`): browse saved entries (title, URL, notes preview, created date) and navigate to create or detail.
- **Cookbook create** (`/cookbook/new`): create a new entry with URL + title (required) and notes (optional, multi-line).
- **Cookbook detail + edit mode** (`/cookbook/:id`): view an entry, toggle into edit mode, update fields, or delete the entry.

Key requirements (PRD + user stories + UI plan):
- **Auth required** for all cookbook routes and API calls.
- **Data isolation**: users must not access other users’ cookbook entries (UI must not leak existence).
- **Validation**:
  - Create: URL required and valid URL; title required (non-empty); notes optional.
  - Update: any subset of URL/title/notes may be updated, but at least one field must be provided; URL must be valid if provided; title must be non-empty if provided.
- **Long notes support**: multi-line, very long notes must wrap or be scrollable and must not break layout.
- **UX**:
  - On `401` → redirect to `/login`.
  - On empty list → friendly empty state encouraging first entry creation.
  - On create/update/delete success → show toast and navigate appropriately.

## 2. View Routing
These routes must exist as **Astro pages** and mount **React view components** as client islands:
- **Cookbook list**: `/cookbook`
  - Astro page: `src/pages/cookbook/index.astro` (new)
- **Cookbook create**: `/cookbook/new`
  - Astro page: `src/pages/cookbook/new.astro` (new)
- **Cookbook entry detail**: `/cookbook/:id`
  - Astro page: `src/pages/cookbook/[id].astro` (new)

Protection strategy:
- App middleware already protects `/cookbook` and `/cookbook/*` and redirects unauthenticated users to `/login` (`src/middleware/index.ts`).
- Each Astro page should still include a **defensive redirect** (same pattern as `src/pages/profile.astro`) in case locals are missing.

## 3. Component Structure
Recommended structure mirrors existing pages (e.g., `LearningView`, `TutorialDetailView`, `ArticleDetailView`):

```text
src/pages/cookbook/index.astro
└─ Layout (Astro)
   └─ <main.container>
      └─ CookbookListView (React island; client:load)
         ├─ HeaderRow (title + description + "New entry" button)
         ├─ SortControls (optional)
         └─ ListArea
            ├─ LoadingState | FullPageError | EmptyState | EntriesGrid
            └─ PaginationControls

src/pages/cookbook/new.astro
└─ Layout (Astro)
   └─ <main.container>
      └─ CookbookCreateView (React island; client:load)
         ├─ HeaderRow (title + back link)
         └─ CookbookEntryForm
            ├─ URL input
            ├─ Title input
            ├─ Notes textarea
            ├─ InlineFieldError per field + general error
            └─ Submit button

src/pages/cookbook/[id].astro
└─ Layout (Astro)
   └─ <main.container>
      └─ CookbookEntryView (React island; client:load)
         ├─ LoadingState | FullPageError | NotFoundState | EntryDetail
         └─ EntryDetail (success)
            ├─ HeaderRow (title + external link + actions)
            ├─ ViewMode (read-only fields)
            └─ EditMode (CookbookEntryForm + Save/Cancel)
               └─ Delete action (confirm)
```

## 4. Component Details

### `src/pages/cookbook/index.astro` (CookbookListPage)
- **Component description**: Protected route entry for `/cookbook`. Reads auth context from `Astro.locals` and mounts the list React view.
- **Main elements**:
  - `<Layout title="Cookbook — Cook Mastery">`
  - `<main class="container mx-auto w-full max-w-6xl px-4 py-6">`
  - `<CookbookListView client:load ... />`
- **Handled events**: none (Astro page).
- **Validation conditions**:
  - If `!Astro.locals.user || !Astro.locals.profile` → `return Astro.redirect('/login')`.
- **Types**: none.
- **Props passed to child**:
  - `isAuthenticated: boolean` (should be `true` on this route, but keep as explicit prop)
  - `defaultSort?: CookbookSort` (optional; default `"newest"`)
  - `defaultLimit?: number` (optional; default `20`)

---

### `src/pages/cookbook/new.astro` (CookbookCreatePage)
- **Component description**: Protected route entry for `/cookbook/new`. Mounts create view.
- **Main elements**:
  - `<Layout title="New cookbook entry — Cook Mastery">`
  - `<main class="container mx-auto w-full max-w-3xl px-4 py-6">`
  - `<CookbookCreateView client:load ... />`
- **Handled events**: none.
- **Validation conditions**:
  - If unauthenticated → redirect to `/login`.
- **Types**: none.
- **Props passed to child**:
  - `isAuthenticated: boolean`

---

### `src/pages/cookbook/[id].astro` (CookbookEntryPage)
- **Component description**: Protected route entry for `/cookbook/:id`. Mounts detail/edit view.
- **Main elements**:
  - `<Layout title="Cookbook entry — Cook Mastery">`
  - `<main class="container mx-auto w-full max-w-3xl px-4 py-6">`
  - `<CookbookEntryView client:load entryId={Astro.params.id ?? ""} ... />`
- **Handled events**: none.
- **Validation conditions**:
  - If unauthenticated → redirect to `/login`.
  - If `id` missing, pass empty string; React view should treat it as Not Found (consistent with other detail views).
- **Types**: none.
- **Props passed to child**:
  - `entryId: string`
  - `isAuthenticated: boolean`

---

### `src/components/cookbook/CookbookListView.tsx` (CookbookListView)
- **Component description**: Top-level list view that fetches `GET /api/cookbook`, renders loading/error/empty/success states, and supports pagination (and optional sorting).
- **Main elements**:
  - Root: `<section aria-labelledby={headingId} className="w-full">`
  - Header row:
    - `<h2>` title “Cookbook”
    - description text (“Private recipe links you’ve saved.”)
    - primary button linking to `/cookbook/new` (use `Button` + `<a href>` or plain `<a>` styled)
  - Optional sort control (native `<select>`; see note below)
  - Results:
    - `LoadingState` while loading
    - `FullPageError` on fetch error
    - `EmptyState` when `entries.length === 0`
    - Success list: `<ul role="list" className="grid gap-4">` with `CookbookEntryCard` items
  - `PaginationControls` when `pagination.totalPages > 1`
- **Handled events**:
  - On mount → trigger list fetch via `useCookbookEntries({ sort, page, limit })`
  - “New entry” click → navigate to `/cookbook/new`
  - Pagination: `onPrev`, `onNext`
  - Optional sort change → `setSort(nextSort)` and reset page to 1
  - Retry button (FullPageError) → `retry()`
- **Validation conditions (API-aligned + defensive)**:
  - If API returns `401` (session expired) → redirect to `/login` (even though route is protected).
  - Keep `page >= 1`, `limit` within `[1..100]` (UI should not allow values outside API constraints).
  - `sort` must be one of: `"newest" | "oldest" | "title_asc"`.
- **Types**:
  - DTO: `ListCookbookEntriesResponseDTO`, `ApiErrorResponse`
  - VM: `CookbookEntryListItemVM`, `CookbookListPaginationVM`, `CookbookListErrorVM`
- **Props**:
  - `isAuthenticated: boolean`
  - `defaultSort?: CookbookSort`
  - `defaultLimit?: number`

**UI components availability note (important)**:
- The repo currently has only a small subset of shadcn/ui (`button`, `card`, `input`, `label`). There is no shadcn `Select`.
- For sorting, implement a **native `<select>`** with Tailwind classes (recommended for MVP), or add a shadcn select later if desired.

---

### `src/components/cookbook/CookbookEntryCard.tsx` (CookbookEntryCard)
- **Component description**: Compact card for one cookbook entry in list view.
- **Main elements**:
  - Container: `<li>` wrapping a `Card`
  - Title row:
    - title linked to `/cookbook/:id`
  - URL row:
    - display URL (or hostname) + external link icon
    - open in new tab: `target="_blank" rel="noopener noreferrer"`
  - Notes preview:
    - show up to N characters (e.g. 140) and normalize whitespace/newlines for preview
  - Created date label
- **Handled events**:
  - Click title → navigate to detail
  - Click external link → open recipe website in new tab
- **Validation conditions**:
  - If `notes` is `null` or empty → omit preview block.
  - Do not render raw unbounded text; always constrain preview length.
- **Types**:
  - VM: `CookbookEntryListItemVM`
- **Props**:
  - `entry: CookbookEntryListItemVM`

---

### `src/components/cookbook/CookbookCreateView.tsx` (CookbookCreateView)
- **Component description**: Page-level component for `/cookbook/new`. Owns form state, submits `POST /api/cookbook`, and navigates after success.
- **Main elements**:
  - Header row with title + back link to `/cookbook`
  - `CookbookEntryForm` with submit label “Save”
- **Handled events**:
  - Submit form → call `createCookbookEntry(command)`
  - On success → toast “Saved” and `window.location.href = /cookbook/:id`
  - On cancel/back → navigate to `/cookbook`
- **Validation conditions**:
  - Client-side validation before submit:
    - `url` required; must be a valid URL string (recommend requiring `http:` or `https:` protocol).
    - `title` required; `title.trim().length > 0`
    - `notes` optional; allow empty string
  - API validation mapping:
    - `400 VALIDATION_ERROR` with `details.url` / `details.title` / `details.general` should populate inline errors.
  - `401` response → redirect to `/login`.
- **Types**:
  - DTO: `CreateCookbookEntryCommand`, `CreateCookbookEntryResponseDTO`, `ApiErrorResponse`
  - VM: `CookbookEntryFormVM`, `CookbookEntryFormErrorsVM`
- **Props**:
  - `isAuthenticated: boolean`

---

### `src/components/cookbook/CookbookEntryView.tsx` (CookbookEntryView)
- **Component description**: Detail controller for `/cookbook/:id`, handling load + view/edit modes and delete flow.
- **Main elements**:
  - Root: `<section aria-labelledby={headingId}>`
  - Conditional states:
    - loading: `LoadingState` or a dedicated skeleton (optional)
    - not found: `NotFoundState` (do not imply whether it exists vs private)
    - error: `FullPageError`
    - success: `CookbookEntryDetail`
- **Handled events**:
  - On mount → fetch entry via `useCookbookEntry({ entryId })`
  - Retry on fetch error
  - Toggle edit mode
  - Save edit → `PATCH /api/cookbook/:id`
  - Cancel edit → revert form state to last loaded entry and exit edit mode
  - Delete → confirm, then `DELETE /api/cookbook/:id`, toast, navigate to `/cookbook`
- **Validation conditions (API-aligned)**:
  - Pre-validate `entryId` as UUID; if invalid → treat as Not Found (same pattern as tutorial/article detail hooks).
  - For update payload:
    - send only changed fields (`url`, `title`, `notes`)
    - ensure at least one field is present; otherwise prevent submit and show `general` inline error (“No changes to save.”)
  - For delete:
    - require confirm step
  - `401` response → redirect to `/login`.
- **Types**:
  - DTO: `GetCookbookEntryResponseDTO`, `UpdateCookbookEntryCommand`, `UpdateCookbookEntryResponseDTO`, `DeleteCookbookEntryResponseDTO`, `ApiErrorResponse`
  - VM: `CookbookEntryDetailVM`, `CookbookEntryErrorVM`, `CookbookEntryEditStateVM`
- **Props**:
  - `entryId: string`
  - `isAuthenticated: boolean`

---

### `src/components/cookbook/CookbookEntryDetail.tsx` (CookbookEntryDetail)
- **Component description**: Presentational component for a loaded entry; renders view mode (read-only) or edit mode (form).
- **Main elements**:
  - Header:
    - title
    - external link button to `url`
    - timestamps: created/updated
    - actions: “Edit”, “Delete” (edit mode: “Save”, “Cancel”)
  - View mode sections:
    - URL (clickable + copy-friendly)
    - Notes:
      - display with `whitespace-pre-wrap break-words`
      - for long notes: wrap + optionally constrain with max height and `overflow-auto` (e.g. `max-h-[50vh]`)
  - Edit mode:
    - `CookbookEntryForm` seeded with current values
- **Handled events**:
  - Edit toggle click
  - Save click
  - Cancel click
  - Delete click
- **Validation conditions**:
  - Ensure any rendered URL is safe:
    - use `rel="noopener noreferrer"` for external links
  - Notes block must not cause layout overflow:
    - apply `break-words` and consider max-height scrolling for extremely long content
- **Types**:
  - VM: `CookbookEntryDetailVM`, `CookbookEntryFormVM`, `CookbookEntryFormErrorsVM`
- **Props**:
  - `entry: CookbookEntryDetailVM`
  - `mode: 'view' | 'edit'`
  - `form: CookbookEntryFormVM`
  - `errors: CookbookEntryFormErrorsVM`
  - `isSubmitting: boolean`
  - `onEdit: () => void`
  - `onCancel: () => void`
  - `onChange: (next: Partial<CookbookEntryFormVM>) => void`
  - `onSave: () => void`
  - `onDelete: () => void`

---

### `src/components/cookbook/CookbookEntryForm.tsx` (CookbookEntryForm)
- **Component description**: Reusable form used by create and edit. Renders URL + Title inputs and Notes textarea, with inline field errors.
- **Main elements**:
  - `<form noValidate>`
  - URL input: shadcn `Input`
  - Title input: shadcn `Input`
  - Notes field: **native `<textarea>`** with Tailwind classes (repo does not currently have shadcn `Textarea`)
  - Inline errors using `InlineFieldError` (reused from auth forms)
  - Optional top-level error callout for `general`
  - Submit button and optional secondary button (Cancel in edit mode)
- **Handled events**:
  - On change each field → call `onChange`
  - On submit → call `onSubmit`
- **Validation conditions (detailed)**:
  - **URL**:
    - required for create; required for edit only if changed and non-empty
    - must parse as URL: `new URL(value)` must not throw
    - recommended: require `protocol` in `{ 'http:', 'https:' }`
  - **Title**:
    - required for create; required for edit only if changed and non-empty
    - `value.trim().length > 0`
  - **Notes**:
    - optional; allow multi-line
    - must preserve line breaks on display (handled in detail component via CSS)
  - **General**:
    - edit save must not submit if no fields changed (prevents API refine error; also better UX)
- **Types**:
  - VM: `CookbookEntryFormVM`, `CookbookEntryFormErrorsVM`
- **Props (component interface)**:
  - `value: CookbookEntryFormVM`
  - `errors: CookbookEntryFormErrorsVM`
  - `disabled?: boolean`
  - `submitLabel: string`
  - `showCancel?: boolean`
  - `onCancel?: () => void`
  - `onChange: (next: Partial<CookbookEntryFormVM>) => void`
  - `onSubmit: () => void`

---

### `src/components/cookbook/ConfirmDelete.ts` (ConfirmDelete helper) (recommended)
- **Component description**: Minimal confirm mechanism for delete.
- **Implementation approach**: Use `window.confirm("Delete this entry?")` for MVP consistency without new UI dependencies.
- **Handled events**:
  - Called before delete mutation; returns boolean.
- **Types**: none.

## 5. Types

### Existing DTOs (from `src/types.ts`)
- **List**:
  - `ListCookbookEntriesParams`:
    - `sort?: 'newest' | 'oldest' | 'title_asc'`
    - `page?: number`
    - `limit?: number`
  - `ListCookbookEntriesResponseDTO`:
    - `entries: CookbookEntryDTO[]`
    - `pagination: PaginationMeta`
- **Detail**:
  - `GetCookbookEntryResponseDTO` (alias of `CookbookEntryDTO`)
- **Create**:
  - `CreateCookbookEntryCommand`:
    - `url: string`
    - `title: string`
    - `notes?: string | null` (frontend should send `string | undefined`; avoid `null` because API expects `string().optional()`)
  - `CreateCookbookEntryResponseDTO` (alias of `CookbookEntryDTO`)
- **Update**:
  - `UpdateCookbookEntryCommand`:
    - `url?: string`
    - `title?: string`
    - `notes?: string`
  - `UpdateCookbookEntryResponseDTO` (alias of `CookbookEntryDTO`)
- **Delete**:
  - `DeleteCookbookEntryResponseDTO`:
    - `message: string`
- **Errors**:
  - `ApiErrorResponse`:
    - `error.code: string`
    - `error.message: string`
    - `error.details?: Record<string, string>` where keys match Zod paths (`url`, `title`, `notes`, `id`, or `general`)

### New ViewModel types (recommended)
Create `src/components/cookbook/cookbook.types.ts`:

- **`CookbookSort`**
  - `'newest' | 'oldest' | 'title_asc'`

- **`CookbookEntryListItemVM`**
  - `id: string`
  - `title: string`
  - `url: string`
  - `urlLabel: string` (e.g. hostname or truncated URL)
  - `notesPreview?: string` (already trimmed, preview-safe)
  - `createdAtLabel: string`

- **`CookbookListPaginationVM`**
  - `page: number`
  - `limit: number`
  - `totalItems: number`
  - `totalPages: number`

- **`CookbookListVM`**
  - `entries: CookbookEntryListItemVM[]`
  - `pagination: CookbookListPaginationVM`

- **`CookbookEntryDetailVM`**
  - `id: string`
  - `title: string`
  - `url: string`
  - `notes: string` (normalize `null` → `""` for simpler rendering)
  - `createdAtLabel: string`
  - `updatedAtLabel: string`

- **`CookbookEntryFormVM`**
  - `url: string`
  - `title: string`
  - `notes: string`

- **`CookbookEntryFormErrorsVM`**
  - `url?: string`
  - `title?: string`
  - `notes?: string`
  - `general?: string`

- **`CookbookEntryEditStateVM`**
  - `mode: 'view' | 'edit'`
  - `isSaving: boolean`
  - `isDeleting: boolean`
  - `isDirty: boolean`

- **`CookbookListErrorVM` / `CookbookEntryErrorVM`**
  - `kind: 'http' | 'network'`
  - `status?: number`
  - `message: string`
  - `api?: ApiErrorResponse`

- **Helper functions** (exported from `cookbook.types.ts`):
  - `isUuid(value: string): boolean` (reuse pattern from tutorial/article types)
  - `formatDateLabel(iso: string): string`
  - `makeNotesPreview(notes: string, maxLen = 140): string`
  - `formatUrlLabel(url: string): string` (e.g. hostname)

### DTO → VM mapping rules
- `notes`:
  - list preview: normalize `null` to empty string; if empty → omit preview
  - detail: normalize `null` → `""`
- dates:
  - format using `toLocaleDateString` (same style as completion CTA dates)
- pagination:
  - map `PaginationMeta.total_items` → `totalItems`
  - map `PaginationMeta.total_pages` → `totalPages`

## 6. State Management
Use local component state + custom hooks, matching existing patterns (`useLearningFeed`, `useTutorialDetail`, `useArticleDetail`).

### Hook: `useCookbookEntries({ sort, page, limit })`
- **State**:
  - `data: CookbookListVM | null`
  - `isLoading: boolean`
  - `error: CookbookListErrorVM | null`
- **Actions**:
  - `setSort(next: CookbookSort): void`
  - `goPrev(): void`, `goNext(): void`
  - `retry(): void`
- **Behavior**:
  - On params change → refetch (with `AbortController` cleanup)
  - On `401` → redirect to `/login`
  - On non-OK:
    - parse `ApiErrorResponse` if possible; otherwise generic message

### Hook: `useCookbookEntry({ entryId })`
- **State**:
  - `data: CookbookEntryDetailVM | null`
  - `isLoading: boolean`
  - `error: CookbookEntryErrorVM | null`
  - `isNotFound: boolean`
- **Actions**:
  - `retry(): void`
- **Behavior**:
  - Pre-validate UUID; if invalid → `isNotFound = true` (skip fetch)
  - Treat `400` and `404` as `isNotFound`
  - On `401` → redirect to `/login`

### Local state in create/edit views
- **Create** (`CookbookCreateView`):
  - `form: CookbookEntryFormVM`
  - `errors: CookbookEntryFormErrorsVM`
  - `isSubmitting: boolean`
- **Detail/edit** (`CookbookEntryView`):
  - `mode: 'view' | 'edit'`
  - `form: CookbookEntryFormVM` (initialized from loaded entry; reset on cancel)
  - `errors: CookbookEntryFormErrorsVM`
  - `isSaving: boolean`, `isDeleting: boolean`
  - `lastSavedEntry: CookbookEntryDetailVM` (source of truth after successful save)
  - `isDirty: boolean` (derived by comparing `form` vs `lastSavedEntry`)

## 7. API Integration

### 7.1 List entries
- **Request**: `GET /api/cookbook?sort=<CookbookSort>&page=<number>&limit=<number>`
- **Success (200)**: `ListCookbookEntriesResponseDTO`
- **Errors**:
  - `401 UNAUTHORIZED` → redirect to `/login`
  - `400 VALIDATION_ERROR` (unexpected; UI should not generate invalid params) → show `FullPageError` with retry
  - `500` / network → show `FullPageError` with retry

### 7.2 Create entry
- **Request**: `POST /api/cookbook`
  - Body: `CreateCookbookEntryCommand` (send `notes` as `string | undefined`, not `null`)
- **Success (201)**: `CreateCookbookEntryResponseDTO`
- **Errors**:
  - `400 VALIDATION_ERROR` → inline field errors from `ApiErrorResponse.error.details`
    - expected keys: `url`, `title` (and possibly `general`)
  - `401 UNAUTHORIZED` → redirect to `/login`
  - `500` / network → toast error + keep form filled; allow retry

### 7.3 Get entry
- **Request**: `GET /api/cookbook/:id`
- **Success (200)**: `GetCookbookEntryResponseDTO`
- **Errors**:
  - `400 VALIDATION_ERROR` (invalid UUID) → treat as Not Found UI
  - `401 UNAUTHORIZED` → redirect to `/login`
  - `404 NOT_FOUND` → treat as Not Found UI (covers both “doesn’t exist” and “not accessible” per current implementation)
  - `500` / network → full page error with retry

### 7.4 Update entry
- **Request**: `PATCH /api/cookbook/:id`
  - Body: `UpdateCookbookEntryCommand` (send **only changed fields**)
- **Success (200)**: `UpdateCookbookEntryResponseDTO`
- **Errors**:
  - `400 VALIDATION_ERROR` → inline field errors
    - expected keys: `url`, `title`, `notes` (rare), and `general` (when body has no fields)
  - `401 UNAUTHORIZED` → redirect to `/login`
  - `404 NOT_FOUND` → show Not Found UI (do not leak existence)
  - `500` / network → toast error + keep edit mode open

### 7.5 Delete entry
- **Request**: `DELETE /api/cookbook/:id`
- **Success (200)**: `DeleteCookbookEntryResponseDTO`
- **Errors**:
  - `400 VALIDATION_ERROR` (invalid UUID) → treat as Not Found UI
  - `401 UNAUTHORIZED` → redirect to `/login`
  - `404 NOT_FOUND` → treat as Not Found UI
  - `500` / network → toast error; keep user on page

## 8. User Interactions
- **Cookbook list**
  - Open `/cookbook` → list loads
  - Click “New entry” → navigate to `/cookbook/new`
  - Click entry title → navigate to `/cookbook/:id`
  - Click external link → open recipe URL in new tab
  - Paginate → loads next/prev page
  - Optional: change sort → resets to page 1 and refetches
- **Create**
  - Fill URL/title/notes → inline client validation as user types (clear field error on change)
  - Submit:
    - disables submit button while pending
    - on success: toast + navigate to detail
    - on validation error: show inline field errors and keep values
- **Detail + edit**
  - View mode: read title, open external link, read notes (wrap/scroll)
  - Toggle edit mode:
    - form is pre-filled with current values
    - Save enabled only if form is dirty (recommended)
  - Save:
    - on success: toast “Saved”, update local entry VM, exit edit mode
    - on validation error: stay in edit mode and show inline errors
  - Cancel: revert form to last saved values and exit edit mode
  - Delete:
    - confirm → delete request
    - on success: toast + navigate back to `/cookbook`

## 9. Conditions and Validation
Conditions to verify and how they affect UI state:

- **Authentication required**
  - Condition: user must be authenticated (middleware-enforced).
  - UI effect: pages should not render cookbook UI for unauthenticated users; if an API call returns `401`, redirect to `/login`.

- **Entry ID must be UUID**
  - Condition: `entryId` must match UUID format.
  - UI effect: if invalid, show `NotFoundState` immediately and avoid calling API.

- **Create validation**
  - URL: required; must parse as URL; recommend restricting to `http/https`.
  - Title: required; `trim().length > 0`.
  - Notes: optional; multi-line allowed.
  - UI effect: block submit on client if obviously invalid; still map backend `VALIDATION_ERROR` details to inline errors.

- **Update validation**
  - At least one field must be provided (API refine rule → `details.general`).
  - URL and title rules apply only if provided.
  - UI effect:
    - if no changes, disable Save or show `general` error without calling API.
    - if backend returns `general`, display in a form-level error callout.

- **Long notes**
  - Condition: notes may be multi-line and very long.
  - UI effect:
    - In form: textarea should be resizable vertically and constrained (e.g. `max-h-[50vh]`), but not required to auto-grow.
    - In detail: wrap + optionally scroll with a max-height container.

## 10. Error Handling
- **List fetch**
  - Network error: show `FullPageError` with “Check your connection.” and retry
  - `500`: show `FullPageError` and retry
  - `401`: redirect to `/login`
- **Detail fetch**
  - Invalid UUID (`400` or client-side invalid): show `NotFoundState` (generic messaging)
  - `404`: show `NotFoundState` with privacy-safe wording (“not found or no longer available”)
  - `500` / network: show `FullPageError` and retry
- **Create/update form**
  - `400 VALIDATION_ERROR`: map `error.details` to field errors (`url`, `title`, `notes`) and `general`
  - `401`: redirect to `/login`
  - `429` (if added later): toast “Too many requests” and keep form intact
  - `500` / network: toast error, keep input intact, allow retry
- **Delete**
  - `401`: redirect to `/login`
  - `404`: treat as not found; show not found state or toast + navigate back to list
  - `500` / network: toast error; keep user on page

## 11. Implementation Steps
1. **Add new cookbook route pages**:
   - Create `src/pages/cookbook/index.astro`, `src/pages/cookbook/new.astro`, `src/pages/cookbook/[id].astro`.
   - Follow existing patterns:
     - use `Layout.astro`
     - derive auth from `Astro.locals`
     - defensively redirect to `/login` if missing.
2. **Create cookbook component folder**:
   - Add `src/components/cookbook/` with:
     - `CookbookListView.tsx`
     - `CookbookCreateView.tsx`
     - `CookbookEntryView.tsx`
     - `CookbookEntryDetail.tsx`
     - `CookbookEntryForm.tsx`
     - `CookbookEntryCard.tsx`
     - `cookbook.types.ts`
     - `useCookbookEntries.ts`
     - `useCookbookEntry.ts`
3. **Implement shared helpers in `cookbook.types.ts`**:
   - `isUuid`, date formatting, URL label formatting, notes preview formatting.
4. **Implement list hook + view**:
   - `useCookbookEntries`:
     - fetch list endpoint with `AbortController`
     - handle `401` redirect
     - parse `ApiErrorResponse` on non-OK
   - `CookbookListView`:
     - header row + new entry button
     - use `LoadingState`, `EmptyState`, `FullPageError`, `PaginationControls`
5. **Implement create view + form**:
   - Build `CookbookEntryForm`:
     - URL/Title inputs using shadcn `Input`
     - Notes using native `<textarea>` with Tailwind classes
     - `InlineFieldError` for field errors
   - Build `CookbookCreateView`:
     - client validation
     - submit to `POST /api/cookbook`
     - map `ApiErrorResponse.error.details` to form errors
     - on success: toast + navigate to `/cookbook/:id`
6. **Implement detail hook + view/edit mode**:
   - `useCookbookEntry`:
     - pre-validate UUID
     - treat `400/404` as not found
     - handle `401` redirect
   - `CookbookEntryView`:
     - manage `mode`, `form`, `errors`, `isDirty`
     - implement save (`PATCH`) sending only changed fields
     - implement cancel reset
     - implement delete confirm + `DELETE` then toast + navigate to list
7. **Manual verification checklist**:
   - Not logged in → `/cookbook` redirects to `/login`
   - Logged in, empty list → empty state + “New entry” CTA works
   - Create:
     - missing URL/title → client error
     - invalid URL → client error + server error mapping works
     - success → toast + navigates to detail
   - Detail:
     - `/cookbook/not-a-uuid` → NotFoundState
     - non-existent UUID → NotFoundState (privacy-safe)
     - edit + save → updates and exits edit mode
     - edit + save with no changes → Save disabled or shows general error without API call
     - delete → confirm → toast + returns to list
