1. List of tables with their columns, data types, and constraints

   - `public.profiles`
     - `id` uuid PRIMARY KEY REFERENCES `auth.users(id)` ON DELETE CASCADE
     - `username` text NOT NULL UNIQUE
     - `selected_level` difficulty_level NOT NULL DEFAULT 'BEGGINER'
     - `created_at` timestamptz NOT NULL DEFAULT now()
     - `updated_at` timestamptz NOT NULL DEFAULT now()

   - `public.tutorials`
     - `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
     - `title` text NOT NULL
     - `category` tutorial_category NOT NULL
     - `level` difficulty_level NOT NULL
     - `difficulty_weight` smallint NOT NULL CHECK (difficulty_weight BETWEEN 1 AND 5)
     - `summary` text NOT NULL
     - `content` text NOT NULL
     - `steps` jsonb NOT NULL
       - Expected structure: `[{"title": "...", "content": "...", "order": 1}]`
     - `practice_recommendations` text NOT NULL
     - `key_takeaways` text NOT NULL
     - `created_at` timestamptz NOT NULL DEFAULT now()
     - `updated_at` timestamptz NOT NULL DEFAULT now()

   - `public.articles`
     - `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
     - `title` text NOT NULL
     - `level` difficulty_level NOT NULL
     - `difficulty_weight` smallint NOT NULL CHECK (difficulty_weight BETWEEN 1 AND 5)
     - `summary` text NOT NULL
     - `content` text NOT NULL
     - `key_takeaways` text NOT NULL
     - `created_at` timestamptz NOT NULL DEFAULT now()
     - `updated_at` timestamptz NOT NULL DEFAULT now()

   - `public.user_tutorials`
     - `user_id` uuid NOT NULL REFERENCES `public.profiles(id)` ON DELETE CASCADE
     - `tutorial_id` uuid NOT NULL REFERENCES `public.tutorials(id)` ON DELETE CASCADE
     - `completed_at` timestamptz NOT NULL DEFAULT now()
     - PRIMARY KEY (`user_id`, `tutorial_id`)

   - `public.user_articles`
     - `user_id` uuid NOT NULL REFERENCES `public.profiles(id)` ON DELETE CASCADE
     - `article_id` uuid NOT NULL REFERENCES `public.articles(id)` ON DELETE CASCADE
     - `completed_at` timestamptz NOT NULL DEFAULT now()
     - PRIMARY KEY (`user_id`, `article_id`)

   - `public.cookbook_entries`
     - `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
     - `user_id` uuid NOT NULL REFERENCES `public.profiles(id)` ON DELETE CASCADE
     - `url` text NOT NULL
     - `title` text NOT NULL
     - `notes` text
     - `created_at` timestamptz NOT NULL DEFAULT now()
     - `updated_at` timestamptz NOT NULL DEFAULT now()

   - `public.user_level_progress` (VIEW)
     - Computes per-user, per-level completion percentage:
       - `user_id` uuid
       - `level` difficulty_level
       - `completed_count` bigint
       - `total_count` bigint
       - `completion_percent` numeric
       - `is_up_to_date` boolean (completion_percent >= 85)
     - Aggregates `user_tutorials` + `user_articles` against total `tutorials` + `articles` for each level.

   - ENUM types
     - `difficulty_level`: 'BEGGINER', 'INTERMEDIATE', 'EXPERIENCED'
     - `tutorial_category`: 'PRACTICAL', 'THEORETICAL', 'EQUIPMENT'

2. Relationships between tables

   - One-to-one: `auth.users` → `public.profiles` (via `profiles.id`)
   - One-to-many: `public.profiles` → `public.cookbook_entries`
   - Many-to-many: `public.profiles` ↔ `public.tutorials` via `public.user_tutorials`
   - Many-to-many: `public.profiles` ↔ `public.articles` via `public.user_articles`

3. Indexes

   - `public.tutorials`:
     - Index on `created_at` (for “new content first”)
     - Optional composite index on (`level`, `difficulty_weight`, `created_at`)
   - `public.articles`:
     - Index on `created_at`
     - Optional composite index on (`level`, `difficulty_weight`, `created_at`)
   - `public.user_tutorials`:
     - Index on `completed_at`
     - Index on `tutorial_id` (analytics and joins)
   - `public.user_articles`:
     - Index on `completed_at`
     - Index on `article_id`
   - `public.cookbook_entries`:
     - Index on `user_id`
     - Index on `created_at`

4. PostgreSQL policies (if applicable)

   - Enable RLS on: `public.profiles`, `public.cookbook_entries`, `public.user_tutorials`, `public.user_articles`
   - `public.profiles`
     - SELECT: `auth.uid() = id`
     - UPDATE: `auth.uid() = id`
     - INSERT: `auth.uid() = id`
   - `public.cookbook_entries`
     - SELECT: `auth.uid() = user_id`
     - INSERT: `auth.uid() = user_id`
     - UPDATE: `auth.uid() = user_id`
     - DELETE: `auth.uid() = user_id`
   - `public.user_tutorials`
     - SELECT: `auth.uid() = user_id`
     - INSERT: `auth.uid() = user_id`
     - DELETE: `auth.uid() = user_id`
   - `public.user_articles`
     - SELECT: `auth.uid() = user_id`
     - INSERT: `auth.uid() = user_id`
     - DELETE: `auth.uid() = user_id`
   - `public.tutorials` / `public.articles`
     - SELECT: `auth.role() = 'authenticated'`
     - INSERT/UPDATE/DELETE: restricted to service role (no policy or explicit admin policy)

5. Additional notes or explanations about design decisions

   - Progress is tracked by the existence of a row in `user_tutorials` / `user_articles`; no “unpass/unread” in MVP.
   - Analytics and KPI computation use `created_at` on profiles and `completed_at` on junction tables; no separate events table.
   - `updated_at` is managed by application logic (no database triggers).
   - The `user_level_progress` view centralizes completion and “up to date” status.
   - auth.users table is managed by Supabase Auth
   