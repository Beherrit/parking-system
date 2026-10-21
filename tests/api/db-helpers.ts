// Helpers shared by the database tests (db-constraints, db-rls). Direct Supabase access, no HTTP.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { testEnv } from "../support/env";
import { adminDb, attendantToken } from "../support/db";

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
let counter = 0;

/** A fresh valid ticket code per call (8 Crockford characters). */
export function newCode(): string {
  counter += 1;
  let n = counter + Date.now() % 1_000_000;
  let code = "";
  for (let i = 0; i < 8; i++) {
    code = CROCKFORD[n % 32] + code;
    n = Math.floor(n / 32);
  }
  return code;
}

/** A fresh valid plate per call. */
export function newPlate(): string {
  counter += 1;
  return `T${counter.toString(36).toUpperCase()}${Date.now() % 1000}`;
}

export async function spotByNumber(number: string): Promise<{ id: string; size: "small" | "large" }> {
  const { data, error } = await adminDb().from("spots").select("id, size").eq("number", number).single();
  if (error) throw new Error(error.message);
  return data;
}

/** Row for a tickets insert: a small car in S1 unless overridden. */
export async function ticketRow(overrides: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const spot = await spotByNumber("S1");
  return { code: newCode(), plate: newPlate(), car_size: "small", spot_id: spot.id, spot_size: spot.size, ...overrides };
}

/** A client signed in as a seeded attendant (RLS applies), plus that attendant's user id. */
export async function attendantClient(email = testEnv.attendantEmail): Promise<{ db: SupabaseClient; userId: string }> {
  const token = await attendantToken(email);
  const db = createClient(testEnv.supabaseUrl, testEnv.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new Error(`getUser failed: ${error?.message}`);
  return { db, userId: data.user.id };
}

export function anonClient(): SupabaseClient {
  return createClient(testEnv.supabaseUrl, testEnv.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
