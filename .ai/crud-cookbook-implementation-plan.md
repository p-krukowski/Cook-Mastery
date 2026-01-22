<analysis>
Summary of API specification:
- CRUD endpoints for cookbook entries: GET /api/cookbook/:id, POST /api/cookbook, PATCH /api/cookbook/:id, DELETE /api/cookbook/:id.
- Authentication required for all endpoints.
- Success payloads return cookbook entry fields (id, user_id, url, title, notes, created_at, updated_at) except DELETE returns a message.
- Validation rules: POST requires url (valid URL), title (non-empty), notes optional; PATCH allows optional url/title/notes with url/title validated when provided.
- Error codes: 401 for unauthenticated; 403 for accessing another user’s entry; 404 when entry missing; 400 for invalid input on create/update.

Required and optional parameters:
- Path params:
  - Required for GET/PATCH/DELETE: id (cookbook entry UUID).
- Body params:
  - POST required: url, title.
  - POST optional: notes.
  - PATCH optional: url, title, notes (at least one should be present).
- Query params: none for all four endpoints.

Necessary DTOs and Command Models:
- DTOs: CookbookEntryDTO, GetCookbookEntryResponseDTO, CreateCookbookEntryResponseDTO, UpdateCookbookEntryResponseDTO, DeleteCookbookEntryResponseDTO.
- Command models: CreateCookbookEntryCommand, UpdateCookbookEntryCommand.

Service extraction:
- Use existing `src/lib/services/cookbook.service.ts` or create it if missing.
- Service should encapsulate CRUD against `public.cookbook_entries`, enforce user scoping, and return DTOs.

Input validation plan:
- Use Zod schemas in API routes for body validation and path param validation (UUID).
- POST schema: url (z.string().url()), title (z.string().min(1)), notes (z.string().optional()).
- PATCH schema: url/title/notes optional; add refine to require at least one field; validate url/title when present.
- Validate `id` path param as UUID for GET/PATCH/DELETE.

Error logging:
- No explicit error table in db-plan. Use existing error handler utility (likely `src/lib/utils/error-handler.ts`) to format error responses and log server errors.
- For unexpected errors (500), log with request context (route, user_id, entry_id) to console or existing logging mechanism.

Potential security threats:
- Unauthorized access to another user’s entries (enforce `user_id` scoping and RLS).
- Mass assignment (only accept url/title/notes; ignore user_id in input).
- Injection via URL/notes (sanitize/validate; rely on Supabase parameterization; avoid raw SQL).
- CSRF for session-based auth (Astro cookies), ensure auth middleware and use same-site cookies.
- Enumeration of entry IDs (return 404 for not found, 403 when not owned; prefer RLS + explicit check).

Error scenarios and status codes:
- 400: invalid body, invalid UUID param, PATCH with no fields.
- 401: missing/invalid session.
- 403: entry exists but belongs to another user (if explicitly checked) or RLS denies.
- 404: entry not found for user.
- 500: unexpected server errors or Supabase failures.
</analysis>

# API Endpoint Implementation Plan: Cookbook CRUD

## 1. Endpoint Overview
Implement CRUD endpoints for user-specific cookbook entries stored in `public.cookbook_entries`. Each endpoint requires authentication and returns a consistent cookbook entry DTO or success message.

## 2. Request Details
- **GET `/api/cookbook/:id`**
  - Parameters:
    - Required: `id` (path, UUID)
  - Body: none
- **POST `/api/cookbook`**
  - Body:
    - Required: `url` (string, valid URL), `title` (string, non-empty)
    - Optional: `notes` (string)
- **PATCH `/api/cookbook/:id`**
  - Parameters:
    - Required: `id` (path, UUID)
  - Body (at least one field required):
    - Optional: `url` (string, valid URL), `title` (string, non-empty), `notes` (string)
- **DELETE `/api/cookbook/:id`**
  - Parameters:
    - Required: `id` (path, UUID)
  - Body: none

## 3. Used Types
- DTOs: `CookbookEntryDTO`, `GetCookbookEntryResponseDTO`, `CreateCookbookEntryResponseDTO`, `UpdateCookbookEntryResponseDTO`, `DeleteCookbookEntryResponseDTO`
- Commands: `CreateCookbookEntryCommand`, `UpdateCookbookEntryCommand`
- Errors: `ApiErrorResponse`, `ApiErrorCode`

## 4. Response Details
- **GET** `200 OK`: `CookbookEntryDTO`
- **POST** `201 Created`: `CookbookEntryDTO`
- **PATCH** `200 OK`: `CookbookEntryDTO`
- **DELETE** `200 OK`: `{ "message": "Cookbook entry deleted successfully" }`
- **Errors**:
  - `400 Bad Request`: validation errors
  - `401 Unauthorized`: no valid session
  - `403 Forbidden`: entry belongs to another user
  - `404 Not Found`: entry not found
  - `500 Internal Server Error`: unexpected server errors

## 5. Data Flow
1. API route handler receives request (Astro server endpoint).
2. Retrieve Supabase client from `context.locals`.
3. Ensure user is authenticated; get `user_id`.
4. Validate path params/body using Zod schemas.
5. Call `cookbook.service` method:
   - GET: fetch entry by `id` and `user_id`.
   - POST: insert entry with `user_id`.
   - PATCH: update entry by `id` and `user_id`.
   - DELETE: delete entry by `id` and `user_id`.
6. Map database row to `CookbookEntryDTO`.
7. Return JSON with correct status code.

## 6. Security Considerations
- **Auth required**: reject unauthenticated requests with `401`.
- **Authorization**: enforce ownership using `user_id` filter and rely on RLS policies.
- **Input validation**: Zod validation for UUID, URL, non-empty title, and at least one PATCH field.
- **Mass assignment protection**: only allow `url`, `title`, `notes` in writes; never accept `user_id` from client.
- **Data exposure**: return only fields defined in `CookbookEntryDTO`.

## 7. Error Handling
- Use centralized error handler in `src/lib/utils/error-handler.ts` for consistent `ApiErrorResponse`.
- Surface validation errors as `400` with `details` map.
- If Supabase returns no data for GET/PATCH/DELETE, return `404`.
- If Supabase returns permission errors or RLS denial, return `403` when ownership mismatch is detected.
- Log unexpected errors with context (endpoint, user_id, entry_id) and return `500`.

## 8. Performance Considerations
- Use indexed columns (`user_id`, `created_at`) for quick lookups.
- Select only required columns for responses.
- Avoid extra queries by filtering by `id` and `user_id` in one query.

## 9. Implementation Steps
1. **Create/verify service layer** in `src/lib/services/cookbook.service.ts`:
   - `getCookbookEntry(userId, entryId)`
   - `createCookbookEntry(userId, command)`
   - `updateCookbookEntry(userId, entryId, command)`
   - `deleteCookbookEntry(userId, entryId)`
2. **Define Zod schemas** for:
   - Path params: `id` as UUID.
   - POST body: `url`, `title`, `notes`.
   - PATCH body: optional fields with at least one present.
3. **Implement API routes** (Astro Server Endpoints):
   - `src/pages/api/cookbook/[id].ts` for GET/PATCH/DELETE.
   - `src/pages/api/cookbook/index.ts` for POST.
   - Use `export const prerender = false`, and uppercase `GET/POST/PATCH/DELETE` handlers.
   - Use `context.locals.supabase` for DB access.
4. **Auth checks** in routes:
   - Read session/user via Supabase.
   - Return `401` if missing.
5. **Service integration**:
   - Call service methods with validated inputs.
   - Translate service errors to API errors.
6. **Error handling and logging**:
   - Standardize error responses with `ApiErrorResponse`.
   - Log unexpected errors via shared error handler.
7. **Manual verification**:
   - Test with authenticated user for each endpoint.
   - Validate 403/404 behavior with other user’s entry and unknown IDs.
