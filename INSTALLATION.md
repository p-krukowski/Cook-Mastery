# Cook Mastery - Installation & Setup Guide

## Prerequisites

- Node.js 18+ and npm
- Supabase account with a project created

## Required Dependencies

The following packages need to be installed for authentication to work:

```bash
npm install @supabase/ssr zod
```

### Package Overview

- `@supabase/ssr` - Supabase SSR support for cookie-based authentication in Astro
- `zod` - Schema validation for API endpoints

## Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Supabase credentials:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_KEY` - Your Supabase anonymous/public key
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (keep secret!)

   You can find these in your Supabase project settings under "API".

## Supabase Configuration

### Disable Email Confirmation (MVP)

For MVP, we need immediate authenticated sessions after signup without email verification:

1. Go to Supabase Dashboard → Authentication → Providers
2. Find "Email" provider
3. Disable "Confirm email" option
4. Save changes

### Database Setup

Make sure you have the following tables in your Supabase database:

- `profiles` - User profiles with username and selected_level
- Other tables as per your database schema

### Row Level Security (RLS)

Ensure RLS policies are configured for:
- `profiles` table (users can read their own profile)
- Other user-owned data tables

## Running the Application

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:3000

## Authentication Flow

- **Login**: `/login` - Users can log in with email or username + password
- **Signup**: `/signup` - New users create accounts (to be implemented)
- **Session**: Managed via HttpOnly cookies (secure, not accessible to JavaScript)

## Troubleshooting

### TypeScript Errors

If you see TypeScript errors about missing modules, make sure all dependencies are installed:

```bash
npm install
```

### Authentication Issues

1. Check that `.env` file exists with correct Supabase credentials
2. Verify Supabase email confirmation is disabled
3. Check browser dev tools → Network tab for API errors
4. Check server console for detailed error logs

### Cookie Issues

- In development, cookies use `secure: false` automatically
- In production, cookies require HTTPS (`secure: true`)
- Make sure your domain allows cookies (not blocked by browser settings)
