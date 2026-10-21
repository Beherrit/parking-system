import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "./env";

export function createBrowserSupabase(): SupabaseClient {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
