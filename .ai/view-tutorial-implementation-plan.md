# API Endpoint Implementation Plan: Get Tutorial Detail

## 1. Endpoint Overview

The **Get Tutorial Detail** endpoint retrieves comprehensive information about a specific tutorial, including all content sections, steps, practice recommendations, and key takeaways. When a user is authenticated, the endpoint also returns their completion status and completion timestamp for the tutorial. This endpoint is publicly accessible (authentication not required) but provides enhanced data when the user is logged in.

**Primary Use Cases:**
- Display full tutorial content on a dedicated tutorial detail page
- Show user's progress on the tutorial (if authenticated)
- Enable users to read and learn from tutorial content
- Support both guest and authenticated user experiences

---

## 2. Request Details

### HTTP Method
`GET`

### URL Structure
```
/api/tutorials/:id
```

### Path Parameters
| Parameter | Type   | Required | Description                                    | Validation                  |
|-----------|--------|----------|------------------------------------------------|-----------------------------|
| `id`      | string | Yes      | UUID of the tutorial to retrieve               | Must be a valid UUID format |

### Query Parameters
None

### Request Headers
| Header          | Required | Description                                                      |
|-----------------|----------|------------------------------------------------------------------|
| `Authorization` | No       | Bearer token for authenticated requests (optional)               |
| `Cookie`        | No       | Session cookie containing auth token (optional, browser context) |

### Request Body
None (GET request)

---

## 3. Used Types

### DTOs (Data Transfer Objects)

#### Response DTO
```typescript
// From src/types.ts (lines 81-99, 122)
export interface TutorialDetailDTO
  extends Pick<
    TutorialEntity,
    | 'id'
    | 'title'
    | 'category'
    | 'level'
    | 'difficulty_weight'
    | 'summary'
    | 'content'
    | 'practice_recommendations'
    | 'key_takeaways'
    | 'created_at'
    | 'updated_at'
  > {
  steps: TutorialStep[];
  is_completed: boolean;
  completed_at: string | null;
}

export type GetTutorialDetailResponseDTO = TutorialDetailDTO;
```

#### Supporting Types
```typescript
// From src/types.ts (lines 33-37)
export interface TutorialStep {
  title: string;
  content: string;
  order: number;
}

// From src/types.ts (lines 22-23)
export type DifficultyLevel = Enums<'difficulty_level'>; // 'BEGINNER' | 'INTERMEDIATE' | 'EXPERIENCED'
export type TutorialCategory = Enums<'tutorial_category'>; // 'PRACTICAL' | 'THEORETICAL' | 'EQUIPMENT'
```

#### Error Response DTO
```typescript
// From src/types.ts (lines 408-414)
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}
```

### Validation Schemas (Zod)

```typescript
// Path parameter validation
const tutorialIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid tutorial ID format' })
});
```

---

## 4. Response Details

### Success Response (200 OK)

**Status Code:** `200 OK`

**Response Body:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
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

**Notes:**
- `is_completed` is `false` and `completed_at` is `null` for unauthenticated users
- `is_completed` is `true` and `completed_at` contains ISO 8601 timestamp when user has completed the tutorial
- `steps` array is parsed from the JSONB column in the database

### Error Responses

#### 400 Bad Request - Invalid UUID Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid tutorial ID format",
    "details": {
      "id": "Must be a valid UUID"
    }
  }
}
```

#### 404 Not Found - Tutorial Does Not Exist
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Tutorial not found"
  }
}
```

#### 500 Internal Server Error - Unexpected Server Error
```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred while retrieving the tutorial"
  }
}
```

---

## 5. Data Flow

### High-Level Flow Diagram
```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ GET /api/tutorials/:id
       ▼
┌─────────────────────────────────┐
│ API Route Handler               │
│ (src/pages/api/tutorials/[id])  │
└────────┬────────────────────────┘
         │
         │ 1. Extract & validate ID parameter
         ▼
┌─────────────────────────┐
│ Zod Validation          │
│ - Validate UUID format  │
└────────┬────────────────┘
         │
         │ 2. Check authentication (optional)
         ▼
┌──────────────────────────┐
│ Astro Middleware         │
│ - Extract user from      │
│   context.locals         │
└────────┬─────────────────┘
         │
         │ 3. Call service layer
         ▼
┌────────────────────────────────┐
│ TutorialService                │
│ - getTutorialDetail(id, userId)│
└────────┬───────────────────────┘
         │
         │ 4. Query database
         ▼
┌─────────────────────────────────────────┐
│ Supabase Client                         │
│ - SELECT from tutorials                 │
│ - LEFT JOIN user_tutorials (if auth)    │
│ - Parse JSONB steps field               │
└────────┬────────────────────────────────┘
         │
         │ 5. Transform to DTO
         ▼
┌─────────────────────────────┐
│ Data Transformation         │
│ - Map DB entity to DTO      │
│ - Parse steps JSONB         │
│ - Set completion flags      │
└────────┬────────────────────┘
         │
         │ 6. Return response
         ▼
┌─────────────┐
│   Client    │
└─────────────┘
```

### Detailed Step-by-Step Flow

1. **Request Reception**
   - API route receives GET request at `/api/tutorials/:id`
   - Extract `id` parameter from URL path
   - Extract optional authentication token from headers/cookies via `context.locals.supabase`

2. **Input Validation**
   - Validate `id` parameter using Zod schema
   - Check if `id` is a valid UUID format
   - If invalid, return `400 Bad Request` with validation error details

3. **User Authentication Check (Optional)**
   - Check if user is authenticated via `context.locals.supabase.auth.getUser()`
   - Extract `user.id` if authenticated
   - If not authenticated, set `userId = null`

4. **Service Layer Invocation**
   - Call `TutorialService.getTutorialDetail(id, userId)`
   - Pass tutorial ID and optional user ID to service

5. **Database Query**
   - Execute Supabase query to fetch tutorial:
     ```typescript
     const query = supabase
       .from('tutorials')
       .select('*')
       .eq('id', tutorialId)
       .single();
     ```
   - If user is authenticated, add LEFT JOIN to check completion:
     ```typescript
     const query = supabase
       .from('tutorials')
       .select(`
         *,
         user_tutorials!left(completed_at)
       `)
       .eq('id', tutorialId)
       .eq('user_tutorials.user_id', userId)
       .single();
     ```

6. **Error Handling - Not Found**
   - If query returns no results, throw/return `404 Not Found` error
   - Return structured error response

7. **Data Transformation**
   - Parse JSONB `steps` field into `TutorialStep[]` array
   - Map database entity fields to DTO structure
   - Set `is_completed` based on presence of completion record
   - Set `completed_at` from user_tutorials join (or null if not completed/authenticated)

8. **Response Formation**
   - Construct `GetTutorialDetailResponseDTO` object
   - Return JSON response with `200 OK` status

9. **Error Logging**
   - Log unexpected errors to console/monitoring service
   - Include context: tutorial ID, user ID (if applicable), error stack trace

---

## 6. Security Considerations

### Authentication & Authorization

**Public Access:**
- Endpoint does NOT require authentication
- Tutorials content (`public.tutorials` table) is readable by all users
- Database RLS policy: `auth.role() = 'authenticated'` allows reading by authenticated users
- **Important:** Since authentication is not required, the API should handle both authenticated and unauthenticated requests gracefully

**Completion Data Protection:**
- Completion status (`is_completed`, `completed_at`) should only be returned for the authenticated user
- Do NOT leak other users' completion data
- If user is not authenticated:
  - `is_completed` = `false`
  - `completed_at` = `null`
- Database RLS on `user_tutorials` ensures `user_id` matches `auth.uid()`

### Input Validation

**UUID Validation:**
- Use Zod schema to validate UUID format
- Prevent malformed IDs from reaching database layer
- Reject requests with non-UUID strings early

**SQL Injection Prevention:**
- Use Supabase client SDK parameterized queries (automatic protection)
- Never concatenate user input into SQL strings
- Rely on Supabase type-safe query builders

### Data Exposure

**Sensitive Fields:**
- No sensitive user data exposed in this endpoint
- Tutorial content is public by design
- Completion data is scoped to authenticated user only

**Error Messages:**
- Avoid exposing database schema details in error messages
- Use generic error messages for 500 errors
- Provide specific validation errors only for client-side issues (400)


## 7. Error Handling

### Error Categories and HTTP Status Codes

| Error Scenario                          | Status Code | Error Code             | Message                                                      | Handling Strategy                              |
|-----------------------------------------|-------------|------------------------|--------------------------------------------------------------|------------------------------------------------|
| Invalid UUID format                     | 400         | VALIDATION_ERROR       | Invalid tutorial ID format                                   | Validate with Zod, return early                |
| Tutorial not found in database          | 404         | NOT_FOUND              | Tutorial not found                                           | Check query result, return 404 if null         |
| Database connection failure             | 500         | INTERNAL_SERVER_ERROR  | An unexpected error occurred while retrieving the tutorial   | Catch exception, log error, return 500         |
| JSONB parsing error (malformed steps)   | 500         | INTERNAL_SERVER_ERROR  | Failed to parse tutorial steps                               | Catch JSON parse error, log, return 500        |
| Supabase client error                   | 500         | INTERNAL_SERVER_ERROR  | Database query failed                                        | Catch SDK error, log with context, return 500  |

### Error Response Structure

All errors follow the standardized `ApiErrorResponse` format:

```typescript
interface ApiErrorResponse {
  error: {
    code: string;           // Machine-readable error code
    message: string;        // Human-readable error message
    details?: Record<string, string>; // Optional field-specific errors
  };
}
```

### Error Handling Implementation

**Validation Errors (400):**
```typescript
try {
  const { id } = tutorialIdParamSchema.parse(context.params);
} catch (error) {
  if (error instanceof z.ZodError) {
    return new Response(JSON.stringify({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid tutorial ID format',
        details: error.flatten().fieldErrors
      }
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

**Not Found Errors (404):**
```typescript
if (!tutorial) {
  return new Response(JSON.stringify({
    error: {
      code: 'NOT_FOUND',
      message: 'Tutorial not found'
    }
  }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

**Server Errors (500):**
```typescript
catch (error) {
  console.error('Error retrieving tutorial:', {
    tutorialId: id,
    userId: user?.id,
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined
  });

  return new Response(JSON.stringify({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred while retrieving the tutorial'
    }
  }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Logging Strategy

**What to Log:**
- All 500 errors with full context (tutorial ID, user ID, error message, stack trace)
- Database query failures
- JSONB parsing errors
- Authentication/authorization failures

**What NOT to Log:**
- Valid 404 responses (tutorial not found is expected behavior)
- Valid 400 responses (client-side validation errors)

**Log Format:**
```typescript
console.error('Error retrieving tutorial:', {
  timestamp: new Date().toISOString(),
  endpoint: '/api/tutorials/:id',
  tutorialId: id,
  userId: user?.id || 'unauthenticated',
  errorCode: 'INTERNAL_SERVER_ERROR',
  errorMessage: error.message,
  stack: error.stack
});
```

---

## 8. Performance Considerations

### Database Query Optimization

**Single Query Strategy:**
- Use a single query with LEFT JOIN instead of multiple sequential queries
- Fetch tutorial and completion status in one database round-trip
- Leverage Supabase query builder for efficient joins

**Query Structure:**
```typescript
// Efficient: Single query with LEFT JOIN
const { data, error } = await supabase
  .from('tutorials')
  .select(`
    id,
    title,
    category,
    level,
    difficulty_weight,
    summary,
    content,
    steps,
    practice_recommendations,
    key_takeaways,
    created_at,
    updated_at,
    user_tutorials!left(completed_at)
  `)
  .eq('id', tutorialId)
  .eq('user_tutorials.user_id', userId)
  .single();
```

**Index Utilization:**
- Primary key index on `tutorials.id` ensures fast lookup (O(log n))
- Composite index on `user_tutorials(user_id, tutorial_id)` speeds up completion check
- No need for additional indexes for this endpoint

### JSONB Parsing Performance

**Steps Field Parsing:**
- JSONB parsing is fast in PostgreSQL (native support)
- Parsing in TypeScript is minimal overhead (small array size)
- Consider validating steps structure to prevent malformed data

**Optimization:**
```typescript
// Safe JSONB parsing with fallback
const steps: TutorialStep[] = Array.isArray(tutorial.steps) 
  ? tutorial.steps 
  : [];
```

### Caching Strategy

**Caching Opportunities:**
- Tutorial content changes infrequently (mostly static)
- Consider HTTP cache headers for public content
- Cache completion status separately (user-specific, changes frequently)

**Recommended Cache Headers:**
```typescript
// For unauthenticated requests (public content)
headers: {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
}

// For authenticated requests (user-specific data)
headers: {
  'Content-Type': 'application/json',
  'Cache-Control': 'private, no-cache'
}
```

**Alternative Caching Approach:**
- Use in-memory cache (Redis, Astro's experimental cache) for frequently accessed tutorials
- Cache key: `tutorial:${id}`
- TTL: 5-10 minutes
- Invalidate on content updates (post-MVP)

### Response Size Optimization

**Content Size:**
- Full tutorial content can be large (several KB)
- Steps array size is typically small (5-10 items)
- Total response size: ~5-50 KB per tutorial

**Compression:**
- Enable gzip/brotli compression in Astro config
- Reduce response size by 70-80% for text content

**Pagination Consideration:**
- Not applicable for single tutorial detail endpoint
- Future: Consider pagination for very large steps arrays (unlikely needed)

### Expected Performance Metrics

**Target Response Times:**
- Database query: < 50ms
- JSONB parsing: < 5ms
- Total response time: < 100ms (P95)
- Total response time: < 200ms (P99)

**Load Capacity:**
- Single Supabase instance can handle 1000+ requests/second for read queries
- Bottleneck is more likely network/API layer than database

---

## 9. Implementation Steps

### Step 1: Create Service Layer

**File:** `src/lib/services/tutorial.service.ts`

**Implementation:**
```typescript
import type { SupabaseClient } from '@/db/supabase.client';
import type { GetTutorialDetailResponseDTO, TutorialStep } from '@/types';

export class TutorialService {
  constructor(private supabase: SupabaseClient) {}

  async getTutorialDetail(
    tutorialId: string,
    userId?: string
  ): Promise<GetTutorialDetailResponseDTO | null> {
    // Build query with optional user completion join
    let query = this.supabase
      .from('tutorials')
      .select(`
        id,
        title,
        category,
        level,
        difficulty_weight,
        summary,
        content,
        steps,
        practice_recommendations,
        key_takeaways,
        created_at,
        updated_at
      `)
      .eq('id', tutorialId)
      .single();

    // If user is authenticated, check completion status
    let completionData = null;
    if (userId) {
      const { data: completion } = await this.supabase
        .from('user_tutorials')
        .select('completed_at')
        .eq('user_id', userId)
        .eq('tutorial_id', tutorialId)
        .maybeSingle();
      
      completionData = completion;
    }

    const { data: tutorial, error } = await query;

    if (error || !tutorial) {
      return null;
    }

    // Parse JSONB steps field
    const steps: TutorialStep[] = Array.isArray(tutorial.steps)
      ? tutorial.steps
      : [];

    // Construct response DTO
    return {
      id: tutorial.id,
      title: tutorial.title,
      category: tutorial.category,
      level: tutorial.level,
      difficulty_weight: tutorial.difficulty_weight,
      summary: tutorial.summary,
      content: tutorial.content,
      steps,
      practice_recommendations: tutorial.practice_recommendations,
      key_takeaways: tutorial.key_takeaways,
      created_at: tutorial.created_at,
      updated_at: tutorial.updated_at,
      is_completed: !!completionData,
      completed_at: completionData?.completed_at || null
    };
  }
}
```

**Notes:**
- Use constructor injection for Supabase client
- Handle null/undefined userId gracefully
- Parse JSONB with type safety
- Return null if tutorial not found (caller handles 404)

---

### Step 2: Create Validation Schema

**File:** `src/lib/utils/validation.ts` (or inline in route handler)

**Implementation:**
```typescript
import { z } from 'zod';

export const tutorialIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid tutorial ID format' })
});

export type TutorialIdParam = z.infer<typeof tutorialIdParamSchema>;
```

---

### Step 3: Implement API Route Handler

**File:** `src/pages/api/tutorials/[id].ts`

**Implementation:**
```typescript
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { TutorialService } from '@/lib/services/tutorial.service';
import type { GetTutorialDetailResponseDTO, ApiErrorResponse } from '@/types';

export const prerender = false;

const tutorialIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid tutorial ID format' })
});

export const GET: APIRoute = async (context) => {
  try {
    // Step 1: Extract and validate path parameter
    const validationResult = tutorialIdParamSchema.safeParse(context.params);
    
    if (!validationResult.success) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid tutorial ID format',
          details: validationResult.error.flatten().fieldErrors as Record<string, string>
        }
      };
      
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { id: tutorialId } = validationResult.data;

    // Step 2: Get authenticated user (optional)
    const supabase = context.locals.supabase;
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // Step 3: Call service layer
    const tutorialService = new TutorialService(supabase);
    const tutorial = await tutorialService.getTutorialDetail(tutorialId, userId);

    // Step 4: Handle not found
    if (!tutorial) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'Tutorial not found'
        }
      };
      
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Step 5: Return success response
    const response: GetTutorialDetailResponseDTO = tutorial;
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': userId ? 'private, no-cache' : 'public, max-age=300'
      }
    });

  } catch (error) {
    // Step 6: Handle unexpected errors
    console.error('Error retrieving tutorial:', {
      timestamp: new Date().toISOString(),
      endpoint: '/api/tutorials/:id',
      tutorialId: context.params.id,
      userId: context.locals.supabase ? 'check failed' : 'unauthenticated',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    const errorResponse: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred while retrieving the tutorial'
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

**Key Implementation Details:**
- Use `export const prerender = false` to ensure dynamic rendering
- Use `context.locals.supabase` for database client (per Astro guidelines)
- Use `safeParse` for validation to handle errors gracefully
- Implement early returns for error conditions (guard clauses)
- Set appropriate cache headers based on authentication status
- Log errors with full context for debugging

---

### Step 4: Update Type Definitions (if needed)

**File:** `src/types.ts`

**Verification:**
- Ensure `TutorialDetailDTO` includes all required fields
- Ensure `GetTutorialDetailResponseDTO` alias exists
- Ensure `TutorialStep` interface is defined
- All types already defined (no changes needed based on current types.ts)

---

### Step 5: Configure Middleware (if needed)

**File:** `src/middleware/index.ts`

**Ensure middleware:**
- Initializes Supabase client and attaches to `context.locals.supabase`
- Handles session management (cookie-based or header-based auth)
- Does NOT require authentication for this endpoint (public access allowed)

**Example middleware setup:**
```typescript
import { defineMiddleware } from 'astro:middleware';
import { createSupabaseClient } from '@/db/supabase.client';

export const onRequest = defineMiddleware(async (context, next) => {
  // Initialize Supabase client for this request
  const supabase = createSupabaseClient(context.request);
  context.locals.supabase = supabase;
  
  return next();
});
```

---

### Step 6: Add Linter Configuration (if needed)

**Ensure ESLint/TypeScript:**
- All types are properly imported
- No unused variables
- Consistent error handling patterns
- Proper async/await usage

---

### Step 7: Test Implementation

**Manual Testing Checklist:**

1. **Test Valid Tutorial ID (Unauthenticated):**
   ```bash
   curl -X GET http://localhost:4321/api/tutorials/{valid-uuid}
   ```
   - Expected: 200 OK with tutorial data
   - `is_completed` should be `false`
   - `completed_at` should be `null`

2. **Test Valid Tutorial ID (Authenticated):**
   ```bash
   curl -X GET http://localhost:4321/api/tutorials/{valid-uuid} \
     -H "Authorization: Bearer {valid-token}"
   ```
   - Expected: 200 OK with tutorial data
   - `is_completed` should reflect actual completion status
   - `completed_at` should contain timestamp if completed

3. **Test Invalid UUID Format:**
   ```bash
   curl -X GET http://localhost:4321/api/tutorials/invalid-id
   ```
   - Expected: 400 Bad Request with validation error

4. **Test Non-Existent Tutorial:**
   ```bash
   curl -X GET http://localhost:4321/api/tutorials/{non-existent-uuid}
   ```
   - Expected: 404 Not Found

---

### Step 8: Documentation

**Add JSDoc Comments:**
- Document service methods
- Document route handler
- Document validation schemas

**Example:**
```typescript
/**
 * Retrieves detailed information for a specific tutorial.
 * 
 * @param tutorialId - UUID of the tutorial to retrieve
 * @param userId - Optional UUID of the authenticated user
 * @returns Tutorial detail DTO or null if not found
 * @throws Error if database query fails
 */
async getTutorialDetail(
  tutorialId: string,
  userId?: string
): Promise<GetTutorialDetailResponseDTO | null>
```

---

### Step 9: Deploy and Monitor

**Pre-Deployment Checklist:**
- ✅ All types properly defined
- ✅ Validation schema tested
- ✅ Service layer implemented
- ✅ Route handler implemented
- ✅ Error handling comprehensive
- ✅ Logging configured
- ✅ Cache headers set
- ✅ Security considerations addressed

**Post-Deployment Monitoring:**
- Monitor error rates (should be < 1% for 500 errors)
- Monitor response times (should be < 100ms P95)
- Monitor 404 rates (indicates broken links or invalid IDs)
- Set up alerts for elevated error rates

---

## Summary

This implementation plan provides a comprehensive guide for building the **Get Tutorial Detail** endpoint. The endpoint is designed to be:

- **Secure**: Validates input, prevents SQL injection, protects user data
- **Performant**: Uses optimized queries, caching, and efficient data structures
- **Robust**: Handles errors gracefully with comprehensive logging
- **Maintainable**: Follows clean code principles with service layer separation
- **Type-Safe**: Leverages TypeScript and Zod for compile-time and runtime safety

By following this plan, the development team will create a production-ready API endpoint that meets all requirements and follows best practices for the Cook Mastery application.
