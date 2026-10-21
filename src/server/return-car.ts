import type { SupabaseClient } from "@supabase/supabase-js";
import { durationMinutes } from "@/domain/duration";
import { ParkingError } from "@/domain/errors";
import { normalizePlate } from "@/domain/plate";
import { normalizeTicketCode } from "@/domain/ticket-code";
import type { ReturnResult } from "@/domain/types";
import { findTicketByCode, markReturned } from "./tickets-repo";

const alreadyReturned = () => new ParkingError("ALREADY_RETURNED", "This ticket was already returned.");

export async function returnCar(
  db: SupabaseClient,
  input: { code: unknown; plate: unknown },
  userId: string,
): Promise<ReturnResult> {
  const code = normalizeTicketCode(input.code);
  const plate = normalizePlate(input.plate);

  const ticket = await findTicketByCode(db, code);
  if (!ticket) throw new ParkingError("TICKET_NOT_FOUND", "No ticket with this code.");
  if (ticket.returnedAt) throw alreadyReturned();
  // The message must not reveal the real plate.
  if (ticket.plate !== plate) throw new ParkingError("PLATE_MISMATCH", "The plate does not match this ticket.");

  const returned = await markReturned(db, ticket, userId);
  if (!returned?.returnedAt) throw alreadyReturned();
  return { ticket: returned, durationMinutes: durationMinutes(returned.arrivedAt, returned.returnedAt) };
}
