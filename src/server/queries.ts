import type { SupabaseClient } from "@supabase/supabase-js";
import { ParkingError } from "@/domain/errors";
import { normalizeTicketCode } from "@/domain/ticket-code";
import type { Spot, SpotStatus, Ticket } from "@/domain/types";
import { listAllSpots } from "./spots-repo";
import { findTicketByCode, listActiveTickets as fetchActiveTickets } from "./tickets-repo";

export async function getTicket(db: SupabaseClient, code: unknown): Promise<Ticket> {
  const ticket = await findTicketByCode(db, normalizeTicketCode(code));
  if (!ticket) throw new ParkingError("TICKET_NOT_FOUND", "No ticket with this code.");
  return ticket;
}

export function listActiveTickets(db: SupabaseClient): Promise<Ticket[]> {
  return fetchActiveTickets(db);
}

/** Small spots then large, each in natural order, with the car parked in it, if any. */
export async function listSpots(db: SupabaseClient): Promise<SpotStatus[]> {
  const [spots, active] = await Promise.all([listAllSpots(db), fetchActiveTickets(db)]);
  const bySpot = new Map(active.map((t) => [t.spotId, t]));
  const smallFirst = (a: Spot, b: Spot) => Number(a.size === "large") - Number(b.size === "large");
  return [...spots].sort(smallFirst).map((spot) => {
    const t = bySpot.get(spot.id);
    const ticket = t ? { code: t.code, plate: t.plate, carSize: t.carSize, arrivedAt: t.arrivedAt } : null;
    return { ...spot, ticket };
  });
}
