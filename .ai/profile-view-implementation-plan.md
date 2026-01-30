## View Implementation Plan — Profile

### 1. Overview
The **Profile** view is a protected account/settings page where an authenticated user can:
- See their **account summary** (username + email).
- View and **manually change their selected learning level** (explicit save; no auto-save) so home recommendations follow the new level.
- Log out.
- Optionally view **progress/status** for the selected level (completion %, up-to-date/out-of-date, eligible to advance at 85%).

This view must follow MVP principles: **clarity over richness**, explicit actions, and safe handling of authentication failures.

#### User story mapping (scope of this view)
| User story | Requirement | Implementation touchpoints |
|---|---|---|
| **US-007** | See selected level + completion % + up-to-date/out-of-date | `ProfileSummaryCard` shows selected level; `ProgressPanel` renders completion % and status using `UserProgressSummaryDTO` |
| **US-008** | Manually change selected level (confirm) | `LevelSettingsCard` uses `LevelSelector` + explicit **Save level** → `PATCH /api/profile` |
| **US-009** | See eligibility to advance at 85% | `ProgressPanel` shows eligibility based on \(completion \ge 85\%\) and `selected_level !== EXPERIENCED` |
| **US-003 / US-006** | Logout + protected access | `LogoutButton` calls `POST /api/auth/logout`; middleware protects `/profile` and redirects to `/login` when unauthenticated |

---

### 2. View Routing
- **Route**: `/profile`
- **File**: `src/pages/profile.astro`
- **Protection**:
  - Primary: `src/middleware/index.ts` treats `/profile` as protected and redirects unauthenticated users to `/login`.
  - Defensive: `src/pages/profile.astro` already redirects to `/login` if `Astro.locals.user/profile` are missing.

---

### 3. Component Structure
Astro page + React island approach (consistent with existing views).

High-level hierarchy:
- `src/pages/profile.astro`
  - `Layout` (`src/layouts/Layout.astro`)
    - `ProfileView` (React island, `client:load`)
      - `ProfileSummaryCard`
      - `LevelSettingsCard`
        - `LevelSelector` (reuse existing `src/components/auth/LevelSelector.tsx`)
        - `SaveLevelButton`
      - `ProgressPanel` (optional; may be “Coming later”)
      - `SessionCard`
        - `LogoutButton`

Component tree diagram (recommended):

```text
Layout
└─ ProfilePage (/profile)
   └─ ProfileView (client)
      ├─ ProfileSummaryCard
      ├─ LevelSettingsCard
      │  ├─ LevelSelector (shared)
      │  └─ SaveLevelButton
      ├─ ProgressPanel (optional)
      └─ SessionCard
         └─ LogoutButton
```

---

### 4. Component Details

#### `ProfilePage` (`src/pages/profile.astro`)
- **Description**: Route entry that injects authenticated context into the React island.
- **Main elements**:
  - `Layout title="Profile — Cook Mastery"`
  - Container wrapper (`div.container ...`)
  - `<ProfileView user={user} profile={profile} />`
- **Handled events**: none (server-only).
- **Validation conditions**:
  - If `!Astro.locals.user || !Astro.locals.profile` → redirect `/login`.
- **Types**:
  - `ProfileDTO` (from `src/types.ts`)
  - `AuthenticatedUserDTO` (use `GetSessionResponseDTO["user"]` shape)
- **Props to children**:
  - `user: AuthenticatedUserDTO`
  - `profile: ProfileDTO`
  - (optional) `initialProgressSummary?: UserProgressSummaryDTO` if you decide to server-fetch progress and pass it down.

#### `ProfileView` (`src/components/profile/ProfileView.tsx`)
- **Description**: Main interactive container. Owns local UI state for “draft level”, saving, progress fetch, and logout.
- **Main elements** (recommended shadcn + Tailwind structure):
  - `<h1>` page title
  - `<Card>` blocks for account, level settings, progress, and session/logout (or equivalent Tailwind card wrappers)
  - Inline error region for non-toast errors that should remain visible
- **Handled events**:
  - `onLevelChange(level)` from `LevelSelector`
  - `onSaveLevel()` from Save button
  - `onLogout()` from Logout button
  - `useEffect` on mount to fetch progress summary (if enabled)
- **Validation conditions**:
  - Save is enabled only when:
    - a new level has been selected, and
    - the selected level differs from `profile.selected_level`, and
    - a save request is not currently in-flight.
  - Level must be one of `DifficultyLevel` (`BEGINNER | INTERMEDIATE | EXPERIENCED`) before calling the API.
- **Types**:
  - DTOs: `ProfileDTO`, `UpdateProfileCommand`, `ApiErrorResponse`, `DifficultyLevel`, `UserProgressSummaryDTO`, `LevelProgressDTO`
  - ViewModels (new; see “Types” section):
    - `ProfileLevelSettingsVM`
    - `ProfileProgressVM`
    - `ProfileSaveStateVM`
- **Props**:
  - `user: { id: string; email: string }`
  - `profile: ProfileDTO`
  - `initialProgressSummary?: UserProgressSummaryDTO` (optional optimization)
  - `enableProgress?: boolean` (optional feature flag; default `true` once endpoint exists)

#### `ProfileSummaryCard` (new, internal to `ProfileView` or extracted file)
- **Description**: Pure presentational block displaying username + email (read-only) and “member since”.
- **Main elements**:
  - Card title: “Account Information”
  - Rows for username, email, selected level (current saved), created date
- **Handled events**: none.
- **Validation conditions**: none (display-only).
- **Types**:
  - `ProfileDTO`, `AuthenticatedUserDTO`
- **Props**:
  - `userEmail: string`
  - `username: string`
  - `createdAt: string`
  - `selectedLevel: DifficultyLevel`

#### `LevelSettingsCard` (new, internal or extracted)
- **Description**: Lets the user select a level and explicitly save it.
- **Main elements**:
  - Card title: “Learning level”
  - Helper text: “Changing your level will change recommendations.”
  - `LevelSelector` (reuse)
  - Primary action button: “Save level” (disabled until dirty)
  - Optional “Saved”/status line (e.g., “Level updated”)
- **Handled events**:
  - `onChange` from `LevelSelector`
  - `onClick` Save
- **Validation conditions**:
  - Prevent save if `draftSelectedLevel` is null/undefined.
  - Prevent save if `draftSelectedLevel === profile.selected_level`.
  - While saving: disable inputs and buttons.
  - Client-side validation message if the user tries to save without selecting a level (should not happen if initialized properly, but keep as guard).
- **Types**:
  - `DifficultyLevel`
  - `UpdateProfileCommand`
  - `ApiErrorResponse`
  - VM: `ProfileLevelSettingsVM`, `ProfileSaveStateVM`
- **Props**:
  - `currentLevel: DifficultyLevel`
  - `draftLevel: DifficultyLevel`
  - `isDirty: boolean`
  - `isSaving: boolean`
  - `error?: string`
  - `onDraftLevelChange(level: DifficultyLevel): void`
  - `onSave(): void`

#### `ProgressPanel` (new; optional/deferred)
- **Description**: Displays completion and status for the currently saved selected level.
- **Main elements**:
  - Card title: “Progress”
  - Primary stat: completion percent for selected level (rounded, e.g. `Math.round`)
  - Status pill/label:
    - “Up to date” if completion ≥ 85%
    - “Out of date” if completion < 85%
  - Eligibility line:
    - If `selected_level !== EXPERIENCED` and completion ≥ 85% → “Eligible to advance”
    - Else → “Not eligible yet”
  - Empty-content handling: if `total_count === 0`, show “0%” and a note “No content in this level yet.”
  - Deferred state (if endpoint not available): short note “Progress coming later.”
- **Handled events**:
  - `retry()` if progress fetch fails (optional)
- **Validation conditions**:
  - Display logic must follow PRD rules:
    - completion calculation uses `completion_percent` from API (server responsibility)
    - threshold comparisons use **85%**
  - Must handle missing/empty progress data gracefully (no placeholders that imply progress exists).
- **Types**:
  - DTOs: `UserProgressSummaryDTO`, `LevelProgressDTO`, `DifficultyLevel`
  - VM: `ProfileProgressVM`
- **Props**:
  - `isLoading: boolean`
  - `error?: string`
  - `progress?: ProfileProgressVM`
  - `onRetry?(): void`

#### `SessionCard` / `LogoutButton` (existing behavior, but align with API)
- **Description**: Ends the current session.
- **Main elements**:
  - Card title: “Session”
  - Description text
  - Logout button (destructive variant)
- **Handled events**:
  - Click logout → `POST /api/auth/logout` then redirect.
- **Validation conditions**:
  - Disable while request in-flight.
  - Don’t attempt to parse JSON from `/api/auth/logout` (it returns a redirect in current implementation).
- **Types**:
  - VM: `ProfileLogoutStateVM`
  - (Optional) `ApiErrorResponse` if you decide to enhance `/api/auth/logout` to return JSON for XHR.
- **Props**:
  - `isLoggingOut: boolean`
  - `error?: string`
  - `onLogout(): void`

---

### 5. Types
Use existing DTOs from `src/types.ts` wherever possible. Add **small, view-scoped ViewModels** to keep rendering logic explicit and testable.

#### Existing DTOs (already in `src/types.ts`)
- **`ProfileDTO`**
  - `id: string`
  - `username: string`
  - `selected_level: DifficultyLevel`
  - `created_at: string`
  - `updated_at: string`
- **`UpdateProfileCommand`**
  - `username?: string`
  - `selected_level?: DifficultyLevel`
- **`UserProgressSummaryDTO`**
  - `user_id: string`
  - `selected_level: DifficultyLevel`
  - `level_progress: LevelProgressDTO[]`
  - `can_advance: boolean`
- **`LevelProgressDTO`**
  - `level: DifficultyLevel`
  - `total_count: number`
  - `completed_count: number`
  - `completion_percent: number`
  - `is_up_to_date: boolean`
- **`ApiErrorResponse`**
  - `error.code: string`
  - `error.message: string`
  - `error.details?: Record<string, string>`

#### New ViewModel types (recommended; place in `src/components/profile/profile.types.ts` or inside `ProfileView.tsx`)
- **`ProfileLevelSettingsVM`**
  - `savedLevel: DifficultyLevel` — from `profile.selected_level`
  - `draftLevel: DifficultyLevel` — controlled selection state
  - `isDirty: boolean` — `draftLevel !== savedLevel`
  - `helperText: string` — constant copy from UI plan
- **`ProfileSaveStateVM`**
  - `isSaving: boolean`
  - `error: string | null` — inline (non-toast) error, typically for 400 validation or unexpected errors
- **`ProfileProgressVM`**
  - `selectedLevel: DifficultyLevel`
  - `completionPercent: number` — normalized (0–100)
  - `isUpToDate: boolean` — \(completionPercent \ge 85\)
  - `isEligibleToAdvance: boolean` — \(completionPercent \ge 85\) AND `selectedLevel !== "EXPERIENCED"`
  - `totalCount: number`
  - `completedCount: number`
  - `emptyState: boolean` — `totalCount === 0`
- **`ProfileLogoutStateVM`**
  - `isLoggingOut: boolean`
  - `error: string | null`

---

### 6. State Management
Keep state local to `ProfileView` (no global store needed). Recommended state variables:

- **Level editing**
  - `draftLevel: DifficultyLevel` — initialized from `profile.selected_level`
  - `savedLevel: DifficultyLevel` — derived from `profile.selected_level` initially; update after successful save
  - `isDirty: boolean` — derived
  - `saveState: { isSaving: boolean; error: string | null }`

- **Progress panel** (optional)
  - `progressState: { isLoading: boolean; error: string | null; data: UserProgressSummaryDTO | null }`
  - Derived `ProfileProgressVM` for rendering the selected level’s progress row.

- **Logout**
  - `logoutState: { isLoggingOut: boolean; error: string | null }`

#### Custom hooks (optional but recommended for cleanliness)
- **`useProfileLevelSettings(initialLevel: DifficultyLevel)`**
  - Owns `draftLevel`, `isDirty`, `isSaving`, `saveError`
  - Exposes `setDraftLevel`, `save()` callback
- **`useUserProgressSummary({ enabled, initialData })`**
  - Fetches `GET /api/progress/summary` on mount when enabled
  - Exposes `data`, `isLoading`, `error`, `retry`

---

### 7. API Integration
The Profile view relies on cookie-backed Supabase auth (middleware already establishes session). Follow the existing frontend patterns used by cookbook + completion CTAs.

#### API calls summary (Profile view)
| Call | Purpose | Frontend trigger | Success UX |
|---|---|---|---|
| `PATCH /api/profile` | Persist selected level | Click **Save level** | Toast success + disable Save |
| `GET /api/progress/summary` (optional) | Load completion/status | `useEffect` on mount | Render progress card |
| `POST /api/auth/logout` | End session | Click **Log out** | Redirect away from protected pages |

#### 7.1 Update selected level
**Endpoint (required; not currently present in `src/pages/api/`)**
- **Method**: `PATCH`
- **Path**: `/api/profile`
- **Auth**: required
- **Request type**: `UpdateProfileCommand`
  - Send only `{ selected_level: DifficultyLevel }`
- **Success response type**: `ProfileDTO` (updated profile)
- **Error response type**: `ApiErrorResponse`

**Frontend behavior**
- On click “Save level”:
  - `PATCH /api/profile` with JSON body
  - `401` → redirect `/login`
  - `400` → show inline field/general error (map `error.details.selected_level` if present)
  - `409` (if you ever support username change here) → show inline error
  - `429`/`>=500`/network → `toast.error(...)`
  - Success → update local `savedLevel`, clear errors, `toast.success("Level updated")`

#### 7.2 Fetch progress summary (optional, but required to satisfy US-007/009/FR-021)
**Endpoint (recommended to add)**
- **Method**: `GET`
- **Path**: `/api/progress/summary` (or `/api/profile/progress`—pick one and standardize)
- **Auth**: required
- **Response type**: `UserProgressSummaryDTO`
- **Error response type**: `ApiErrorResponse`

**Frontend behavior**
- Fetch on mount (or use `initialProgressSummary` passed from Astro).
- Use `level_progress` to locate the row for `selected_level`:
  - If not found, treat as empty: completion 0, status unknown → show “Progress coming later” or “No content”.
- Must handle `total_count === 0` (show 0%, avoid divide-by-zero concerns).

#### 7.3 Logout
**Existing endpoint**
- **Method**: `POST`
- **Path**: `/api/auth/logout`
- **Current behavior**: redirect response (303) to `/` on success.

**Frontend behavior**
- Prefer `<form method="POST" action="/api/auth/logout">` for simplest correct behavior, or:
  - `fetch('/api/auth/logout', { method: 'POST' })` then set `window.location.href = '/login'` or `/`
  - Do **not** parse JSON from this endpoint unless the endpoint is changed to return JSON for XHR.

---

### 8. User Interactions
- **View profile**
  - User navigates to `/profile`.
  - If authenticated: sees account info, current level, and actions.
  - If not authenticated: redirected to `/login`.

- **Change selected level (draft)**
  - User selects a different option in `LevelSelector`.
  - UI updates immediately (draft state) but does **not** persist.
  - Save button becomes enabled and shows that there are unsaved changes.

- **Save level**
  - User clicks “Save level”.
  - Button shows loading state; selector disabled during request.
  - On success: toast “Level updated”; Save button disables; draft becomes saved.
  - Follow-up expectation: when user returns to Home, recommendations use the new level.

- **Logout**
  - User clicks “Log out”.
  - UI disables button while logging out.
  - On success: user is redirected (to `/` or `/login`), and protected pages subsequently redirect to `/login`.

- **Progress panel (if enabled)**
  - Shows completion %, up-to-date/out-of-date state, and eligibility to advance.
  - On error: show an inline error block + “Retry” button; transient errors may also trigger toasts.

---

### 9. Conditions and Validation
These conditions must be enforced in the UI (guard clauses + disabled states) and mirrored by the API.

- **Auth conditions**
  - `/profile` is protected; additionally, any XHR call must handle `401` by redirecting to `/login`.

- **Level update constraints**
  - `selected_level` must be one of `DifficultyLevel`.
  - Save must be explicit (no auto-save on change).
  - Save must be disabled when not dirty.

- **Progress/status rules (PRD)**
  - **Up to date**: completion \( \ge 85\% \)
  - **Out of date**: completion \( < 85\% \)
  - **Eligible to advance**: completion \( \ge 85\% \) AND selected level is not `EXPERIENCED`
  - **Empty catalog**: if `total_count === 0`, display 0% and avoid misleading eligibility/out-of-date messaging (show neutral copy).

---

### 10. Error Handling
Handle errors consistently with existing cookbook and completion CTA patterns.

- **401 Unauthorized**
  - Redirect to `/login` immediately from any profile mutation/fetch.

- **400 Validation errors (level save)**
  - Parse `ApiErrorResponse`.
  - If `error.details.selected_level` exists → show inline near the level selector.
  - Else show a general inline error in the LevelSettingsCard.
  - Keep draft selection intact.

- **429 Rate limit**
  - `toast.error("Too many requests. Please try again in a moment.")`
  - Keep UI stable; allow retry.

- **500+ / network**
  - `toast.error("Something went wrong. Please try again.")` or connection-specific copy.
  - Keep the user’s current selection; do not reset draft state.

- **Progress fetch failures**
  - Show an inline error state with “Retry”.
  - Do not block level changing or logout.

---

### 11. Implementation Steps
1. **Confirm route protection** stays consistent:
   - `/profile` remains in middleware’s protected paths and `profile.astro` keeps its defensive redirect.
2. **Refactor `ProfileView` into clear sub-sections** (either extracted components or internal components):
   - Account summary card
   - Level settings card (reuse `LevelSelector`)
   - Progress panel (optional)
   - Session/logout card
3. **Implement level draft + explicit save flow**:
   - Initialize `draftLevel` from `profile.selected_level`
   - Compute `isDirty`
   - Disable Save when not dirty or while saving
4. **Add the profile update API integration**:
   - Call `PATCH /api/profile` with `UpdateProfileCommand` \(`{ selected_level }`\)
   - Handle 401/400/429/500/network per patterns used in cookbook views
   - On success: update local `savedLevel`, show toast
5. **Implement (or gate) ProgressPanel**:
   - If you add `GET /api/progress/summary`, fetch on mount via a small hook
   - Render completion, up-to-date/out-of-date, eligibility to advance
   - If endpoint not present yet, render “Progress coming later” (no misleading placeholders)
6. **Align logout behavior with existing `/api/auth/logout` implementation**:
   - Prefer form-based POST or a fetch that does not expect JSON
   - Redirect to `/` or `/login` after completion
7. **Polish UX details**:
   - Helper copy under selector: “Changing your level will change recommendations.”
   - Toasts on successful save/logout (logout toast optional)
   - Make sure focus/disabled states are accessible
8. **Verify user-story coverage**:
   - US-007: selected level visible; progress visible if endpoint enabled
   - US-008: level change + confirm/save updates stored value
   - US-009: eligibility indicator shows at 85% for non-experienced levels

#### Potential challenges and suggested solutions
- **Missing backend endpoints for profile/progress**:
  - Solution: add `PATCH /api/profile` and `GET /api/progress/summary` Astro API routes using `context.locals.supabase` + Zod validation (consistent with existing API route patterns).
- **Logout endpoint returns a redirect (not JSON)**:
  - Solution: implement logout as a form POST or a fetch that does not parse JSON; rely on redirect + client navigation.
- **Ensuring “home recommendations update” after level change**:
  - Solution: after a successful save, show a toast that clarifies the effect and optionally add a “Go to Home” link/button; Home should naturally reflect the updated level on next navigation because middleware reloads `locals.profile` each request.
- **Progress edge cases (empty catalogs / missing row)**:
  - Solution: treat `total_count === 0` (or missing level entry) as 0% with neutral copy; avoid “out of date” or “eligible” messaging when there’s no content to complete.
