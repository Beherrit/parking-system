import type { SupabaseClient } from "@supabase/supabase-js";
import { compareSpotNumbers } from "@/domain/allocation";
import type { Size, Spot } from "@/domain/types";
import { listActiveSpotIds } from "./tickets-repo";

interface SpotRow {
  id: string;
  number: string;
  size: Size;
}

/** Every spot in natural order (S2 before S10). */
export async function listAllSpots(db: SupabaseClient): Promise<Spot[]> {
  const { data, error } = await db.from("spots").select("id, number, size");
  if (error) throw new Error(`spots query failed: ${error.message}`);
  return (data as SpotRow[])
    .map((row) => ({ id: row.id, number: row.number, size: row.size }))
    .sort((a, b) => compareSpotNumbers(a.number, b.number));
}

/** Spots with no active ticket, in natural order. */
export async function listFreeSpots(db: SupabaseClient): Promise<Spot[]> {
  const [spots, taken] = await Promise.all([listAllSpots(db), listActiveSpotIds(db)]);
  const takenIds = new Set(taken);
  return spots.filter((spot) => !takenIds.has(spot.id));
}
