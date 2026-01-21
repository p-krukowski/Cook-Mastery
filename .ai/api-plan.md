# REST API Plan - Cook Mastery

## 1. Resources

### 1.1 Core Resources
- **Auth** - Authentication operations (managed by Supabase Auth)
  - Corresponds to: `auth.users` table
- **Profiles** - User profiles and level preferences
  - Corresponds to: `public.profiles` table
- **Tutorials** - Structured learning content with steps
  - Corresponds to: `public.tutorials` table
- **Articles** - Blog-style knowledge articles
  - Corresponds to: `public.articles` table
- **User Progress (Tutorials)** - Tutorial completion tracking
  - Corresponds to: `public.user_tutorials` table
- **User Progress (Articles)** - Article completion tracking
  - Corresponds to: `public.user_articles` table
- **Cookbook Entries** - Personal recipe links
  - Corresponds to: `public.cookbook_entries` table
- **Level Progress** - Per-level completion statistics
  - Corresponds to: `public.user_level_progress` view

## 2. Endpoints

### 2.3 Tutorials

#### List Tutorials
- **Method**: `GET`
- **Path**: `/api/tutorials`
- **Description**: Retrieve a paginated list of tutorials with optional filtering by level and category
- **Authentication**: Non Required
- **Query Parameters**:
  - `level` (optional): Filter by difficulty level (`BEGINNER`, `INTERMEDIATE`, `EXPERIENCED`). Defaults to user's selected level.
  - `category` (optional): Filter by tutorial category (`PRACTICAL`, `THEORETICAL`, `EQUIPMENT`)
  - `sort` (optional): Sort order. Options:
    - `difficulty_asc` (default) - Sort by difficulty weight ascending (1-5), then by created_at descending
    - `newest` - Sort by created_at descending
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 20, max: 100)
  - `include_completed` (optional): Include completion status for current user (default: true)
- **Request Payload**: None
- **Response Payload** (Success):
```json
{
  "tutorials": [
    {
      "id": "uuid",
      "title": "Mastering Heat Control",
      "category": "PRACTICAL",
      "level": "BEGINNER",
      "difficulty_weight": 2,
      "summary": "Learn how to control heat for perfect results",
      "created_at": "2026-01-15T10:00:00Z",
      "is_completed": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_items": 45,
    "total_pages": 3
  }
}
```
- **Success Codes**:
  - `200 OK` - Tutorials retrieved
- **Error Codes**:
  - `400 Bad Request` - Invalid query parameters

---

#### Get Tutorial Detail
- **Method**: `GET`
- **Path**: `/api/tutorials/:id`
- **Description**: Retrieve detailed information for a specific tutorial including all content sections
- **Authentication**: Non Required
- **Query Parameters**: None
- **Request Payload**: None
- **Response Payload** (Success):
```json
{
  "id": "uuid",
  "title": "Mastering Heat Control",
  "category": "PRACTICAL",
  "level": "BEGINNER",
  "difficulty_weight": 2,
  "summary": "Learn how to control heat for perfect results",
  "content": "Detailed main content explaining heat control principles...",
  "steps": [
    {
      "title": "Understanding Heat Zones",
      "content": "Different areas of your pan have different temperatures...",
      "order": 1
    },
    {
      "title": "Adjusting Temperature",
      "content": "How to know when to increase or decrease heat...",
      "order": 2
    }
  ],
  "practice_recommendations": "Try cooking eggs at different heat levels...",
  "key_takeaways": "Heat control is fundamental to cooking success...",
  "created_at": "2026-01-15T10:00:00Z",
  "updated_at": "2026-01-15T10:00:00Z",
  "is_completed": false,
  "completed_at": null
}
```
- **Success Codes**:
  - `200 OK` - Tutorial retrieved
- **Error Codes**:
  - `404 Not Found` - Tutorial does not exist

---


### 2.4 Articles

#### List Articles
- **Method**: `GET`
- **Path**: `/api/articles`
- **Description**: Retrieve a paginated list of articles with optional filtering by level
- **Authentication**: Non Required
- **Query Parameters**:
  - `level` (optional): Filter by difficulty level (`BEGINNER`, `INTERMEDIATE`, `EXPERIENCED`)
  - `sort` (optional): Sort order. Options:
    - `difficulty_asc` (default) - Sort by difficulty weight ascending, then by created_at descending
    - `newest` - Sort by created_at descending
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 20, max: 100)
  - `include_completed` (optional): Include completion status for current user (default: true)
- **Request Payload**: None
- **Response Payload** (Success):
```json
{
  "articles": [
    {
      "id": "uuid",
      "title": "The Science of Browning",
      "level": "BEGINNER",
      "difficulty_weight": 3,
      "summary": "Understanding the Maillard reaction and caramelization",
      "created_at": "2026-01-16T09:00:00Z",
      "is_completed": true,
      "completed_at": "2026-01-17T15:20:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_items": 30,
    "total_pages": 2
  }
}
```
- **Success Codes**:
  - `200 OK` - Articles retrieved
- **Error Codes**:
  - `400 Bad Request` - Invalid query parameters

---

#### Get Article Detail
- **Method**: `GET`
- **Path**: `/api/articles/:id`
- **Description**: Retrieve detailed information for a specific article
- **Authentication**: Non Required
- **Query Parameters**: None
- **Request Payload**: None
- **Response Payload** (Success):
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
- **Success Codes**:
  - `200 OK` - Article retrieved
- **Error Codes**:
  - `404 Not Found` - Article does not exist

---

### 2.6 Cookbook

#### List Cookbook Entries
- **Method**: `GET`
- **Path**: `/api/cookbook`
- **Description**: Retrieve all cookbook entries for the authenticated user
- **Authentication**: Required
- **Query Parameters**:
  - `sort` (optional): Sort order. Options:
    - `newest` (default) - Sort by created_at descending
    - `oldest` - Sort by created_at ascending
    - `title_asc` - Sort by title alphabetically
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 20, max: 100)
- **Request Payload**: None
- **Response Payload** (Success):
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
- **Success Codes**:
  - `200 OK` - Entries retrieved
- **Error Codes**:
  - `401 Unauthorized` - Not authenticated

---

#### Get Cookbook Entry
- **Method**: `GET`
- **Path**: `/api/cookbook/:id`
- **Description**: Retrieve a specific cookbook entry
- **Authentication**: Required
- **Query Parameters**: None
- **Request Payload**: None
- **Response Payload** (Success):
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "url": "https://example.com/recipe/pasta-carbonara",
  "title": "Authentic Pasta Carbonara",
  "notes": "Remember to use guanciale instead of bacon. Cook pasta al dente.",
  "created_at": "2026-01-17T18:00:00Z",
  "updated_at": "2026-01-17T18:00:00Z"
}
```
- **Success Codes**:
  - `200 OK` - Entry retrieved
- **Error Codes**:
  - `401 Unauthorized` - Not authenticated
  - `403 Forbidden` - Entry belongs to another user
  - `404 Not Found` - Entry does not exist

---

#### Create Cookbook Entry
- **Method**: `POST`
- **Path**: `/api/cookbook`
- **Description**: Add a new recipe link to the user's cookbook
- **Authentication**: Required
- **Query Parameters**: None
- **Request Payload**:
```json
{
  "url": "https://example.com/recipe/pasta-carbonara",
  "title": "Authentic Pasta Carbonara",
  "notes": "Remember to use guanciale instead of bacon"
}
```
- **Response Payload** (Success):
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "url": "https://example.com/recipe/pasta-carbonara",
  "title": "Authentic Pasta Carbonara",
  "notes": "Remember to use guanciale instead of bacon",
  "created_at": "2026-01-18T15:00:00Z",
  "updated_at": "2026-01-18T15:00:00Z"
}
```
- **Success Codes**:
  - `201 Created` - Entry created
- **Error Codes**:
  - `400 Bad Request` - Invalid input (missing or invalid URL, missing title)
  - `401 Unauthorized` - Not authenticated

**Validation**:
- URL: required, must be valid URL format
- Title: required, non-empty string
- Notes: optional, text

---

#### Update Cookbook Entry
- **Method**: `PATCH`
- **Path**: `/api/cookbook/:id`
- **Description**: Update an existing cookbook entry
- **Authentication**: Required
- **Query Parameters**: None
- **Request Payload**:
```json
{
  "url": "https://example.com/recipe/pasta-carbonara-updated",
  "title": "Updated Pasta Carbonara Recipe",
  "notes": "Use guanciale. Add extra pepper."
}
```
- **Response Payload** (Success):
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "url": "https://example.com/recipe/pasta-carbonara-updated",
  "title": "Updated Pasta Carbonara Recipe",
  "notes": "Use guanciale. Add extra pepper.",
  "created_at": "2026-01-17T18:00:00Z",
  "updated_at": "2026-01-18T15:30:00Z"
}
```
- **Success Codes**:
  - `200 OK` - Entry updated
- **Error Codes**:
  - `400 Bad Request` - Invalid input
  - `401 Unauthorized` - Not authenticated
  - `403 Forbidden` - Entry belongs to another user
  - `404 Not Found` - Entry does not exist

**Validation**:
- URL: optional, if provided must be valid URL format
- Title: optional, if provided must be non-empty
- Notes: optional

---

#### Delete Cookbook Entry
- **Method**: `DELETE`
- **Path**: `/api/cookbook/:id`
- **Description**: Delete a cookbook entry
- **Authentication**: Required
- **Query Parameters**: None
- **Request Payload**: None
- **Response Payload** (Success):
```json
{
  "message": "Cookbook entry deleted successfully"
}
```
- **Success Codes**:
  - `200 OK` - Entry deleted
- **Error Codes**:
  - `401 Unauthorized` - Not authenticated
  - `403 Forbidden` - Entry belongs to another user
  - `404 Not Found` - Entry does not exist

---

## 3. Authentication and Authorization

### 3.1 Authentication Mechanism

The API uses **Supabase Auth** for authentication, implementing a JWT-based session management system with the following characteristics:

#### Session Management
- Access tokens are issued as JWTs upon successful login/signup
- Refresh tokens are provided for obtaining new access tokens when they expire
- Sessions are secured with HttpOnly cookies (in browser contexts) and/or Bearer token authentication
- Access tokens have a standard expiration time (configurable, typically 1 hour)
- Refresh tokens have longer expiration (configurable, typically 7 days)

#### Token Format
```
Authorization: Bearer <jwt_access_token>
```

#### Session Security
- **HttpOnly**: Session cookies are not accessible via JavaScript (XSS protection)
- **Secure**: Cookies are only transmitted over HTTPS in production
- **SameSite**: Set to `Lax` or `Strict` to prevent CSRF attacks
- JWT tokens are validated on every authenticated request
- Supabase handles password hashing using bcrypt internally

### 3.2 Authorization Model

Authorization is implemented using **Row Level Security (RLS)** policies in Supabase PostgreSQL:

#### Access Control Rules

**Public Content (Read-Only)**:
- `public.tutorials`: Any authenticated user can read (`SELECT`)
- `public.articles`: Any authenticated user can read (`SELECT`)
- Content creation/modification is restricted to service role (admin only, out of MVP scope)

**User-Specific Resources**:
- `public.profiles`:
  - Users can read, update, and insert only their own profile (`auth.uid() = id`)
- `public.user_tutorials`:
  - Users can read and insert only their own completion records (`auth.uid() = user_id`)
  - Deletion is allowed (if un-completion is added post-MVP)
- `public.user_articles`:
  - Users can read and insert only their own completion records (`auth.uid() = user_id`)
  - Deletion is allowed (if un-completion is added post-MVP)
- `public.cookbook_entries`:
  - Users have full CRUD access only to their own entries (`auth.uid() = user_id`)
  - Other users' cookbook entries are completely isolated

#### Implementation Details
- Supabase RLS policies automatically enforce authorization at the database level
- The API layer leverages `auth.uid()` from the authenticated session
- Failed authorization attempts return `403 Forbidden` (if resource exists but access denied) or `404 Not Found` (resource isolation)

---

## 4. Validation and Business Logic

### 4.1 Validation Rules

#### Authentication
**Sign Up**:
- Email: Must be valid email format, unique, not empty
- Username: Must be non-empty, unique, alphanumeric with underscores allowed
- Password: Minimum 8 characters (enforced by Supabase Auth)
- Selected level: Must be one of `BEGINNER`, `INTERMEDIATE`, `EXPERIENCED`

**Login**:
- Identifier: Required (accepts email or username)
- Password: Required

#### Profile
**Update**:
- Username: If provided, must be non-empty and unique
- Selected level: If provided, must be one of `BEGINNER`, `INTERMEDIATE`, `EXPERIENCED`

#### Tutorials
**Database Constraints**:
- Title: Required, non-empty text
- Category: Must be one of `PRACTICAL`, `THEORETICAL`, `EQUIPMENT`
- Level: Must be one of `BEGINNER`, `INTERMEDIATE`, `EXPERIENCED`
- Difficulty weight: Integer between 1 and 5 (inclusive)
- Summary, content, practice_recommendations, key_takeaways: Required, non-empty
- Steps: Required JSONB array with structure `[{"title": "...", "content": "...", "order": 1}]`

**Completion**:
- Tutorial must exist
- User must be authenticated
- Idempotent operation (multiple completions allowed, only first creates record)

#### Articles
**Database Constraints**:
- Title: Required, non-empty text
- Level: Must be one of `BEGINNER`, `INTERMEDIATE`, `EXPERIENCED`
- Difficulty weight: Integer between 1 and 5 (inclusive)
- Summary, content, key_takeaways: Required, non-empty

**Completion**:
- Article must exist
- User must be authenticated
- Idempotent operation

#### Cookbook Entries
**Create/Update**:
- URL: Required, must be valid URL format (http/https)
- Title: Required, non-empty text
- Notes: Optional, text (can be null or empty)

### 4.2 Business Logic Implementation

#### Level Progression
**Completion Calculation**:
```
completion_percent = (
  COUNT(completed_tutorials) + COUNT(completed_articles)
) / (
  COUNT(total_tutorials) + COUNT(total_articles)
) * 100

WHERE level = user's selected level
```

**Eligibility Rules**:
- User is "up to date" when `completion_percent >= 85%`
- User is "eligible to advance" when `completion_percent >= 85%` AND `selected_level != 'EXPERIENCED'`
- User is "out of date" when `completion_percent < 85%` (flag displayed in UI)

**Implementation**:
- Computed via `user_level_progress` materialized view
- View aggregates data from `user_tutorials`, `user_articles`, `tutorials`, and `articles`
- Refreshed on each completion action or on-demand via API request

#### Content Recommendations
**New Content Detection**:
- Content is flagged as "new" if `created_at` is within the last 7 days
- New content is prioritized in recommendation lists

**Sorting Logic**:
- **Default (by difficulty)**: Sort by `difficulty_weight` ASC, then `created_at` DESC
- **Newest first**: Sort by `created_at` DESC
- Within difficulty tiers, newer content appears first

**Recommendation Algorithm**:
1. Filter content by user's selected level
2. Separate into "new" (< 7 days old) and "standard" categories
3. Within each category, sort by difficulty_weight (ascending), then created_at (descending)
4. Return top N items per category based on `limit` parameter

#### Analytics Event Tracking
**Captured Events**:
- User signup: Record `created_at` in `profiles` table
- Tutorial completion: Record `completed_at` in `user_tutorials` table
- Article read: Record `completed_at` in `user_articles` table
- Recipe added: Record `created_at` in `cookbook_entries` table

**KPI Computation**:
- For each user, check if events occurred within 48 hours of `profiles.created_at`
- Queries aggregate by user cohort (signup date)
- Support measurement of:
  - % users with ≥1 tutorial passed within 2 days
  - % users with ≥1 article read within 2 days
  - % users with ≥1 recipe added within 2 days

#### Idempotent Operations
**Tutorial/Article Completion**:
- `POST /api/tutorials/:id/complete` and `POST /api/articles/:id/complete` are idempotent
- Check if completion record exists before inserting
- If exists: Return `200 OK` with existing record
- If not exists: Insert and return `201 Created`
- Use database constraint (composite primary key on `user_id`, `tutorial_id`/`article_id`) to prevent duplicates

#### Edge Cases
**Empty Content Catalogs**:
- If no tutorials/articles exist for a level, return empty array with appropriate message
- Division by zero in completion calculation: Default to `0%` completion if `total_count = 0`

**Cross-Level Browsing**:
- Users can query tutorials/articles from any level using `level` query parameter
- Only content matching selected level is "recommended"
- Progress tracking works across all levels simultaneously

**Concurrent Requests**:
- Database constraints ensure data integrity (unique constraints, foreign keys)
- RLS policies prevent race conditions on user-specific data
- Use database transactions for multi-step operations if needed

---

## 5. Error Response Format

All error responses follow a consistent JSON structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Specific field validation error (optional)"
    }
  }
}
```

### Common Error Codes
- `UNAUTHORIZED` (401): Authentication required or invalid token
- `FORBIDDEN` (403): User lacks permission to access resource
- `NOT_FOUND` (404): Resource does not exist
- `VALIDATION_ERROR` (400): Input validation failed
- `CONFLICT` (409): Resource conflict (duplicate email/username)
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_SERVER_ERROR` (500): Unexpected server error

---

## 6. API Versioning

For MVP, all endpoints are unversioned (no `/v1/` prefix). Future versions will introduce versioning as needed.

---

## 7. Implementation Notes

### Technology Integration
- **Astro 5**: API routes defined in `src/pages/api/` directory
- **Supabase**: Used for authentication, database, and RLS policies
- **TypeScript**: All request/response payloads strictly typed
- **Middleware**: Astro middleware (`src/middleware/index.ts`) handles authentication checks and rate limiting

### Database Client
- Use Supabase client SDK (`@supabase/supabase-js`) for all database operations
- Client initialized with service role key for admin operations, user JWT for user-scoped operations
- Types generated from database schema (`src/db/database.types.ts`)

### Pagination
- Implement cursor-based or offset-based pagination
- Default limit: 20 items per page
- Maximum limit: 100 items per page
- Include pagination metadata in all list responses

### CORS and Security Headers
- Configure CORS for web client origin
- Set security headers: `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`
- Enable HTTPS in production (enforce via Secure cookies and HSTS header)

---

## 8. Future Considerations (Post-MVP)

- Password reset and email verification flows
- Account deletion and data export (GDPR compliance)
- Search and filtering capabilities
- Admin API for content management
- User-generated content (community features)
- Undo completion actions (un-pass tutorials, un-read articles)
- Enhanced analytics and dashboard endpoints
- Webhooks for external integrations
