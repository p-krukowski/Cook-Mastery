# UI Architecture for Cook Mastery

## 1. UI Structure Overview

### 1.1 Product UI goals (MVP-aligned)

- **Teach fundamentals through content**: users browse and read **tutorials** + **articles** organized by **level** and **difficulty**.
- **Low-friction progress** (authenticated only): one-click **Mark as passed/read** on detail pages; no “undo” in MVP.
- **Private cookbook** (authenticated only): users create, view, edit, delete personal recipe links with notes.
- **Deterministic recommendations**: Home shows **newest** for anonymous users and **level-based recommended** for authenticated users.
- **Simple discovery**: no search/tags; browsing is via a single **Learning** view with minimal filters + pagination.

### 1.2 Key requirements extracted from the PRD (and MVP decisions)

**Content**
- **Tutorials**: title, category, level, difficulty weight (1–5), summary, main content, structured steps/sections, practice recommendations, key takeaways, timestamps.
- **Articles**: title, level, difficulty weight (1–5), summary, main content, key takeaways, timestamps.

**Authentication & security baseline**
- Signup with **email + username + password + initial level**; login with **email or username + password**; logout; persistent secure sessions.
- Access control: authenticated-only actions (completion, cookbook, profile edits).

**Level model**
- Users can browse any level, but **recommendations are driven only by selected level**.
- Level change is explicit and user-controlled (Save/confirm).

**Progression**
- PRD includes completion %, “out of date”, and eligibility to advance at **85%**.  
  - **MVP decision**: progress summary UI/endpoint can be **deferred**; architecture includes a reserved Profile section for it.

**Cookbook**
- Users can add URL + title + notes, view list, edit, and must not access other users’ entries.

**MVP scope adjustment (session decisions)**
- Tutorials/articles are **publicly viewable**; **authentication gates**: recommendations personalization, completion actions, and all cookbook features.

### 1.3 Main API endpoints (from API plan) and their UI usage

**Tutorials**
- `GET /api/tutorials` — list tutorials (supports `level`, `category`, `sort`, `page`, `limit`, `include_completed`)
- `GET /api/tutorials/:id` — tutorial detail
- `POST /api/tutorials/:id/complete` — mark tutorial as passed (idempotent; mentioned in API plan business logic)

**Articles**
- `GET /api/articles` — list articles (supports `level`, `sort`, `page`, `limit`, `include_completed`)
- `GET /api/articles/:id` — article detail
- `POST /api/articles/:id/complete` — mark article as read (idempotent; mentioned in API plan business logic)

**Cookbook (authenticated)**
- `GET /api/cookbook` — list cookbook entries (supports `sort`, `page`, `limit`)
- `GET /api/cookbook/:id` — get one entry
- `POST /api/cookbook` — create entry (validates URL + title; inline field errors on 400)
- `PATCH /api/cookbook/:id` — update entry
- `DELETE /api/cookbook/:id` — delete entry

**Auth/Profile/Progress**
- Auth is handled via **Supabase Auth** (JWT/cookies). The API plan describes the mechanism but does not enumerate REST auth endpoints.
- The API plan references **Profiles** and **Level Progress** (`user_level_progress` view) but does not specify REST endpoints.  
  - UI architecture assumes these are available via **server-side Supabase access** (or a thin API layer mirroring the plan’s validation rules).

### 1.4 Global UX patterns (cross-view)

- **App shell**: persistent top navbar with primary sections; content area below.
- **Standardized error handling**:
  - **Full-page error** for list/detail fetch failures (with retry).
  - **Inline field errors** for `400 VALIDATION_ERROR` on forms.
  - **Redirect to login** on `401 UNAUTHORIZED` for protected routes/actions.
  - **Not found view** on `404 NOT_FOUND`.
  - **Toast notifications** for transient/network errors, 429/500, and for mutation success.
- **State updates (MVP)**: after a mutation (complete/save/delete), update the **current page’s local state immediately**; lists may refresh on next navigation (no global sync requirement).

### 1.5 Accessibility, responsiveness, and security considerations (MVP stance)

- **Responsiveness/a11y**: explicitly deprioritized in MVP, but the architecture assumes baseline good practice:
  - semantic headings, labels for inputs, visible focus states, keyboard operability for controls, and non-blocking toasts.
- **Security UX**:
  - do not display private data to anonymous users,
  - avoid revealing whether an account exists on login errors,
  - handle `403 FORBIDDEN` on cookbook as “not allowed” (without leaking existence when possible),
  - avoid exposing access tokens in the UI; rely on secure session handling per API plan.

## 2. View List

> Global navbar routes (MVP): **Home**, **Learning**, **Cookbook**, **Profile**.

### 2.1 Home

- **View name**: Home
- **View path**: `/`
- **Main purpose**: show a concise “what to read next” entry point, split into Tutorials and Articles.
- **Key information to display**:
  - two sections: **Tutorials** and **Articles** (5 items each)
  - subtle **“New”** badge for items created within last **7 days**
  - for authenticated users, ensure items align to **selected level**
- **Key view components**:
  - `Navbar`
  - `SectionHeader` (title + small explanatory copy)
  - `ContentCard` (shared tutorial/article card with type badge)
  - `NewBadge` (based on `created_at`)
  - `EmptyState` per section
- **UX, accessibility, and security considerations**:
  - **Anonymous**: show 5 newest per section (`sort=newest`, `limit=5`); hide completion UI and completion state.
  - **Authenticated**: show 5 recommended per section (`level=<selectedLevel>`, `sort=difficulty_asc`, `limit=5`).
  - Avoid implying personalization for anonymous users; label sections as “Newest” vs “Recommended for you” appropriately.
  - Full-page error if either feed fails; optionally degrade by showing the other section if only one call fails (still consistent with “clarity over richness”).

### 2.2 Learning

- **View name**: Learning (browse)
- **View path**: `/learning`
- **Main purpose**: browse all content with minimal filters and deterministic pagination.
- **Key information to display**:
  - list of content cards (tutorials + articles)
  - filters:
    - **Type**: Tutorials / Articles / All (default All)
    - **Level**: Beginner / Intermediate / Experienced (default: user’s level if authenticated; otherwise All)
  - pagination: Prev/Next + “Page X of Y”
- **Key view components**:
  - `FiltersBar` with `TypeFilter` + `LevelFilter`
  - `ContentCard` (shared)
  - `PaginationControls`
  - `LoadingState`, `EmptyState`, `FullPageError`
- **UX, accessibility, and security considerations**:
  - Sorting: always **newest first** for Learning results.
  - **Aggregated mode (Type=All)**:
    - call `GET /api/tutorials` and `GET /api/articles` in parallel with `sort=newest`
    - set `limit=5` for each to yield 10 total items per “page”
    - merge and sort client-side by `created_at desc` for the combined list display
  - **Single-type mode**:
    - call only the chosen endpoint with `limit=10`, `sort=newest`
  - Pagination reset: changing **Type** resets to page 1.
  - Filters are stored in **component state only** (no query params requirement in MVP).
  - Anonymous users still see read-only content; no completion indicators.

### 2.3 Tutorial detail

- **View name**: Tutorial detail
- **View path**: `/tutorials/:id`
- **Main purpose**: structured reading experience and (if authenticated) one-click “passed”.
- **Key information to display**:
  - title, category, level, difficulty weight, created date
  - summary, main content, steps/sections, practice recommendations, key takeaways
  - authenticated only: completion state and action
- **Key view components**:
  - `ContentHeader` (title + metadata row + type badge)
  - `ContentSections` (Summary, Content, Steps, Practice, Takeaways)
  - `CompletionCallToAction` (authenticated only)
  - `FullPageError` / `NotFound`
- **UX, accessibility, and security considerations**:
  - Data: `GET /api/tutorials/:id`
  - Completion (authenticated only): `POST /api/tutorials/:id/complete`
    - on success: disable the button and show completed state (idempotent safe)
    - on 401: redirect to login
    - on 429/500/network: toast + keep button enabled for retry
  - Do not render a completion UI for anonymous users (avoid confusion and avoid leaking per-user state).

### 2.4 Article detail

- **View name**: Article detail
- **View path**: `/articles/:id`
- **Main purpose**: reading experience and (if authenticated) one-click “read”.
- **Key information to display**:
  - title, level, difficulty weight, created date
  - summary, main content, key takeaways
  - authenticated only: “Mark as read” at the bottom + completion state
- **Key view components**:
  - `ContentHeader` (title + metadata row + type badge)
  - `ContentSections` (Summary, Content, Takeaways)
  - `CompletionCallToAction` at bottom (authenticated only)
  - `FullPageError` / `NotFound`
- **UX, accessibility, and security considerations**:
  - Data: `GET /api/articles/:id`
  - Completion (authenticated only): `POST /api/articles/:id/complete`
  - Same error/toast/401 behavior as tutorial detail.

### 2.5 Cookbook list (protected)

- **View name**: Cookbook
- **View path**: `/cookbook`
- **Main purpose**: private list of saved recipe links with quick entry-point to create and edit.
- **Key information to display**:
  - list of entries with title, URL (display + external link), notes preview, created date
  - primary action: “New entry”
- **Key view components**:
  - `AuthGate` (route-level protection)
  - `PageHeader` (title + “New entry” button)
  - `CookbookEntryCard` or table row
  - `PaginationControls` (if needed)
  - `FullPageError`, `EmptyState`
- **UX, accessibility, and security considerations**:
  - Data: `GET /api/cookbook` (default sort newest)
  - On 401: redirect to login
  - On empty list: encourage adding first entry (ties to KPI activation)

### 2.6 Cookbook create (protected)

- **View name**: New cookbook entry
- **View path**: `/cookbook/new`
- **Main purpose**: add a new recipe URL with title and notes.
- **Key information to display**:
  - fields: URL (required), Title (required), Notes (optional, multiline)
  - validation feedback and submission status
- **Key view components**:
  - `AuthGate`
  - `CookbookEntryForm` (URL input, title input, notes textarea)
  - `InlineFieldError` (for 400 validation)
  - `Toast` success/failure
- **UX, accessibility, and security considerations**:
  - Submit: `POST /api/cookbook`
  - On success: toast “Saved” and navigate to `/cookbook/:id` (or `/cookbook`)
  - Notes must handle long multi-line content without breaking layout (scroll/wrap strategy).

### 2.7 Cookbook detail + edit mode (protected)

- **View name**: Cookbook entry detail
- **View path**: `/cookbook/:id`
- **Main purpose**: view-first detail of a recipe entry with an explicit edit mode.
- **Key information to display**:
  - title, URL (open in new tab), full notes, timestamps
  - actions: Edit mode toggle, Save/Cancel (in edit mode), Delete
- **Key view components**:
  - `AuthGate`
  - `CookbookEntryDetail`
  - `EditModeToggle`
  - `CookbookEntryForm` (reused for edit mode)
  - `ConfirmDialog` for delete
  - `Toast` success/failure
- **UX, accessibility, and security considerations**:
  - Load: `GET /api/cookbook/:id`
  - Update: `PATCH /api/cookbook/:id` (inline field errors on 400)
  - Delete: `DELETE /api/cookbook/:id`
  - On 403: show “Access denied” page state (do not reveal details).
  - On 404: Not Found.

### 2.8 Profile (protected)

- **View name**: Profile
- **View path**: `/profile`
- **Main purpose**: manage selected level (explicit save) and account actions; reserve space for progress/status.
- **Key information to display**:
  - current username (read-only display; editing optional based on backend readiness)
  - current selected level + level picker
  - helper text: “Changing your level will change recommendations.”
  - actions: Save level, Logout
  - optional/deferred: completion %, out-of-date, eligibility to advance
- **Key view components**:
  - `AuthGate`
  - `ProfileSummary` (username, email if desired)
  - `LevelSelector` + `SaveButton` (explicit save)
  - `LogoutButton`
  - `ProgressPanel` (deferred if no endpoint is shipped)
- **UX, accessibility, and security considerations**:
  - Save action must be explicit (no auto-save) and should confirm success via toast.
  - On 401: redirect to login.
  - If progress is deferred, UI should not show misleading placeholders—show a small “Coming later” note or omit entirely.

### 2.9 Authentication (supporting views; not in primary navbar)

- **View name**: Log in
- **View path**: `/login` (supporting route)
- **Main purpose**: authenticate and return user to Home.
- **Key information to display**:
  - identifier (email or username), password
  - generic error messaging on invalid credentials
- **Key view components**:
  - `AuthFormLogin`
  - `InlineFieldError` (for validation), `Toast` for transient errors
  - links to `/signup`
- **UX, accessibility, and security considerations**:
  - post-auth redirect: always to `/` (MVP decision)
  - rate limit messaging on 429 (“Try again in a moment”)

- **View name**: Sign up
- **View path**: `/signup` (supporting route)
- **Main purpose**: create account and set initial level.
- **Key information to display**:
  - email, username, password, level picker
  - clear field-level validation feedback on duplicates/invalid formats
- **Key view components**:
  - `AuthFormSignup` + `LevelSelector`
  - `InlineFieldError`
- **UX, accessibility, and security considerations**:
  - post-signup redirect: `/`
  - do not over-collect data; keep minimal per PRD.

### 2.10 Not found / error views (supporting)

- **View name**: Not Found
- **View path**: `*` (catch-all)
- **Main purpose**: handle 404s from routes or API fetches.
- **Key view components**:
  - `NotFoundState` with navigation back to Home/Learning

- **View name**: Generic error state
- **View path**: N/A (shared component used in views)
- **Main purpose**: consistent full-page error messaging and retry affordance.

## 3. User Journey Map

### 3.1 Primary journey: anonymous user → learning → signup → completion (activation)

1. **Land on Home (`/`)** as anonymous.
2. See **Newest Tutorials** and **Newest Articles** (5 each); open an item to evaluate value.
3. Navigate to **Learning (`/learning`)** to browse more; optionally filter by Type and/or Level.
4. Open a **Tutorial detail** or **Article detail**.
5. Attempt to “Mark as passed/read”:
   - completion UI is hidden for anonymous users (MVP), so conversion CTA is instead offered via navbar (“Log in / Sign up”) and via contextual prompts (optional).
6. Go to **Sign up (`/signup`)**, choose initial level, create account.
7. Redirect back to **Home (`/`)** with **Recommended** sections now tailored to selected level.
8. Open a recommended item; click **Mark as passed/read**; see success toast; CTA becomes disabled.

### 3.2 Authenticated browsing + deterministic recommendations

1. Navigate between **Home**, **Learning**, and detail pages using navbar.
2. Home shows **Recommended** (selected level only), ordered by:
   - `difficulty_weight` ascending, then newest within the same weight
3. “New” badge appears for content created within the last 7 days.

### 3.3 Cookbook journey (private utility loop)

1. From navbar, click **Cookbook**.
2. If not authenticated: redirect to `/login`. After login: redirect to `/`.
3. From `/cookbook`, click **New entry** → `/cookbook/new`.
4. Fill URL + title + notes; submit.
5. On success: toast + navigate to entry detail `/cookbook/:id` (or back to list).
6. Toggle **Edit mode**, update fields, Save; or Delete with confirm dialog.

### 3.4 Level change journey (explicit and reversible)

1. Go to **Profile (`/profile`)**.
2. Change selected level in selector.
3. Click **Save**; show toast “Level updated; recommendations will change.”
4. Return to Home; recommended lists now align to new level.

## 4. Layout and Navigation Structure

### 4.1 Global navigation (navbar)

- **Primary links**: Home (`/`), Learning (`/learning`), Cookbook (`/cookbook`), Profile (`/profile`)
- **Right side**:
  - authenticated: show **username** (clickable to Profile)
  - anonymous: show **Log in** / **Sign up**

### 4.2 Route protection and redirects

- **Protected routes**: `/cookbook`, `/cookbook/new`, `/cookbook/:id`, `/profile`
  - if `401`: redirect to `/login`
- **Public routes**: `/`, `/learning`, `/tutorials/:id`, `/articles/:id`, `/login`, `/signup`
- **Post-auth redirect**: after login/signup → `/` (MVP decision)

### 4.3 Page composition model (Astro + React)

- Each route is an Astro page with:
  - a shared `AppLayout` (navbar + toasts + main container)
  - a route-specific React “island” for interactive pieces (filters, pagination, forms, completion actions).
- Data fetching strategy:
  - lists/details fetched per-view via API routes; show loading → error/empty → success states.
  - keep filter state local to the Learning view (MVP).

## 5. Key Components

### 5.1 Cross-cutting UI building blocks

- **`AppLayout`**: shared shell with navbar, content slot, toast provider.
- **`Navbar`**: primary navigation + auth status area (username or login/signup).
- **`ContentCard`**: shared tutorial/article card with:
  - type badge (Tutorial/Article)
  - title + summary
  - metadata row (level, difficulty weight, created date)
  - optional “New” badge (based on created_at)
- **`FiltersBar`**: houses `TypeFilter` and `LevelFilter` (Learning only).
- **`PaginationControls`**: Prev/Next + page indicator; accessible button states; deterministic reset behavior.
- **`FullPageError` / `NotFoundState` / `EmptyState` / `LoadingState`**: standardized page states.
- **`ToastSystem`** (single provider, shadcn/ui-compatible): success for mutations; error for transient failures; special guidance on 429.

### 5.2 Auth and protection components

- **`AuthGate`**: wraps protected pages; handles 401 → redirect to login.
- **`AuthFormLogin` / `AuthFormSignup`**: forms with inline errors and generic auth error messaging.

### 5.3 Completion and cookbook components

- **`CompletionCallToAction`**: one-click action shown only when authenticated; disabled after success.
- **`CookbookEntryForm`**: reusable create/edit form (URL, title, notes) with inline validation.
- **`ConfirmDialog`**: used for destructive actions (delete cookbook entry).

### 5.4 Mapping: PRD user stories → UI views/components → API surface

| User Story | UI surface (view → elements) | Data / API / Auth | MVP status |
|---|---|---|---|
| US-001 Signup | `/signup` → signup form + level selector | Supabase Auth + profile level set (server-side) | MVP |
| US-002 Login | `/login` → login form | Supabase Auth | MVP |
| US-003 Logout | `/profile` → logout button | Supabase Auth session end | MVP |
| US-004 Session persistence | Global app shell | Supabase session cookie/JWT | MVP |
| US-005 Brute-force protection | `/login` → 429 messaging + disabled submit during pending | API/middleware rate limiting | MVP |
| US-006 Restrict authenticated-only features | `AuthGate` + hidden completion UI | Redirect on 401; hide per-user state when anonymous | MVP |
| US-007 View level + completion status | `/profile` → profile summary + progress panel | Profile + level progress (endpoint TBD per API plan) | Deferred (per session) |
| US-008 Change level | `/profile` → level selector + Save | Profile update (server-side) | MVP |
| US-009 Eligibility to advance | `/profile` → eligibility indicator | Level progress (endpoint TBD) | Deferred (per session) |
| US-010 Cross-level browsing | `/learning` → level filter + cards | `GET /api/tutorials`, `GET /api/articles` with `level` | MVP |
| US-011–012 Recommended tutorials on home | `/` → Tutorials section | `GET /api/tutorials` with `level`, `sort=difficulty_asc`, `limit=5` | MVP (adjusted for public view) |
| US-013 Tutorial read | `/tutorials/:id` | `GET /api/tutorials/:id` | MVP |
| US-014–015 Mark tutorial passed (no undo) | `/tutorials/:id` → completion CTA | `POST /api/tutorials/:id/complete` (auth only) | MVP |
| US-016 Empty tutorial state | `/` Tutorials section empty state | Empty list handling | MVP |
| US-017 Browse articles | `/learning` and Home Articles section | `GET /api/articles` | MVP |
| US-018 Article read | `/articles/:id` | `GET /api/articles/:id` | MVP |
| US-019–020 Mark article read (no undo) | `/articles/:id` → bottom CTA | `POST /api/articles/:id/complete` (auth only) | MVP |
| US-021 Empty article state | `/` Articles section empty state | Empty list handling | MVP |
| US-022 Surface new content | `/` + cards → “New” badge | `created_at` within 7 days | MVP |
| US-023 No search/tags | `/learning` contains only Type/Level; no search UI | N/A | MVP |
| US-024–026 Progress/out-of-date rules | `/profile` progress panel | Level progress view (endpoint TBD) | Deferred (per session) |
| US-027 Add cookbook entry | `/cookbook/new` → form | `POST /api/cookbook` (auth) | MVP |
| US-028 View cookbook entries | `/cookbook` list | `GET /api/cookbook` (auth) | MVP |
| US-029 Edit cookbook entry | `/cookbook/:id` edit mode | `PATCH /api/cookbook/:id` (auth) | MVP |
| US-030 Cookbook privacy | Protected cookbook routes + 403 handling | `403 FORBIDDEN` from API/RLS | MVP |
| US-031 Long notes | cookbook form + detail → wrapping/scrolling | N/A | MVP |
| US-032 Seed initial content | N/A (operator workflow) | N/A | N/A (non-UI) |
| US-033–037 Analytics | N/A (no UI needed) | server-side events | N/A (non-UI) |

### 5.5 Mapping: functional requirements → concrete UI elements

| PRD Requirement | UI element(s) | Where |
|---|---|---|
| FR-001 Signup | Signup form + level selector | `/signup` |
| FR-002 Login/logout | Login form; logout button | `/login`, `/profile` |
| FR-003 Session persistence | Auth-aware navbar + protected routes | global |
| FR-004 Password security baseline | No UI exposure; generic error handling | `/login`, `/signup` |
| FR-005 Access control | `AuthGate`; hide completion UI for anonymous | `/cookbook*`, `/profile`, detail pages |
| FR-006 Level selection/change | Level selector + explicit Save | `/profile` |
| FR-007 Cross-level browsing | Level filter; clear “recommended” labeling | `/learning`, `/` |
| FR-008/012 Content models | Structured detail sections | `/tutorials/:id`, `/articles/:id` |
| FR-011/014 Completion | One-click CTA; disabled after success | detail pages |
| FR-022–025 Cookbook CRUD | Create/edit forms + list + detail view | `/cookbook*` |

### 5.6 Edge cases, error states, and user pain points (and how UI addresses them)

**Edge cases / errors**
- **Empty catalogs**: show per-section/list empty states with a short explanation.
- **404 content**: show Not Found with navigation back to Learning.
- **401 on protected features**: redirect to login; after auth return to Home (MVP).
- **403 on cookbook entry**: show Access Denied state without leaking resource details.
- **400 validation**: show inline field errors (URL/title) and keep user input intact.
- **429 rate limit**: toast with “try again shortly” and keep UI stable (no data loss).
- **Network/500**: toast + retry affordance; full-page error for initial fetch failures.

**Potential pain points**
- **Confusion between “recommended” and “newest”**:
  - mitigate with clear section labels and microcopy (“Recommended for your selected level” vs “Newest”).
- **Aggregated Learning feed semantics**:
  - mitigate with visible type badges on every card and a clear “All” filter state.
- **Level change surprise**:
  - mitigate with explicit Save action and message that Home recommendations will change.
- **Completion trust** (no validation):
  - mitigate with wording that reinforces self-assessment (“Mark as passed/read”).
- **Cookbook privacy concerns**:
  - mitigate with strong route protection, consistent “private area” framing, and safe 403 handling.

