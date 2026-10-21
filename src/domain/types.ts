// Shared domain types. Every layer (domain, server, API, UI, tests) imports from here.

export type Size = "small" | "large";

export const SIZES: readonly Size[] = ["small", "large"];

export interface Spot {
  id: string;
  number: string; // "S1".."S10", "L1".."L5"
  size: Size;
}

export interface Ticket {
  id: string;
  code: string; // 8 chars, Crockford base32
  plate: string; // normalized: upper case, letters and digits only
  carSize: Size;
  spotId: string;
  spotNumber: string;
  spotSize: Size;
  arrivedAt: string; // ISO 8601 UTC
  returnedAt: string | null;
  issuedBy: string | null;
  returnedBy: string | null;
}

export interface SpotStatus extends Spot {
  ticket: Pick<Ticket, "code" | "plate" | "carSize" | "arrivedAt"> | null;
}

export interface ReturnResult {
  ticket: Ticket;
  durationMinutes: number;
}
