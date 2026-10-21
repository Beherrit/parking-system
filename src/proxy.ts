import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

const isApi = (path: string) => path === "/api" || path.startsWith("/api/");

/** Refreshes the Supabase session cookie and sends signed-out page requests to /login. */
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

  const { data } = await supabase.auth.getUser();
  if (data.user || isApi(pathname) || pathname === "/login") return response;

  const redirect = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  response.headers.forEach((value, key) => {
    if (key === "cache-control" || key === "expires" || key === "pragma") redirect.headers.set(key, value);
  });
  return redirect;
}

export const config = {
  // Everything except Next internals and static files. /api is included only to refresh the cookie.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
