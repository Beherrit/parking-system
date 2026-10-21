// Friendly wording for every error code in the contract, plus two client-side cases.
import type { ParkingErrorCode } from "@/domain/errors";

export type UiErrorCode = ParkingErrorCode | "NETWORK" | "UNKNOWN";

const MESSAGES: Record<UiErrorCode, string> = {
  INVALID_INPUT:
    "Some of what you entered is not valid. Plates are 2 to 10 letters or digits, and ticket codes are 8 characters.",
  UNAUTHENTICATED: "Your session has ended. Sign in again.",
  BUSY: "The lot is busy right now. Wait a moment and try again.",
  INTERNAL: "The server had a problem. Try again, and tell a supervisor if it keeps happening.",
  LOT_FULL: "The lot is full for this car size. No spot is free.",
  ALREADY_PARKED: "That plate already has an active ticket. A car cannot park twice.",
  TICKET_NOT_FOUND: "No ticket has that code. Check the code and try again.",
  ALREADY_RETURNED: "This ticket was already used to return the car.",
  PLATE_MISMATCH: "That plate does not match the ticket. The car stays parked.",
  NETWORK: "The server could not be reached. Check the connection and try again.",
  UNKNOWN: "Something went wrong. Try again.",
};

export function friendlyMessage(code: string | undefined): string {
  return code !== undefined && code in MESSAGES ? MESSAGES[code as UiErrorCode] : MESSAGES.UNKNOWN;
}
