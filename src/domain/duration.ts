import { ParkingError } from "./errors";

function toMillis(iso: string, label: string): number {
  const ms = typeof iso === "string" ? Date.parse(iso) : NaN;
  if (Number.isNaN(ms)) {
    throw new ParkingError("INVALID_INPUT", `${label} is not a valid date.`);
  }
  return ms;
}

export function durationMinutes(arrivedAtIso: string, returnedAtIso: string): number {
  const arrived = toMillis(arrivedAtIso, "Arrival time");
  const returned = toMillis(returnedAtIso, "Return time");
  if (returned < arrived) {
    throw new ParkingError("INVALID_INPUT", "Return time is before arrival time.");
  }
  return Math.floor((returned - arrived) / 60_000);
}
