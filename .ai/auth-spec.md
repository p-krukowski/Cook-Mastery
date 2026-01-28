# Cook Mastery — Authentication Architecture Specification

Last updated: 2026-01-28  
Stack: Astro 5 (SSR `output: "server"` + `@astrojs/node` standalone), TypeScript 5, React 19, Tailwind 4, shadcn/ui, Supabase (`@supabase/supabase-js` + `@supabase/ssr`)

This document defines the **target architecture** (UI + API + server/middleware + Supabase Auth integration) for:

- **Signup** (US-001)
- **Login** with **email or username** (US-002)
- **Logout** (US-003)
- **Secure, persistent sessions** with HttpOnly cookies (US-004)
- **Protection of authenticated-only features** (US-006)

This is a **technical specification** only (no implementation). It is designed to be compatible with existing docs and code patterns:

- API routes use **Zod** validation and `src/lib/utils/error-handler.ts` error DTO formatting.
- Existing API routes already call `context.locals.supabase.auth.getUser()` (e.g. cookbook endpoints). The architecture below ensures this becomes **correct and reliable** via cookie-backed SSR clients.

---

## 0. Requirements & constraints (from PRD/UI/API plans)

### 0.1 PRD acceptance criteria covered

- **US-001 Signup**:
  - Valid email, non-empty username, password meeting policy, selected level required.
  - Duplicate email: clear error.
  - Duplicate username: clear error.
  - Invalid email format rejected.
  - Missing level rejected.
  - After signup: authenticated + redirect to `/`.
- **US-002 Login**:
  - Identifier is email or username + password.
  - Incorrect credentials => **generic error** (no account enumeration).
  - After login: authenticated + redirect to `/` (MVP decision in UI plan).
- **US-003 Logout**:
  - Session invalidated.
  - Protected pages redirect to `/login` after logout.
- **US-004 Session security**:
  - Session persists across refresh.
  - Cookies: **HttpOnly**, **Secure in prod**, **SameSite** policy.
- **US-006 Restrict authenticated-only features**:
  - Protected **API** actions reject unauthenticated.
  - Protected **pages** redirect unauthenticated to `/login`.

### 0.2 PRD-derived decisions that must be made explicit (to avoid implementation traps)

These are not “extra features”; they are required to make the PRD user stories implementable with Supabase Auth.

- **Email verification is out of scope (PRD §4.1)**:
  - Therefore, Supabase Auth **must be configured for MVP** so that signup results in an immediate authenticated session.
  - **Decision**: Disable “Confirm email” / email confirmation in Supabase Auth settings for MVP (or equivalently enable auto-confirm in environments where that’s supported).
- **Public reading vs authenticated interaction (PRD FR-005)**:
  - Reading/browsing content may remain public.
  - Only “interactions” (progress actions, cookbook CRUD, profile editing) are authenticated-only.
- **Username uniqueness and username-login semantics (PRD US-001/US-002)**:
  - Duplicate username must be rejected reliably (not just best-effort).
  - Login by username must use the **same normalization** as the uniqueness rule.

---

## 1. User Interface Architecture

### 1.1 Route map (Astro pages)

#### Public routes (no auth required)

- `src/pages/index.astro` (`/`)
  - Must render correctly for anonymous and authenticated users.
  - Home view already follows the “React island inside Astro page” model.
- `src/pages/login.astro` (`/login`) **(new)**
- `src/pages/signup.astro` (`/signup`) **(new)**

#### Protected routes (auth required)

These are defined by the UI plan and PRD stories (even if not all pages exist yet):

- `/cookbook`, `/cookbook/new`, `/cookbook/:id`
- `/profile`

**Protection behavior** (must be consistent everywhere):

- If not authenticated, server redirects to `/login`.
- Post-auth redirect is **always `/`** (MVP decision). We do not preserve deep-link redirects in MVP.

### 1.2 Layout behavior in auth vs non-auth mode

#### `src/layouts/Layout.astro` (existing)

Responsibilities:

- Provide global shell and include `Navbar`.
- Remain SSR-safe (no reliance on browser-only auth state).

Auth-aware extension:

- Layout (or `Navbar`) reads **server-derived** auth state from `Astro.locals`:
  - `locals.user` (Supabase auth user)
  - `locals.profile` (DB profile: username, selected_level)

#### `src/components/nav/Navbar.astro` (existing; to be extended)

Current state: shows “Log in” / “Sign up” unconditionally with a TODO.

Target behavior:

- **Anonymous**:
  - Show “Log in” and “Sign up” links.
- **Authenticated**:
  - Replace those with:
    - Username (links to `/profile`)
    - Optionally: a “Log out” button (only on `/profile` per UI plan)

Important: `Navbar.astro` should stay **Astro-only** and derive auth state server-side to avoid flicker and to match SSR constraints.

### 1.3 Forms vs React vs Astro: separation of responsibilities

#### Astro pages (`/login`, `/signup`)

Responsibilities:

- Routing, SSR guards (e.g., redirect away if already logged in).
- Page metadata (`<title>`) and consistent layout.
- Hosting the React island(s) that implement the actual form UX.

Non-responsibilities:

- Pages do not call Supabase Auth directly from the browser.
- Pages do not store access/refresh tokens in browser storage.

#### React form components (`AuthFormLogin`, `AuthFormSignup`, etc.)

Location (proposed):

- `src/components/auth/` for auth-related islands and reusable form pieces.

Responsibilities:

- Render accessible form UIs using shadcn/ui primitives.
- Client-side validation for fast feedback (mirrors server Zod rules).
- Submit to **server API endpoints** (same-origin fetch) and handle:
  - field errors (inline)
  - generic errors (toast / banner)
  - success navigation (redirect to `/`)
  - 401/403/429 behaviors (see below)

Non-responsibilities:

- No direct Supabase token handling.
- No reliance on `localStorage` session persistence (conflicts with PRD HttpOnly cookie requirement).

#### Reusable UI building blocks

Proposed components (aligns with UI plan naming):

- `AuthFormLogin`
  - Inputs: `identifier`, `password`
  - Links: `/signup`
- `AuthFormSignup`
  - Inputs: `email`, `username`, `password`, `selected_level`
  - Uses `LevelSelector`
- `LevelSelector`
  - Single-select enum: `BEGINNER` | `INTERMEDIATE` | `EXPERIENCED`
- `InlineFieldError`
  - Renders `ApiErrorResponse.error.details[field]` when present

### 1.4 UI validation rules and error messages

Client-side validation must match server-side behavior, but **server remains source of truth**.

#### Signup (`/signup`)

Validation:

- `email`: required, valid email format
- `username`: required, non-empty; recommended rule set (from API plan):
  - allowed: alphanumeric + underscore
  - recommended length: 3–20 (exact bounds can be defined in server schema)
- `password`: required, minimum policy
  - Baseline: **min 8 chars** (API plan notes Supabase default)
- `selected_level`: required enum

Error messages (examples; exact copy can be tweaked, but semantics must hold):

- Invalid email: “Enter a valid email address.”
- Missing username: “Username is required.”
- Missing level: “Select a starting level.”
- Weak password: “Password must be at least 8 characters.”
- Duplicate email: “An account with this email already exists.”
- Duplicate username: “That username is already taken.”

Post-success:

- Redirect to `/` immediately (MVP).

#### Login (`/login`)

Validation:

- `identifier`: required (email or username)
- `password`: required

Error messages:

- Invalid credentials (generic): “Invalid credentials.”
  - Must be returned for:
    - unknown username
    - unknown email
    - wrong password

Post-success:

- Redirect to `/` immediately (MVP).

#### Protected feature UX

For client-side actions that call protected APIs (e.g., cookbook CRUD, completion actions):

- If API returns `401 UNAUTHORIZED`:
  - Redirect to `/login` (UI plan requirement).
  - Do not attempt to “recover” client-side; auth is server-based.

### 1.5 Key UI scenarios (must be handled)

- **Anonymous user visits `/cookbook` or `/profile`**:
  - Server redirect to `/login` (no partial render).
- **Logged-in user visits `/login` or `/signup`**:
  - Server redirect to `/` (avoid showing irrelevant forms).
- **User refreshes any page after login**:
  - Must remain logged in (cookie-backed session refresh).
- **Logout then refresh**:
  - Must be logged out; protected pages redirect to `/login`.
- **Existing public browsing remains intact**:
  - Tutorials/articles remain publicly viewable.
  - Only authenticated-only actions are gated.

---

## 2. Backend Logic (API + services + SSR)

### 2.1 API endpoint structure (Astro API routes)

All endpoints:

- Live under `src/pages/api/**`
- Must set `export const prerender = false`
- Must:
  - Validate inputs with Zod
  - Format errors using `src/lib/utils/error-handler.ts`
  - Return errors in the shared `ApiErrorResponse` shape (`src/types.ts`)

#### Auth endpoints (new)

Proposed:

- `POST /api/auth/signup` → `src/pages/api/auth/signup.ts`
  - Request: `SignUpCommand`
  - Response: `SignUpResponseDTO` (or minimal success message if we choose not to return session payload to client)
- `POST /api/auth/login` → `src/pages/api/auth/login.ts`
  - Request: `LoginCommand`
  - Response: `LoginResponseDTO` (or minimal success message)
- `POST /api/auth/logout` → `src/pages/api/auth/logout.ts`
  - Response: `LogoutResponseDTO`
- `GET /api/auth/session` → `src/pages/api/auth/session.ts`
  - Response: `GetSessionResponseDTO`
  - Used by client islands if they need to render user-aware UI without SSR data injection (optional).

### 2.2 Service layer modules (backend)

To match existing patterns (`src/lib/services/*.service.ts`), introduce:

- `src/lib/services/auth.service.ts` (proposed)
  - `signUpWithProfile(command: SignUpCommand): Promise<SignUpResponseDTO>`
  - `loginWithIdentifier(command: LoginCommand): Promise<LoginResponseDTO>`
  - `logout(): Promise<LogoutResponseDTO>`
  - `getSessionContext(): Promise<GetSessionResponseDTO>`

### 2.3 Input validation mechanism

Zod schemas (kept close to API routes, matching existing code style):

- `SignUpBodySchema`
- `LoginBodySchema`
- `LogoutSchema` (no body)

Validation output:

- On validation failure, return:
  - HTTP 400
  - `ApiErrorResponse` with:
    - `code: "VALIDATION_ERROR"`
    - `details` keyed by field name (as `formatZodError` does)

### 2.4 Exception handling and error mapping

Use a consistent mapping across auth endpoints:

- `UNAUTHORIZED` (401): missing/invalid session for endpoints that require auth (logout/session if strict)
- `VALIDATION_ERROR` (400): invalid input payload
- `CONFLICT` (409): duplicate email/username on signup
- `INTERNAL_SERVER_ERROR` (500): unexpected failures

Sensitive information policy:

- Login must never reveal whether the account exists.

### 2.6 SSR updates for auth-aware rendering (Astro `output: "server"`)

Astro is configured for SSR (`astro.config.mjs` sets `output: "server"` with Node adapter).  
Therefore:

- Any page that depends on per-user auth state must be **non-prerendered**.
- API routes already set `prerender = false` and must remain so.

For selected pages:

- `/profile`, `/cookbook*` (protected): SSR redirect if not authenticated.
- `/` (public): may render differently when authenticated (recommended sections), but can also remain client-fetched; both are compatible with SSR.

---

## 3. Authentication System (Supabase Auth + Astro)

### 3.1 Core design: server-owned sessions via HttpOnly cookies

To satisfy US-004 (HttpOnly session cookies), **the server owns session tokens** and the browser never stores tokens in JS-accessible storage.

Implications:

- Client-side React components authenticate by calling same-origin **API routes**.
- API routes and SSR pages read session from **HttpOnly cookies**.
- Supabase client used on the server must be created **per request**, wired to:
  - read cookies from incoming request
  - write refreshed/updated cookies to the response

### 3.2 Supabase client layering (proposed modules)

Current code uses a single global `supabaseClient` (`src/db/supabase.client.ts`) injected into `locals` via middleware. This is insufficient for cookie-backed sessions.

Proposed layered clients:

- `src/db/supabase.server.ts` (new)
  - `createSupabaseServerClient(context)`:
    - uses request cookies for auth
    - sets response cookies when auth state changes (login/logout/refresh)
- `src/db/supabase.admin.ts` (new)
  - `supabaseAdminClient` created with **service role key** for server-only operations:
    - lookup email by username (via profile id → auth admin getUserById)
    - rollback orphaned auth users on failed signup profile creation (best-effort)

Note on file placement:

- It is also acceptable to **extend** the existing `src/db/supabase.client.ts` to export a `createSupabaseServerClient(...)` (or `createSupabaseServerInstance(...)`) factory, as long as the behavior matches this spec.

Implementation note (important for feasibility):

- `@supabase/supabase-js` does **not** automatically integrate with Astro SSR cookies by itself.
- Implement `createSupabaseServerClient(context)` using `@supabase/ssr` (`createServerClient`) so that:
  - `locals.supabase.auth.getUser()` is reliable on SSR pages and API routes
  - login/logout correctly set/clear the HttpOnly session cookies
- Cookie integration constraints (required for correctness with Astro + `@supabase/ssr`):
  - Use **only** `cookies.getAll()` and `cookies.setAll()` adapters.
  - Do **not** use individual cookie `get`/`set`/`remove` methods in the adapter layer.
  - Do **not** use `@supabase/auth-helpers-*` packages in this repo.

Authorization boundary (PRD data privacy requirements, e.g. US-030 cookbook privacy):

- All user-owned application data access (cookbook CRUD, progress actions, profile reads/updates) must use the **request-scoped server client with the anon key**, so that **RLS policies apply**.
- The **service role** client must be used only for narrowly scoped server-only tasks (e.g., `auth.admin.getUserById`, cleanup on partial signup failure). It must never be used for normal user data queries or writes.

Environment variables:

- Existing:
  - `SUPABASE_URL`
  - `SUPABASE_KEY` (anon)
- New (server-only):
  - `SUPABASE_SERVICE_ROLE_KEY`

### 3.3 Middleware responsibilities (`src/middleware/index.ts`)

Target responsibilities:

- Create request-scoped Supabase server client and assign:
  - `context.locals.supabase`
- Populate:
  - `context.locals.user` (from `supabase.auth.getUser()`)
  - `context.locals.profile` (from `public.profiles`, when user exists)
- Optionally refresh session if needed (token refresh):
  - must write updated cookies to the response

Route protection:

- Middleware can implement **route-level guards** for protected pages:
  - If request path is protected and no user: redirect to `/login`.
  - This complements (or can replace) per-page guards.

### 3.4 Signup flow (US-001)

Server endpoint: `POST /api/auth/signup`

Steps:

1. Validate input (email, username, password, selected_level).
2. Check username availability in `public.profiles` (case-insensitive recommended).
3. Call `supabase.auth.signUp({ email, password, options })`.
   - `options.data` may include `username` and `selected_level` as metadata (optional; useful for future DB triggers).
4. Create `public.profiles` row:
   - `id = user.id`
   - `username`
   - `selected_level`
5. Establish session cookies for the created session.
6. Return success.

Conflict handling:

- Duplicate email:
  - Return `409 CONFLICT` with message “An account with this email already exists.”
- Duplicate username:
  - Return `409 CONFLICT` with message “That username is already taken.”

Supabase Auth setting requirement (from PRD out-of-scope):

- Because “email verification” is out of scope, Supabase must be configured so `signUp()` returns an authenticated session for MVP.
- If Supabase email confirmation is enabled, signup may create a user without a session, which would violate PRD US-001 (“After successful signup, I am authenticated…”).

Atomicity note:

- Supabase Auth + DB insert are not automatically transactional together.
- Best-effort mitigation:
  - Pre-check username before creating auth user.
  - If profile insert fails after auth user creation, attempt to delete the auth user via admin client (best-effort cleanup).
  - Longer-term option: move profile creation to a DB trigger on auth user creation (post-MVP), using metadata.

### 3.5 Login flow (US-002) with email OR username

Server endpoint: `POST /api/auth/login`

Steps:

1. Validate input (`identifier`, `password`).
2. Resolve identifier:
   - If identifier matches email format: treat as email.
   - Else treat as username:
     - Normalize username using the same rule as signup.
     - Query `public.profiles` for the normalized username to get `profile.id` (user id).
     - Use admin client to call `auth.admin.getUserById(profile.id)` to obtain the user’s email.
3. Call `supabase.auth.signInWithPassword({ email, password })`.
4. Set session cookies (HttpOnly).
5. Return success.

Error policy:

- Any failure at steps 3–4 must return the **same generic invalid credentials error**:
  - HTTP 401 + `code: "UNAUTHORIZED"` (or a dedicated `INVALID_CREDENTIALS` code if introduced later)
  - message: “Invalid credentials.”

This satisfies the PRD requirement to avoid revealing whether the account exists.

### 3.6 Logout flow (US-003)

Server endpoint: `POST /api/auth/logout`

Steps:

1. Call `supabase.auth.signOut()`.
2. Clear session cookies (set expired cookies for the same cookie names).
3. Return `{ "message": "Logged out" }`.

### 3.7 Session persistence + refresh (US-004)

Mechanism:

- Session stored in HttpOnly cookies.
- Middleware must:
  - read cookies
  - validate/refresh tokens when necessary
  - update cookies in response

Cookie policy:

- `HttpOnly: true`
- `Secure: true` in production (must allow insecure cookies in local HTTP dev)
- `SameSite: Lax` (recommended baseline)
- `Path: /`

---

## 4. Contracts (types and payload shapes)

Use existing shared DTOs from `src/types.ts`:

- `SignUpCommand`, `SignUpResponseDTO`
- `LoginCommand`, `LoginResponseDTO`
- `LogoutResponseDTO`
- `GetSessionResponseDTO`
- `ApiErrorResponse` with `code`, `message`, optional `details`

HTTP codes must match the error code semantics already used throughout the API:

- 400 → `VALIDATION_ERROR`
- 401 → `UNAUTHORIZED`
- 409 → `CONFLICT`
- 429 → `RATE_LIMIT_EXCEEDED`
- 500 → `INTERNAL_SERVER_ERROR`

---

## 5. Compatibility checklist (must not break existing behavior)

- Existing public API routes (e.g. `GET /api/articles`) must remain public:
  - Anonymous users still receive content.
  - Authenticated users may receive additional per-user fields (completion) if implemented.
- Existing authenticated-only API routes (e.g. `/api/cookbook`) already return 401 when `supabase.auth.getUser()` has no user:
  - The new cookie-backed SSR auth must make this reliable.
- Navbar must not rely on client-side token state:
  - Use SSR `Astro.locals` to render correct UI in both modes.
- Redirect rules must match UI plan:
  - After login/signup, redirect to `/` (MVP).
  - Protected routes redirect to `/login` when unauthenticated.

