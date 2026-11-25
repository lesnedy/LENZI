import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabaseConfig } from "./config";

/**
 * Cookie-bound Supabase client for Route Handlers and Server Actions.
 * Never use a service-role key here.
 */
export async function createSupabaseServerClient() {
  const { url, key } = requireSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. The proxy refreshes the
          // session instead; this is safe to ignore outside Route Handlers.
        }
      },
    },
  });
}
