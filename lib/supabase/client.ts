/**
 * lib/supabase/client.ts
 * Browser-side Supabase client (singleton).
 *
 * Usage in Client Components:
 *   import { createBrowserClient } from '@/lib/supabase/client'
 *   const supabase = createBrowserClient()
 *
 * Note: The anon key is safe to expose publicly — RLS policies
 * protect data access at the database level.
 */

import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Creates a typed Supabase client for use in browser (Client Components).
 * Each call returns the same singleton instance per page.
 */
export function createBrowserClient(): SupabaseClient<Database> {
  return createSupabaseBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ) as unknown as SupabaseClient<Database>;
}
