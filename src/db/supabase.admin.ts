import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.ts";

/**
 * Supabase Admin Client (Service Role)
 *
 * WARNING: This client bypasses Row Level Security (RLS) policies.
 * Use ONLY for:
 * - Admin operations that require elevated privileges
 * - Server-side username lookup (auth.admin.getUserById)
 * - Cleanup operations (e.g., orphaned auth user removal)
 *
 * NEVER use for regular user data operations - use the request-scoped
 * server client instead to ensure RLS policies are enforced.
 */
export const supabaseAdminClient = createClient<Database>(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
