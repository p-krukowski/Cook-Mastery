## API Endpoint Implementation Plan: List Cookbook Entries (`GET /api/cookbook`)

### 1. Endpoint Overview
- **Purpose**: Retrieve a paginated list of cookbook entries saved by the **authenticated** user.
- **Behavior**:
  - Requires a valid authenticated Supabase user.
  - Supports sorting and pagination.
  - Returns entries scoped to the requesting user only.

### 2. Request Details
- **HTTP Method**: `GET`
- **URL**: `/api/cookbook`
- **Authentication**: **Required**
- **Query Parameters**:
  - **Optional**
    - `sort`: Sort order (default: `newest`)
      - Allowed: `newest` | `oldest` | `title_asc`
    - `page`: Page number (default: `1`)
    - `limit`: Items per page (default: `20`, max: `100`)
- **Request Body**: None

### 3. Response Details
#### Success (200)
- **Body**: `ListCookbookEntriesResponseDTO`

```json
{
  "entries": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "url": "https://example.com/recipe/pasta-carbonara",
      "title": "Authentic Pasta Carbonara",
      "notes": "Remember to use guanciale instead of bacon",
      "created_at": "2026-01-17T18:00:00Z",
      "updated_at": "2026-01-17T18:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_items": 15,
    "total_pages": 1
  }
}
```

#### Error Responses
- **400**: Invalid query parameters (Zod validation failure)
- **401**: Not authenticated (no user in Supabase session)
- **500**: Unexpected server/database error

### 4. Used Types (DTOs + Command Models)
- **From `src/types.ts`**
  - `ListCookbookEntriesParams`
  - `ListCookbookEntriesResponseDTO`
  - `CookbookEntryDTO`
  - `PaginationMeta`
  - `ApiErrorResponse`

> No command model is needed for a read-only list endpoint.

### 5. Data Flow
#### Route handler (`src/pages/api/cookbook/index.ts`)
1. **Disable prerendering** with `export const prerender = false`.
2. Parse query params from `new URL(context.request.url).searchParams`.
3. **Validate** query params with Zod (type coercion + defaults):
   - `sort`: enum `['newest','oldest','title_asc']`, default `newest`
   - `page`: `z.coerce.number().int().positive()`, default `1`
   - `limit`: `z.coerce.number().int().min(1).max(100)`, default `20`
4. **Authenticate** using Supabase from `context.locals.supabase`:
   - Call `supabase.auth.getUser()`.
   - If `user` is missing, return `401` with `{ error: { code: 'UNAUTHORIZED', ... } }`.
5. Call service `listCookbookEntries(supabase, validatedParams, user.id)`.
6. Return `200` JSON response.
   - Recommended headers:
     - `Content-Type: application/json`
     - `Cache-Control: private, no-cache` (user-specific data)

#### Service (`src/lib/services/cookbook.service.ts`)
1. Build query:
   - `from('cookbook_entries')`
   - `select('id, user_id, url, title, notes, created_at, updated_at', { count: 'exact' })`
   - `eq('user_id', userId)` (defense-in-depth, even with RLS)
2. Apply sorting (include a secondary tie-breaker for stable pagination):
   - `newest` (default): `order('created_at', { ascending: false }).order('id', { ascending: false })`
   - `oldest`: `order('created_at', { ascending: true }).order('id', { ascending: true })`
   - `title_asc`: `order('title', { ascending: true }).order('created_at', { ascending: false }).order('id', { ascending: false })`
3. Apply pagination using `range(from, to)`:
   - `from = (page - 1) * limit`
   - `to = from + limit - 1`
4. Execute query; on Supabase error, throw a generic error (don’t leak internals).
5. Map rows to `CookbookEntryDTO[]` (should already match selected columns).
6. Compute `PaginationMeta`:
   - `total_items = count ?? 0`
   - `total_pages = Math.ceil(total_items / limit)`
7. Return `ListCookbookEntriesResponseDTO`.

### 6. Security Considerations
- **Authentication required**:
  - Must return **401** if no authenticated user session exists.
- **Authorization / data isolation**:
  - Database RLS policy for `public.cookbook_entries` restricts access to `auth.uid() = user_id`.
  - Still explicitly filter by `user_id` in the service to reduce risk from future policy changes/misconfiguration.
- **Input validation**:
  - Strictly constrain `sort` to known values.
  - Constrain `limit` to max 100 to reduce DoS risk.
  - Require `page`/`limit` to be positive integers.
- **Data leakage prevention**:
  - Return generic 500 messages; do not include SQL/Supabase error details in responses.
  - Use private/no-cache headers to prevent intermediary caching of user-specific responses.

### 7. Error Handling
#### Error formatting
- Use existing utilities from `src/lib/utils/error-handler.ts`:
  - `formatZodError()` for 400 validation failures
  - `createErrorResponse()` + `createJsonResponse()` for standardized errors
  - `logError()` for server-side logging

#### Logging to an error table
- **Not applicable currently**: the DB plan does not define an application “errors” table.
- **Current approach**:
  - Use `logError('GET /api/cookbook', error, { url, userId })` for server logs.
- **Future enhancement (optional)**:
  - Add an `app_errors` table and insert structured error events from API routes/services (include request id, user id, route, timestamp, error code).

#### Status code mapping (must follow project rules)
- **400**: Zod validation fails for query parameters.
- **401**: Missing/invalid session (no `user` returned from `supabase.auth.getUser()`).
- **500**: Supabase query errors, unexpected exceptions, serialization errors.

### 8. Performance
- **Indexes**:
  - DB plan includes indexes on `cookbook_entries.user_id` and `cookbook_entries.created_at`; these support filtering + created_at sorts.
  - `title_asc` may benefit from an additional index on `(user_id, title)` if the dataset grows; defer until needed.
- **Pagination**:
  - Uses offset pagination (`range(from, to)`), which is fine for MVP. If very large lists become slow, consider keyset pagination later.
- **Counting**:
  - Uses `count: 'exact'` to compute `total_items`. If this becomes expensive at scale, consider `planned_count`/cached counts or alternative strategies.

### 9. Implementation Steps
1. **Create service** `src/lib/services/cookbook.service.ts`
   - Export `listCookbookEntries(supabase: SupabaseClient, params: ListCookbookEntriesParams, userId: string): Promise<ListCookbookEntriesResponseDTO>`.
   - Implement filtering (`user_id`), sorting, pagination, and pagination meta computation.
2. **Create API route** `src/pages/api/cookbook/index.ts`
   - `export const prerender = false`
   - Implement Zod `ListCookbookEntriesQuerySchema` with coercion + defaults.
   - Authenticate via `context.locals.supabase.auth.getUser()`, return 401 if missing.
   - Call `listCookbookEntries` and return 200.
   - Use `formatZodError`/`createErrorResponse`/`createJsonResponse`/`logError` for consistent errors.
3. **Consistency checks**
   - Ensure the response shape exactly matches `ListCookbookEntriesResponseDTO` and the API spec (`entries` + `pagination`).
   - Ensure `limit` defaults to 20 and maxes at 100; `page` defaults to 1; `sort` defaults to `newest`.
4. **Manual verification (developer test plan)**
   - Unauthenticated request: `GET /api/cookbook` → **401**
   - Default request (authenticated): `GET /api/cookbook` → **200**, `sort=newest`, `page=1`, `limit=20`
   - Sorting:
     - `?sort=oldest` returns oldest first
     - `?sort=title_asc` returns alphabetical by title
   - Pagination:
     - `?page=2&limit=5` returns 5 entries (or fewer) and correct `total_pages`
   - Validation:
     - `?limit=1000` → **400**
     - `?page=0` → **400**
     - `?sort=invalid` → **400**
