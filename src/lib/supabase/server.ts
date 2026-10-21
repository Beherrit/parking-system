import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "./env";

export interface RequestSupabase {
  db: SupabaseClient;
  userId: string | null;
}

const NO_SESSION = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

function bearerToken(req: Request): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(req.headers.get("authorization") ?? "");
  return match ? match[1] : null;
}

// getClaims verifies the JWT signature locally against the project's published keys (ES256),
// so no round trip to Supabase Auth on every request. Expired or forged tokens give null.
async function verifiedUserId(db: SupabaseClient, token?: string): Promise<string | null> {
  const { data, error } = await db.auth.getClaims(token);
  return error ? null : (data?.claims.sub ?? null);
}

async function fromBearer(token: string): Promise<RequestSupabase> {
  const db = createClient(supabaseUrl(), supabaseAnonKey(), {
    auth: NO_SESSION,
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  return { db, userId: await verifiedUserId(db, token) };
}

async function fromCookies(): Promise<RequestSupabase> {
  const store = await cookies();
  const db = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server Components cannot set cookies; the proxy refreshes the session instead.
        }
      },
    },
  });
  return { db, userId: await verifiedUserId(db) };
}

/** Bearer token wins (API tests use it); otherwise the cookie session. */
export async function getRequestSupabase(req: Request): Promise<RequestSupabase> {
  const token = bearerToken(req);
  return token ? fromBearer(token) : fromCookies();
}
