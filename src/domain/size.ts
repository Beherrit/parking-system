import { ParkingError } from "./errors";
import { SIZES, type Size } from "./types";

export function parseSize(input: unknown): Size {
  const size = SIZES.find((s) => s === input);
  if (!size) {
    throw new ParkingError("INVALID_INPUT", 'Size must be "small" or "large".');
  }
  return size;
}
