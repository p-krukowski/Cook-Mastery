# API Endpoint Implementation Plan: List Tutorials

## 1. Endpoint Overview

The List Tutorials endpoint provides a paginated list of cooking tutorials with optional filtering capabilities. This is a public endpoint that allows both authenticated and anonymous users to browse available tutorials. When users are authenticated, the endpoint can optionally include their completion status for each tutorial.

**Core Functionality:**
- Retrieve paginated tutorials list
- Filter by difficulty level and category
- Sort by difficulty or creation date
- Include user completion status (for authenticated users)
- Support flexible pagination with configurable page size

## 2. Request Details

### HTTP Method
- `GET`

### URL Structure
- `/api/tutorials`

### Query Parameters

#### Required Parameters
- None (all parameters are optional)

#### Optional Parameters
| Parameter | Type | Default | Validation | Description |
|-----------|------|---------|------------|-------------|
| `level` | string | user's selected level or none | Must be one of: `BEGINNER`, `INTERMEDIATE`, `EXPERIENCED` | Filter tutorials by difficulty level |
| `category` | string | none | Must be one of: `PRACTICAL`, `THEORETICAL`, `EQUIPMENT` | Filter tutorials by category |
| `sort` | string | `difficulty_asc` | Must be one of: `difficulty_asc`, `newest` | Sort order for results |
| `page` | number | `1` | Must be positive integer ≥ 1 | Page number for pagination |
| `limit` | number | `20` | Must be integer between 1 and 100 | Number of items per page |
| `include_completed` | boolean | `true` | Must be boolean | Whether to include completion status (requires authentication) |

### Request Headers
- None required (authentication optional via cookies)

### Request Body
- None (GET request)

## 3. Used Types

### Input Types
```typescript
// From src/types.ts
interface ListTutorialsParams extends PaginationParams {
  level?: DifficultyLevel;
  category?: TutorialCategory;
  sort?: 'difficulty_asc' | 'newest';
  include_completed?: boolean;
}

interface PaginationParams {
  page?: number;
  limit?: number;
}

type DifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'EXPERIENCED';
type TutorialCategory = 'PRACTICAL' | 'THEORETICAL' | 'EQUIPMENT';
```

### Output Types
```typescript
// From src/types.ts
interface ListTutorialsResponseDTO {
  tutorials: TutorialListItemDTO[];
  pagination: PaginationMeta;
}

interface TutorialListItemDTO {
  id: string;
  title: string;
  category: TutorialCategory;
  level: DifficultyLevel;
  difficulty_weight: number;
  summary: string;
  created_at: string;
  is_completed: boolean;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
}
```

### Validation Schema (Zod)
```typescript
// To be created in the endpoint file
const ListTutorialsQuerySchema = z.object({
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'EXPERIENCED']).optional(),
  category: z.enum(['PRACTICAL', 'THEORETICAL', 'EQUIPMENT']).optional(),
  sort: z.enum(['difficulty_asc', 'newest']).optional().default('difficulty_asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  include_completed: z.coerce.boolean().optional().default(true),
});
```

## 4. Response Details

### Success Response (200 OK)
```json
{
  "tutorials": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
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

### Error Response (400 Bad Request)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameters",
    "details": {
      "level": "Invalid difficulty level. Must be one of: BEGINNER, INTERMEDIATE, EXPERIENCED",
      "limit": "Limit must be between 1 and 100"
    }
  }
}
```

### Error Response (500 Internal Server Error)
```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred while fetching tutorials"
  }
}
```

### Status Codes
- `200 OK` - Tutorials successfully retrieved
- `400 Bad Request` - Invalid query parameters
- `500 Internal Server Error` - Server-side error during processing

## 5. Data Flow

### High-Level Flow
1. **Request Reception**: Astro API endpoint receives GET request with query parameters
2. **Input Validation**: Validate and parse query parameters using Zod schema
3. **User Authentication Check**: Check if user is authenticated (optional)
4. **Service Call**: Invoke `TutorialService.listTutorials()` with validated parameters and user context
5. **Query Construction**: Service builds Supabase query with:
   - Level filter (if provided)
   - Category filter (if provided)
   - Sorting logic based on sort parameter
   - Pagination (offset and limit)
6. **Completion Status Join** (conditional):
   - If user authenticated AND `include_completed=true`: LEFT JOIN with `user_tutorials`
   - If not authenticated OR `include_completed=false`: Default `is_completed` to `false`
7. **Query Execution**: Execute query against Supabase
8. **Count Query**: Execute separate count query for pagination metadata
9. **Response Formatting**: Format results into `ListTutorialsResponseDTO`
10. **Response Return**: Return JSON response with 200 status

### Detailed Service Logic

#### Query Building Steps
```typescript
// Pseudo-code for query construction
let query = supabase
  .from('tutorials')
  .select('id, title, category, level, difficulty_weight, summary, created_at');

// Apply filters
if (level) {
  query = query.eq('level', level);
}

if (category) {
  query = query.eq('category', category);
}

// Apply sorting
if (sort === 'difficulty_asc') {
  query = query
    .order('difficulty_weight', { ascending: true })
    .order('created_at', { ascending: false });
} else if (sort === 'newest') {
  query = query.order('created_at', { ascending: false });
}

// Apply pagination
const from = (page - 1) * limit;
const to = from + limit - 1;
query = query.range(from, to);

// Execute query
const { data, error, count } = await query;
```

#### Completion Status Logic
```typescript
// If user authenticated and include_completed=true
if (userId && includeCompleted) {
  // Fetch user's completed tutorials
  const { data: completedTutorials } = await supabase
    .from('user_tutorials')
    .select('tutorial_id')
    .eq('user_id', userId);
  
  const completedIds = new Set(completedTutorials.map(t => t.tutorial_id));
  
  // Add is_completed flag to each tutorial
  tutorials.forEach(tutorial => {
    tutorial.is_completed = completedIds.has(tutorial.id);
  });
} else {
  // Default to false
  tutorials.forEach(tutorial => {
    tutorial.is_completed = false;
  });
}
```

### Database Interactions
1. **Main Query**: SELECT from `tutorials` table with filters, sorting, and pagination
2. **Count Query**: SELECT COUNT(*) from `tutorials` table with same filters (for pagination)
3. **Completion Query** (conditional): SELECT from `user_tutorials` for authenticated user

## 6. Security Considerations

### Authentication
- **Not Required**: Endpoint is publicly accessible
- **Optional**: If user is authenticated (via session cookie), completion status can be included
- **Session Handling**: Use `context.locals.supabase.auth.getUser()` to check authentication status

### Authorization
- **Public Read Access**: Tutorials are readable by all users
- **RLS Policy Consideration**: 
  - Current database plan specifies: `SELECT: auth.role() = 'authenticated'` for tutorials
  - **CRITICAL**: This conflicts with "Authentication: Non Required" in API spec
  - **Resolution Required**: Either:
    1. Update RLS policy to allow anonymous reads: `SELECT: true`
    2. Use service role client for this specific query
  - **Recommended**: Update RLS policy to make tutorials publicly readable
  - **DECISION**: RLS disabled for MVP

### Input Validation
- **Strict Validation**: Use Zod schemas to validate all query parameters
- **Enum Validation**: Ensure `level` and `category` match predefined enums
- **Numeric Bounds**: Enforce `page >= 1` and `1 <= limit <= 100`
- **Type Coercion**: URL query params are strings; use `z.coerce.number()` and `z.coerce.boolean()`

### Data Exposure
- **Limited Fields**: Only expose necessary fields (not full tutorial content)
- **No Sensitive Data**: Tutorial list items don't contain sensitive information
- **Completion Privacy**: User completion status only visible to that specific user

### Rate Limiting
- **Consideration**: Implement rate limiting to prevent abuse
- **Recommendation**: 
  - Anonymous users: 100 requests per 15 minutes per IP
  - Authenticated users: 300 requests per 15 minutes per user
- **Implementation**: Can be added in middleware

### SQL Injection Prevention
- **Built-in Protection**: Supabase client uses parameterized queries
- **No Raw SQL**: Avoid using `.rpc()` or raw SQL for this endpoint

## 7. Error Handling

### Validation Errors (400 Bad Request)

| Scenario | Error Code | Message | Details |
|----------|------------|---------|---------|
| Invalid level enum | `VALIDATION_ERROR` | Invalid query parameters | `level: "Must be one of: BEGINNER, INTERMEDIATE, EXPERIENCED"` |
| Invalid category enum | `VALIDATION_ERROR` | Invalid query parameters | `category: "Must be one of: PRACTICAL, THEORETICAL, EQUIPMENT"` |
| Invalid sort option | `VALIDATION_ERROR` | Invalid query parameters | `sort: "Must be one of: difficulty_asc, newest"` |
| Invalid page number | `VALIDATION_ERROR` | Invalid query parameters | `page: "Must be a positive integer"` |
| Invalid limit | `VALIDATION_ERROR` | Invalid query parameters | `limit: "Must be between 1 and 100"` |
| Invalid include_completed | `VALIDATION_ERROR` | Invalid query parameters | `include_completed: "Must be a boolean value"` |

### Database Errors (500 Internal Server Error)

| Scenario | Error Code | Message | Logging |
|----------|------------|---------|---------|
| Database connection failure | `INTERNAL_SERVER_ERROR` | Failed to connect to database | Log full error with context |
| Query execution error | `INTERNAL_SERVER_ERROR` | Failed to fetch tutorials | Log query and error details |
| RLS policy blocking query | `INTERNAL_SERVER_ERROR` | Failed to fetch tutorials | Log policy violation |
| Unexpected service error | `INTERNAL_SERVER_ERROR` | An unexpected error occurred | Log full stack trace |

### Error Response Format
All errors should follow the standard `ApiErrorResponse` format:
```typescript
interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}
```

### Error Logging Strategy
1. **Validation Errors**: Log as warnings (not critical, user error)
2. **Database Errors**: Log as errors with full context
3. **Unexpected Errors**: Log as critical with stack trace
4. **No Database Error Table**: For this endpoint, console/service logging is sufficient

### Error Recovery
- **Graceful Degradation**: If completion status fails, return tutorials with `is_completed: false`
- **Partial Failures**: Log but don't fail entire request for non-critical errors
- **Clear Messages**: Provide actionable error messages to help users fix issues

## 8. Performance Considerations

### Database Optimization

#### Indexes
Ensure these indexes exist (from db-plan.md):
- `tutorials.created_at` - For `sort=newest`
- Composite index on `(level, difficulty_weight, created_at)` - For `sort=difficulty_asc` with level filter
- `tutorials.category` - For category filtering

#### Query Optimization
- **SELECT Specific Columns**: Only fetch needed fields, not `SELECT *`
- **COUNT Optimization**: Use `.count('exact')` with same filters as main query
- **Limit Result Set**: Enforce maximum limit of 100 items per page
- **Efficient Joins**: Use single query with LEFT JOIN instead of separate queries for completion status

#### Pagination Strategy
- **Offset-Based Pagination**: Use `.range(from, to)` for simplicity
- **Total Count**: Execute count query in parallel with data query if possible
- **Alternative Consideration**: For very large datasets, consider cursor-based pagination in future

### Caching Strategy

#### Cacheable Scenarios
- **Anonymous Requests**: Same query parameters = same results (until new tutorial added)
- **Cache Key**: Hash of query parameters
- **Cache Duration**: 5-15 minutes for anonymous requests

#### Non-Cacheable Scenarios
- **Authenticated Requests with `include_completed=true`**: User-specific data
- **Recently Modified Data**: Invalidate cache when tutorials updated

#### Implementation
- **HTTP Headers**: Set appropriate `Cache-Control` headers
- **CDN Caching**: Can cache anonymous requests at edge
- **Application Cache**: Consider Redis for server-side caching (future enhancement)

### Response Size Management
- **Reasonable Defaults**: Default to 20 items per page
- **Maximum Limit**: Cap at 100 items to prevent large payloads
- **Compression**: Enable gzip/brotli compression for JSON responses
- **Field Limitation**: Only return summary, not full content

### Monitoring and Metrics
- **Track Query Times**: Log slow queries (> 200ms)
- **Monitor Cache Hit Rate**: Track effectiveness of caching
- **Watch for N+1 Queries**: Ensure no unintended query multiplication
- **Database Connection Pool**: Monitor pool usage

## 9. Implementation Steps

### Step 1: Create Tutorial Service
**File**: `src/lib/services/tutorial.service.ts`

**Tasks**:
1. Create service class or module with exported functions
2. Implement `listTutorials()` function that accepts:
   - `supabaseClient`: SupabaseClient instance
   - `params`: Validated `ListTutorialsParams`
   - `userId`: Optional authenticated user ID
3. Build Supabase query with filters, sorting, and pagination
4. Execute main query and count query
5. If user authenticated and `include_completed=true`, fetch completion status
6. Merge completion status with tutorial results
7. Calculate pagination metadata
8. Return `ListTutorialsResponseDTO`

**Example Structure**:
```typescript
export async function listTutorials(
  supabase: SupabaseClient,
  params: ListTutorialsParams,
  userId?: string
): Promise<ListTutorialsResponseDTO> {
  // Implementation
}
```

### Step 2: Create Validation Schema
**File**: `src/pages/api/tutorials/index.ts` (or separate validation file)

**Tasks**:
1. Import Zod
2. Define `ListTutorialsQuerySchema` with all validations
3. Include proper error messages for each validation rule
4. Test schema with various valid and invalid inputs

### Step 3: Create API Endpoint
**File**: `src/pages/api/tutorials/index.ts`

**Tasks**:
1. Create Astro API endpoint file
2. Export `prerender = false` for dynamic rendering
3. Implement `GET` handler function
4. Extract query parameters from `request.url`
5. Validate parameters using Zod schema
6. Handle validation errors (return 400)
7. Check user authentication status using `context.locals.supabase`
8. Call `TutorialService.listTutorials()` with validated params
9. Handle service errors (return 500)
10. Return successful response with 200 status

**Example Structure**:
```typescript
export const prerender = false;

export async function GET(context: APIContext): Promise<Response> {
  try {
    // Parse query params
    // Validate with Zod
    // Get user if authenticated
    // Call service
    // Return response
  } catch (error) {
    // Handle errors
  }
}
```

### Step 4: Handle RLS Policy Conflict
**File**: `supabase/migrations/[timestamp]_allow_public_tutorial_reads.sql`

**Tasks**:
1. Create new migration file
2. Update RLS policy for `tutorials` table to allow public reads:
   ```sql
   DROP POLICY IF EXISTS "Tutorials are readable by authenticated users" ON tutorials;
   CREATE POLICY "Tutorials are publicly readable" ON tutorials
     FOR SELECT USING (true);
   ```
3. Apply migration to database
4. Test that anonymous users can query tutorials

**Alternative**: If tutorials should remain auth-only, use service role client in the service.

### Step 5: Implement Error Handling
**Location**: Throughout service and endpoint

**Tasks**:
1. Create error formatting utility function for `ApiErrorResponse`
2. Handle Zod validation errors and format them properly
3. Wrap database queries in try-catch blocks
4. Log errors appropriately (console.error with context)
5. Return appropriate HTTP status codes
6. Ensure no sensitive information leaked in error messages

### Step 6: Add Response Headers
**Location**: API endpoint

**Tasks**:
1. Set `Content-Type: application/json`
2. Add `Cache-Control` header for anonymous requests
3. Add CORS headers if needed (for cross-origin requests)

### Step 7: Update Types and Documentation
**Files**: Various

**Tasks**:
1. Ensure all types in `src/types.ts` match implementation
2. Update API documentation if separate docs exist
3. Add JSDoc comments to service functions
4. Update this implementation plan if changes made during development

### Step 8: Code Review Checklist
**Review**:
- [ ] All query parameters properly validated
- [ ] Zod schema includes all validations from spec
- [ ] Error responses follow standard format
- [ ] HTTP status codes are correct
- [ ] Service properly handles optional user context
- [ ] Completion status only included when appropriate
- [ ] Database queries are optimized (no N+1)
- [ ] Indexes exist for filtered/sorted columns
- [ ] RLS policy allows intended access pattern
- [ ] No sensitive data exposed
- [ ] Error messages are user-friendly
- [ ] Errors are logged with sufficient context
- [ ] Response format matches specification exactly
- [ ] Pagination metadata calculated correctly
- [ ] Edge cases handled (empty results, out of bounds pages)
- [ ] Code follows project structure and conventions
- [ ] TypeScript types are properly used throughout
- [ ] No any types unless absolutely necessary

---

## Additional Notes

### Future Enhancements
- **Full-text Search**: Add search by title/summary
- **Response Compression**: Implement gzip compression

### Dependencies
- Supabase client properly configured
- Database migrations applied
- Types generated from database schema
- Zod library installed
- User authentication middleware working

### Related Endpoints
- `GET /api/tutorials/:id` - Get single tutorial details (to be implemented)
- `POST /api/tutorials/:id/complete` - Mark tutorial as completed (to be implemented)
- `GET /api/articles` - Similar endpoint for articles (similar implementation pattern)
