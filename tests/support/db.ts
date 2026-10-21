// Direct database access for test setup only. The service role bypasses RLS, never the constraints.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { testEnv } from "./env";

let admin: SupabaseClient | null = null;

export function adminDb(): SupabaseClient {
  admin ??= createClient(testEnv.supabaseUrl, testEnv.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

/** Empties the lot: deletes every ticket. Spots stay as seeded. */
export async function resetLot(): Promise<void> {
  const { error } = await adminDb().from("tickets").delete().not("id", "is", null);
  if (error) throw new Error(`resetLot failed: ${error.message}`);
}

/** Signs in as a seeded attendant and returns the access token for Bearer requests. */
export async function attendantToken(email = testEnv.attendantEmail): Promise<string> {
  const client = createClient(testEnv.supabaseUrl, testEnv.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: testEnv.attendantPassword,
  });
  if (error || !data.session) throw new Error(`Sign-in failed for ${email}: ${error?.message}`);
  return data.session.access_token;
}

export async function spotIdsBySize(size: "small" | "large"): Promise<{ id: string; number: string }[]> {
  const { data, error } = await adminDb().from("spots").select("id, number").eq("size", size);
  if (error) throw new Error(error.message);
  return data;
}
