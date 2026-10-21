import type { SupabaseClient } from "@supabase/supabase-js";
import { chooseSpot } from "@/domain/allocation";
import { ParkingError } from "@/domain/errors";
import { normalizePlate } from "@/domain/plate";
import { parseSize } from "@/domain/size";
import { generateTicketCode } from "@/domain/ticket-code";
import type { Ticket } from "@/domain/types";
import { listFreeSpots } from "./spots-repo";
import { insertTicket } from "./tickets-repo";

// Each spot conflict means another car got that spot, so the loop makes progress; the cap is a safety net.
const MAX_ATTEMPTS = 20;
const MAX_BACKOFF_MS = 25;

const backoff = () => new Promise((resolve) => setTimeout(resolve, Math.random() * MAX_BACKOFF_MS));

export async function parkCar(
  db: SupabaseClient,
  input: { plate: unknown; size: unknown },
  userId: string,
): Promise<Ticket> {
  const plate = normalizePlate(input.plate);
  const carSize = parseSize(input.size);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const spot = chooseSpot(await listFreeSpots(db), carSize);
    if (!spot) throw new ParkingError("LOT_FULL", "No spot is free for this car.");

    const result = await insertTicket(db, { code: generateTicketCode(), plate, carSize, spot, userId });
    if ("ticket" in result) return result.ticket;
    if (result.conflict === "plate") {
      throw new ParkingError("ALREADY_PARKED", "A car with this plate is already parked.");
    }
    // Spot or code taken by a concurrent request: back off briefly, read the free spots again, retry.
    await backoff();
  }
  throw new ParkingError("BUSY", "The lot is busy, please try again.");
}
