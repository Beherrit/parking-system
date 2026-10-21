import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

/** Refreshes the Supabase session cookie on page requests and sends signed-out visitors to /login. */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  // Bearer requests carry their own token; the handler verifies it.
  if (request.headers.has("authorization")) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies, headers) {
        // Forward the refreshed cookies to the page or handler as well as to the browser.
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Verified locally against the project's signing keys; refreshes the cookie first if it expired.
  const { data } = await supabase.auth.getClaims();
  if (data?.claims || pathname === "/login") return response;

  const redirect = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  response.headers.forEach((value, key) => {
    if (key === "cache-control" || key === "expires" || key === "pragma") redirect.headers.set(key, value);
  });
  return redirect;
}

export const config = {
  // Pages only. API handlers verify the session themselves, so running here too doubled the auth work.
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
