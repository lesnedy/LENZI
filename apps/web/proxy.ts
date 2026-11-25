import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const configured =
  url.length > 0 &&
  key.length > 0 &&
  !url.includes("YOUR_PROJECT_REF") &&
  !key.includes("REPLACE_ME");

/**
 * Refreshes the Supabase session cookie on navigation. This is an optimistic
 * check only; every table and RPC enforces authorization in Postgres.
 */
export async function proxy(request: NextRequest) {
  if (!configured) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
