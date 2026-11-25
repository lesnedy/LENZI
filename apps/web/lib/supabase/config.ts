const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

function isPlaceholder(value: string): boolean {
  return (
    value.length === 0 ||
    value.includes("YOUR_PROJECT_REF") ||
    value.includes("REPLACE_ME")
  );
}

export const supabaseConfig = {
  url,
  publishableKey,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  defaultLanguage:
    process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE === "en" ? "en" : "sw",
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE === "true",
} as const;

/**
 * The publishable key is safe for the browser. It still must be present and
 * must not be a template placeholder before any client is created.
 */
export const isSupabaseConfigured =
  !isPlaceholder(url) && !isPlaceholder(publishableKey);

export function requireSupabaseConfig(): { url: string; key: string } {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in apps/web/.env.local.",
    );
  }
  return { url, key: publishableKey };
}
