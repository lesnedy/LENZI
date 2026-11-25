"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, requireSupabaseConfig } from "./config";

let browserClient: SupabaseClient | null = null;

/**
 * Returns a singleton browser client, or null when the project has not been
 * configured yet. Callers must render an explicit "not configured" state.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (!browserClient) {
    const { url, key } = requireSupabaseConfig();
    browserClient = createBrowserClient(url, key);
  }
  return browserClient;
}
