import type { SupabaseClient } from "@supabase/supabase-js";
import type { Size, Spot, Ticket } from "@/domain/types";

interface TicketRow {
  id: string;
  code: string;
  plate: string;
  car_size: Size;
  spot_id: string;
  spot_size: Size;
  arrived_at: string;
  returned_at: string | null;
  issued_by: string | null;
  returned_by: string | null;
  spots: { number: string } | { number: string }[] | null;
}

// The composite foreign key (spot_id, spot_size) lets PostgREST embed the spot as one object.
const TICKET_COLUMNS =
  "id, code, plate, car_size, spot_id, spot_size, arrived_at, returned_at, issued_by, returned_by, spots(number)";

const iso = (value: string): string => new Date(value).toISOString();

export function mapTicket(row: TicketRow): Ticket {
  const spot = Array.isArray(row.spots) ? row.spots[0] : row.spots;
  return {
    id: row.id,
    code: row.code,
    plate: row.plate,
    carSize: row.car_size,
    spotId: row.spot_id,
    spotNumber: spot?.number ?? "",
    spotSize: row.spot_size,
    arrivedAt: iso(row.arrived_at),
    returnedAt: row.returned_at ? iso(row.returned_at) : null,
    issuedBy: row.issued_by,
    returnedBy: row.returned_by,
  };
}

function fail(what: string, message: string): never {
  throw new Error(`${what} failed: ${message}`);
}

export async function findTicketByCode(db: SupabaseClient, code: string): Promise<Ticket | null> {
  const { data, error } = await db.from("tickets").select(TICKET_COLUMNS).eq("code", code).maybeSingle();
  if (error) fail("ticket lookup", error.message);
  return data ? mapTicket(data as unknown as TicketRow) : null;
}

/** Newest first. */
export async function listActiveTickets(db: SupabaseClient): Promise<Ticket[]> {
  const { data, error } = await db
    .from("tickets")
    .select(TICKET_COLUMNS)
    .is("returned_at", null)
    .order("arrived_at", { ascending: false });
  if (error) fail("active tickets query", error.message);
  return (data as unknown as TicketRow[]).map(mapTicket);
}

export async function listActiveSpotIds(db: SupabaseClient): Promise<string[]> {
  const { data, error } = await db.from("tickets").select("spot_id").is("returned_at", null);
  if (error) fail("active spots query", error.message);
  return (data as { spot_id: string }[]).map((row) => row.spot_id);
}

type Conflict = "spot" | "code" | "plate";
export type InsertResult = { ticket: Ticket } | { conflict: Conflict };

// Constraint names are part of the contract; the 23505 message names the one that was violated.
const CONFLICTS: Record<string, Conflict> = {
  tickets_one_car_per_spot: "spot",
  tickets_code_key: "code",
  tickets_one_active_per_plate: "plate",
};

export async function insertTicket(
  db: SupabaseClient,
  t: { code: string; plate: string; carSize: Size; spot: Spot; userId: string },
): Promise<InsertResult> {
  const { data, error } = await db
    .from("tickets")
    .insert({
      code: t.code,
      plate: t.plate,
      car_size: t.carSize,
      spot_id: t.spot.id,
      spot_size: t.spot.size,
      issued_by: t.userId,
    })
    .select(TICKET_COLUMNS)
    .single();
  if (!error) return { ticket: mapTicket(data as unknown as TicketRow) };
  const name = error.code === "23505" ? Object.keys(CONFLICTS).find((n) => error.message.includes(n)) : undefined;
  if (name) return { conflict: CONFLICTS[name] };
  return fail("ticket insert", error.message);
}

/** Null when no active row matched, i.e. someone else returned it first. */
export async function markReturned(db: SupabaseClient, ticket: Ticket, userId: string): Promise<Ticket | null> {
  // Never earlier than arrival, so a small clock difference cannot break the DB check.
  const returnedAt = new Date(Math.max(Date.now(), Date.parse(ticket.arrivedAt))).toISOString();
  const { data, error } = await db
    .from("tickets")
    .update({ returned_at: returnedAt, returned_by: userId })
    .eq("id", ticket.id)
    .is("returned_at", null)
    .select(TICKET_COLUMNS);
  if (error) fail("ticket return", error.message);
  const rows = data as unknown as TicketRow[];
  return rows.length > 0 ? mapTicket(rows[0]) : null;
}
