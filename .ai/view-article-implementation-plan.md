# API Endpoint Implementation Plan: Get Article Detail (`GET /api/articles/:id`)

## 1. Endpoint Overview
Retrieve detailed information for a single article by ID. The endpoint is **public** (no authentication required), but if a user is authenticated it should include **per-user completion status** (`is_completed`, `completed_at`) based on `public.user_articles`.

This plan follows existing patterns in:
- `src/pages/api/tutorials/[id].ts` (UUID param validation, auth-optional completion enrichment, cache headers)
- `src/pages/api/articles/index.ts` (Zod validation + `context.locals.supabase` + standardized error responses)

## 2. Request Details
- **HTTP Method**: `GET`
- **URL Structure**: `/api/articles/:id`
- **Path Parameters**:
  - **Required**
    - `id` (string): UUID of the article
- **Query Parameters**: none
- **Request Body**: none
- **Authentication**: **Not required**
  - If a valid session exists, include completion fields from `user_articles`

## 3. Used Types (DTOs + Command Models)
- **DTOs**
  - `ArticleDetailDTO` (from `src/types.ts`)
  - `GetArticleDetailResponseDTO` = `ArticleDetailDTO`
  - `ApiErrorResponse` (standard error payload)
- **Command Models**
  - None (read-only endpoint)

## 4. Response Details
### Success (200 OK)
Return `GetArticleDetailResponseDTO`:

```json
{
  "id": "uuid",
  "title": "The Science of Browning",
  "level": "BEGINNER",
  "difficulty_weight": 3,
  "summary": "Understanding the Maillard reaction and caramelization",
  "content": "Detailed article content explaining browning chemistry...",
  "key_takeaways": "Browning reactions require high heat and dry conditions...",
  "created_at": "2026-01-16T09:00:00Z",
  "updated_at": "2026-01-16T09:00:00Z",
  "is_completed": false,
  "completed_at": null
}
```

### Errors
- **400 Bad Request**: invalid `id` (not a UUID)
- **404 Not Found**: article does not exist
- **500 Internal Server Error**: unexpected server/database errors

All errors should use the shared shape `ApiErrorResponse` via `createErrorResponse(...)`.

## 5. Data Flow
### High-level flow
1. **API Route** (`src/pages/api/articles/[id].ts`)
   - Validate `context.params.id` using Zod UUID schema.
   - Obtain Supabase client via `context.locals.supabase` (per backend rule).
   - Try to read the current user via `supabase.auth.getUser()`:
     - If it fails, continue anonymously (do **not** fail the request).
   - Call service `getArticleDetail(supabase, articleId, userId?)`.
   - If service returns `null`, return 404.
   - Otherwise return 200 with JSON + cache headers.

2. **Service** (`src/lib/services/article.service.ts`)
   - Fetch article row from `public.articles` by `id`.
   - If authenticated (`userId` provided), query `public.user_articles` for `(user_id, article_id)` to derive:
     - `is_completed = true` if row exists
     - `completed_at = completed_at` else `null`
   - Map DB row into `GetArticleDetailResponseDTO`.

### DB interactions
- **Primary read**: `public.articles`
  - Columns needed: `id,title,level,difficulty_weight,summary,content,key_takeaways,created_at,updated_at`
- **Optional enrichment** (only when authenticated): `public.user_articles`
  - Query: `select completed_at where user_id = auth.uid() and article_id = :id`

## 6. Security Considerations
- **Auth model**
  - Endpoint is public, but completion enrichment is user-specific and must only be computed for the authenticated user derived from `supabase.auth.getUser()`.
- **Input validation**
  - Validate `:id` as UUID with Zod (`z.string().uuid()`).
  - Reject invalid UUID with **400** before any DB work (prevents malformed queries and log noise).
- **Row Level Security (RLS) alignment**
  - The DB plan suggests `articles` SELECT may be restricted to `authenticated`, which conflicts with “Authentication: Not required”.
  - Ensure one of the following is true in Supabase before relying on anonymous reads:
    - RLS is disabled for `public.articles` (and `public.tutorials`) in this environment, **or**
    - there is a policy allowing `anon`/public `SELECT` on `public.articles`.
  - `public.user_articles` should remain protected by RLS (only `auth.uid() = user_id`) so anonymous callers can’t read completion data.
- **Threats to consider**
  - **ID enumeration**: UUID guessing is unlikely but possible; always return 404 for missing IDs.
  - **Content injection/XSS**: `content`/`key_takeaways` are returned as strings; ensure the frontend renders safely (escape/sanitize if treated as HTML).
  - **Rate limiting / abuse**: consider adding IP-based rate limiting in middleware or edge (future improvement).
  - **Over-sharing**: only return the columns listed in the spec/DTO.

## 7. Error Handling
### Error scenarios and status codes
- **400** `VALIDATION_ERROR`
  - `context.params.id` missing/undefined
  - `context.params.id` not a valid UUID
- **404** `NOT_FOUND`
  - Article not found (no row for the given ID)
- **500** `INTERNAL_SERVER_ERROR`
  - Supabase query failure (network issues, permission/RLS issues, unexpected PostgREST errors)
  - Unexpected runtime errors

### Logging
- Use `logError(context, error, additionalInfo)` from `src/lib/utils/error-handler.ts`.
- Log points:
  - **Auth check failure** (non-fatal): `"GET /api/articles/:id - Auth check"`
  - **Unhandled endpoint errors**: `"GET /api/articles/:id"` with `{ articleId, url }`

### Error table logging
- No error logging table is defined in `db-plan.md`, so persist-to-DB logging is **not applicable** in the current scope.
- If a future `errors` table is introduced, extend `logError` to also insert there (without changing endpoint contracts).

## 8. Performance
- **Queries**
  - Exactly 1 query for the article row.
  - At most 1 additional query for completion status (only for authenticated users).
- **Indexes**
  - `articles.id` is primary key; lookup is efficient.
  - `user_articles` primary key is `(user_id, article_id)`; completion lookup is efficient.
- **Caching**
  - For anonymous requests (no userId), set:
    - `Cache-Control: public, max-age=300, stale-while-revalidate=600`
  - For authenticated requests, set:
    - `Cache-Control: private, no-cache`
  - Always set `Content-Type: application/json`.

## 9. Implementation Steps
1. **Add the API route**
   - Create `src/pages/api/articles/[id].ts`.
   - Set `export const prerender = false`.
   - Implement `GET(context: APIContext)`.

2. **Validate path params with Zod**
   - Define schema:
     - `z.object({ id: z.string().uuid({ message: "Invalid article ID format" }) })`
   - `safeParse(context.params)` and return:
     - `400` with `formatZodError(...)` on failure.

3. **Implement auth-optional user detection**
   - Use `const supabase = context.locals.supabase`.
   - Attempt `supabase.auth.getUser()`:
     - If it throws, `logError(...)` and continue as anonymous.

4. **Extract business logic to service**
   - Add `getArticleDetail(supabase, articleId, userId?)` to `src/lib/services/article.service.ts`.
   - Responsibilities:
     - Query `articles` by `id` (use `.single()` or `.maybeSingle()`).
     - If not found, return `null`.
     - If `userId` present, query `user_articles` for completion:
       - Use `.maybeSingle()` to avoid throwing on “not found”.
     - Return `GetArticleDetailResponseDTO`.

5. **Wire API route to service**
   - Call `getArticleDetail(...)`.
   - If `null`, return:
     - `404` with `createErrorResponse("NOT_FOUND", "Article not found")`.
   - Otherwise return `200` with JSON body and cache headers.

6. **Ensure error handling is standardized**
   - Wrap handler in `try/catch`.
   - In catch:
     - `logError("GET /api/articles/:id", error, { articleId: context.params.id, url: context.request.url })`
     - Return `500` with `createErrorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred while retrieving the article")`.

7. **Manual verification**
   - **200**: call with a real `articleId` in DB; ensure response matches DTO shape.
   - **404**: call with a valid UUID that does not exist.
   - **400**: call with `id=not-a-uuid`.
   - **Authenticated**: call with a logged-in session; ensure `is_completed`/`completed_at` reflect `user_articles`.
   - **Anonymous**: ensure endpoint still works (or, if it fails, fix Supabase RLS policy to allow public read as per spec).

