import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/supabase/env";

/**
 * Session-free client for public catalog reads (styles, approved shops,
 * items for sale). It never touches cookies, so pages using only this can be
 * cached. Row level security applies as for any anonymous visitor.
 */
export function createPublicClient() {
  const { url, publishableKey } = supabaseEnv();
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
