// Business errors with stable codes. API routes map each code to one HTTP status.

export type ParkingErrorCode =
  | "INVALID_INPUT"
  | "UNAUTHENTICATED"
  | "LOT_FULL"
  | "ALREADY_PARKED"
  | "TICKET_NOT_FOUND"
  | "ALREADY_RETURNED"
  | "PLATE_MISMATCH";

export const HTTP_STATUS: Record<ParkingErrorCode, number> = {
  INVALID_INPUT: 400,
  UNAUTHENTICATED: 401,
  LOT_FULL: 409,
  ALREADY_PARKED: 409,
  TICKET_NOT_FOUND: 404,
  ALREADY_RETURNED: 409,
  PLATE_MISMATCH: 422,
};

export class ParkingError extends Error {
  constructor(
    public readonly code: ParkingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ParkingError";
  }
}
