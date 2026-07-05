/**
 * lib/supabase/server.ts
 * Server-side Supabase client for use in Server Components and Server Actions.
 *
 * Usage in Server Components / Actions:
 *   import { createServerClient } from '@/lib/supabase/server'
 *   const supabase = await createServerClient()
 *
 * IMPORTANT: This client uses the ANON key. Access is controlled via RLS.
 * Before each data operation, call set_session_context RPC to set
 * app.current_user_id and app.current_user_role so RLS policies work.
 */

import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./types";

/**
 * Creates a typed Supabase client configured for server-side use.
 * Reads and writes cookies from the Next.js request/response cycle.
 */
export async function createServerClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll can throw in Server Components (read-only).
            // This is safe to ignore when not in a Server Action.
          }
        },
      },
    }
  ) as unknown as SupabaseClient<Database>;
}

/**
 * Sets the RLS session context for the current Supabase client.
 * Must be called at the start of every Server Action that touches DB data.
 *
 * @param supabase - The server Supabase client instance
 * @param userId   - The authenticated user's UUID
 * @param role     - The authenticated user's role ('admin' | 'representative')
 */
export async function setSessionContext(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  role: string
) {
  const { error } = await supabase.rpc("set_session_context", {
    p_user_id: userId,
    p_user_role: role,
  });

  if (error) {
    console.error("[setSessionContext] Failed to set RLS context:", error);
    throw new Error("Falha ao autenticar sessão no banco de dados.");
  }
}
