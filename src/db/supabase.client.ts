import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient as SupabaseClientBase } from '@supabase/supabase-js';
import { createServerClient, type CookieOptionsWithName } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

import type { Database } from '../db/database.types.ts';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Export typed SupabaseClient for use throughout the application
export type SupabaseClient = SupabaseClientBase<Database>;

/**
 * Cookie options for Supabase Auth session cookies
 * Configured for secure, HttpOnly, SameSite cookie handling
 */
export const cookieOptions: CookieOptionsWithName = {
  path: '/',
  secure: import.meta.env.PROD,
  httpOnly: true,
  sameSite: 'lax',
};

/**
 * Parses cookie header string into array of name-value pairs
 * Required for Supabase SSR cookie adapter
 */
function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  if (!cookieHeader) return [];
  
  return cookieHeader.split(';').map((cookie) => {
    const [name, ...rest] = cookie.trim().split('=');
    return { name, value: rest.join('=') };
  });
}

/**
 * Creates a request-scoped Supabase server client for SSR
 * Uses cookies for session management (HttpOnly, Secure)
 * 
 * CRITICAL: Use ONLY this client in API routes and middleware
 * to ensure proper cookie-backed authentication
 * 
 * @param context - Request context with headers and cookies
 * @returns Supabase client configured for SSR with cookie auth
 */
export const createSupabaseServerInstance = (context: {
  headers: Headers;
  cookies: AstroCookies;
}) => {
  const supabase = createServerClient<Database>(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_KEY,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return parseCookieHeader(context.headers.get('Cookie') ?? '');
        },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            context.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  return supabase;
};
