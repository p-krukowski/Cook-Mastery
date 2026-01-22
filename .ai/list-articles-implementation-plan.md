## API Endpoint Implementation Plan: List Articles (`GET /api/articles`)

### 1. Endpoint Overview
- **Purpose**: Return a **paginated list of articles** with optional filtering by difficulty level and sorting.
- **Auth**: **Not required** (public endpoint).
- **User-specific enrichment (optional)**: If a user is authenticated and `include_completed=true`, include per-article completion fields (`is_completed`, `completed_at`) derived from `public.user_articles`.
- **Primary data source**: `public.articles`
- **Optional enrichment source**: `public.user_articles` (many-to-many completion tracking)

---

### 2. Request Details
- **HTTP Method**: `GET`
- **URL**: `/api/articles`
- **Query Parameters**
  - **Required**: none
  - **Optional**:
    - **`level`**: `BEGINNER | INTERMEDIATE | EXPERIENCED`
    - **`sort`**: `difficulty_asc | newest`
      - Default: `difficulty_asc`
      - `difficulty_asc`: order by `difficulty_weight` ascending, then `created_at` descending
      - `newest`: order by `created_at` descending
    - **`page`**: positive integer, default `1`
    - **`limit`**: integer `1..100`, default `20`
    - **`include_completed`**: boolean, default `true`

---

### 3. Used Types (DTOs and Command Models)
- **Existing shared types (from `src/types.ts`)**
  - **`ListArticlesParams`**: query params shape used by service layer
  - **`ListArticlesResponseDTO`**: API response shape
  - **`ArticleListItemDTO`**: list item shape including `is_completed` and `completed_at`
  - **`PaginationMeta`**: `page`, `limit`, `total_items`, `total_pages`
  - **`DifficultyLevel`**: enum type for `level`
  - **`ApiErrorResponse`** and `ApiErrorCode` (used indirectly via error utilities)
- **No new command model** is required (GET endpoint, no body).

---

### 4. Response Details
- **Success (200 OK)**:
  - Body matches **`ListArticlesResponseDTO`**:
    - `articles`: `ArticleListItemDTO[]` where each item includes:
      - `id`, `title`, `level`, `difficulty_weight`, `summary`, `created_at`
      - `is_completed`: boolean
      - `completed_at`: ISO string or `null`
    - `pagination`: `PaginationMeta`
- **Client error (400 Bad Request)**:
  - When query parameters fail validation (invalid enum, non-numeric page/limit, limit > 100, etc.)
  - Use the standard error format (`ApiErrorResponse`) with code `VALIDATION_ERROR`
- **Server error (500 Internal Server Error)**:
  - Unexpected failures querying Supabase / internal exceptions
  - Use the standard error format (`ApiErrorResponse`) with code `INTERNAL_SERVER_ERROR`

---

### 5. Data Flow
1. **API Route** (`src/pages/api/articles/index.ts`)
   - Parse query string via `new URL(context.request.url).searchParams`
   - Validate/coerce query params using **Zod** (mirroring `GET /api/tutorials`)
   - Obtain Supabase client from `context.locals.supabase` (per middleware pattern)
   - Optionally attempt to resolve authenticated user:
     - `const { data: { user } } = await supabase.auth.getUser()`
     - On auth-check failure, continue as anonymous (public endpoint)
   - Call service: `listArticles(supabase, validatedParams, user?.id)`
   - Return JSON response with cache headers:
     - Anonymous: `Cache-Control: public, max-age=600`
     - Authenticated (user-specific fields): `Cache-Control: private, no-cache`

2. **Service Layer** (`src/lib/services/article.service.ts`)
   - Input: `supabase: SupabaseClient`, `params: ListArticlesParams`, `userId?: string`
   - Query `public.articles`:
     - Select only list fields: `id, title, level, difficulty_weight, summary, created_at`
     - Request count: `{ count: "exact" }`
     - Apply filters:
       - If `level` provided: `.eq("level", level)`
     - Apply sorting:
       - `difficulty_asc`: `.order("difficulty_weight", { ascending: true }).order("created_at", { ascending: false })`
       - `newest`: `.order("created_at", { ascending: false })`
     - Apply pagination using `.range(from, to)` with:
       - `from = (page - 1) * limit`
       - `to = from + limit - 1`
   - Optionally query completions from `public.user_articles` (only if `userId && include_completed`):
     - Recommended: query only for the returned article IDs:
       - `.select("article_id, completed_at").eq("user_id", userId).in("article_id", articleIds)`
     - Build lookup map: `articleId -> completed_at`
   - Map DB rows into `ArticleListItemDTO[]`:
     - `is_completed = completionMap.has(id)`
     - `completed_at = completionMap.get(id) ?? null`
   - Compute `PaginationMeta`:
     - `total_items = count ?? 0`
     - `total_pages = Math.ceil(total_items / limit)` (0 when `total_items === 0` is acceptable; keep consistent with existing list endpoints)
   - Return `ListArticlesResponseDTO`

---

### 6. Security Considerations
- **RLS alignment with “public endpoint”**
  - The DB plan indicates `public.articles` SELECT may be restricted (example policy mentions authenticated-only access).
  - To implement a truly public endpoint with the existing middleware/client setup (anon key), ensure **RLS allows `SELECT` for anonymous** users on `public.articles`.
  - If policy must remain authenticated-only, the endpoint would require either:
    - changing the API spec to require authentication, or
    - using a server-only Supabase client (service role) in server endpoints (higher risk; requires strict secret handling and should not be exposed to the browser).
- **Parameter allowlisting**
  - Constrain `level` and `sort` via Zod enums to prevent arbitrary ordering/filtering behavior.
  - Clamp `limit` to max 100 to reduce data exfiltration / DoS surface.
- **User-specific data**
  - Only compute completion status for the authenticated user (`userId` from Supabase auth).
  - Do not accept `user_id` from client input.
  - Ensure `public.user_articles` RLS prevents reading other users’ rows (plan indicates `auth.uid() = user_id`).
- **Information disclosure**
  - Return generic error messages on 500; do not leak internal Supabase errors to clients.
  - Log full error details server-side via `logError`.

---

### 7. Error Handling
- **400 Bad Request**
  - Invalid `level`/`sort` enum
  - `page` not an integer or < 1
  - `limit` not an integer, < 1, or > 100
  - `include_completed` not coercible to boolean (Zod handles coercion; failures should surface as validation errors)
- **500 Internal Server Error**
  - Supabase query failure for `articles`
  - Unexpected null/undefined data shape
  - Unexpected runtime exception in service mapping/pagination computation
- **Graceful degradation (non-fatal)**
  - If completion query fails (while the main articles query succeeds), return articles with `is_completed=false` and `completed_at=null` and log the completion-query error (mirrors behavior used in tutorial service).
- **Logging**
  - Use `logError(context, error, additionalInfo)` from `src/lib/utils/error-handler.ts`
  - Include request URL and validated params (avoid logging sensitive auth tokens)

---

### 8. Performance Considerations
- **Pagination**
  - Always use `.range(from, to)` and bounded `limit` to avoid large result sets.
- **Completion enrichment**
  - Prefer querying completions only for the current page’s article IDs (`.in("article_id", articleIds)`) rather than loading the full completion set.
- **Indexes**
  - Ensure indexes exist to support sorts and filtering efficiently:
    - `articles(created_at)`
    - Optional composite: `(level, difficulty_weight, created_at)` (as suggested in DB plan)
- **Caching**
  - Cache anonymous responses for 10 minutes (public content).
  - Do not cache authenticated responses because completion status is user-specific.

---

### 9. Implementation Steps
1. **Create API route file**
   - Add `src/pages/api/articles/index.ts`
   - Export `export const prerender = false`
   - Implement `GET(context: APIContext)`
2. **Add Zod validation**
   - Create `ListArticlesQuerySchema` mirroring tutorial route patterns:
     - `level`: enum difficulty levels (optional)
     - `sort`: enum `difficulty_asc|newest` (default `difficulty_asc`)
     - `page`: `z.coerce.number().int().positive().default(1)`
     - `limit`: `z.coerce.number().int().min(1).max(100).default(20)`
     - `include_completed`: `z.coerce.boolean().default(true)`
   - On validation failure: return `formatZodError(...)` with status **400**
3. **Implement/Extract service**
   - Add `src/lib/services/article.service.ts`
   - Implement `listArticles(supabase, params, userId?)` returning `ListArticlesResponseDTO`
   - Follow the existing tutorial service style and typing (`SupabaseClient` from `src/db/supabase.client.ts`)
4. **Optional authentication resolution**
   - Attempt `supabase.auth.getUser()` in route
   - If it fails, log and continue as anonymous (do not return 401)
5. **Completion status enrichment**
   - In service: if `userId && include_completed`, query `user_articles` for completions and map into `is_completed`/`completed_at`
6. **HTTP headers**
   - Set `Content-Type: application/json`
   - Set caching:
     - Anonymous: `Cache-Control: public, max-age=600`
     - Authenticated: `Cache-Control: private, no-cache`
7. **RLS verification**
   - Confirm `public.articles` SELECT policy supports anonymous reads if endpoint must be public
   - If not, update policy accordingly (or adjust architecture/spec)
8. **Manual verification**
   - Validate responses for:
     - default query (no params)
     - each `sort` option
     - `level` filter
     - pagination boundaries (`page=1`, `page` beyond `total_pages`)
     - anonymous vs authenticated behavior (`is_completed` and `completed_at`)
