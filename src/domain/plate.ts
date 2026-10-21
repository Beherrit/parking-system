import { ParkingError } from "./errors";

const VALID_PLATE = /^[A-Z0-9]{2,10}$/;

export function normalizePlate(input: unknown): string {
  if (typeof input !== "string") {
    throw new ParkingError("INVALID_INPUT", "Plate must be text.");
  }
  const plate = input.toUpperCase().replace(/[\s-]/g, "");
  if (!VALID_PLATE.test(plate)) {
    throw new ParkingError(
      "INVALID_INPUT",
      "Plate must be 2 to 10 letters or digits (spaces and dashes are ignored).",
    );
  }
  return plate;
}
