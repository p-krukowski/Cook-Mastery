/// <reference types="astro/client" />

import type { SupabaseClient } from './db/supabase.client.ts';
import type { ProfileDTO } from './types.ts';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
      user?: {
        id: string;
        email: string;
      };
      profile?: ProfileDTO;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
