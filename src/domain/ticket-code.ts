import { ParkingError } from "./errors";

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32, 32 symbols
const CODE_LENGTH = 8;
const VALID_CODE = /^[0-9A-HJKMNP-TV-Z]{8}$/;

function defaultRandomBytes(n: number): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(n));
}

export function generateTicketCode(
  randomBytes: (n: number) => Uint8Array = defaultRandomBytes,
): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] & 31]; // 32 divides 256, so no modulo bias
  }
  return code;
}

export function normalizeTicketCode(input: unknown): string {
  if (typeof input !== "string") {
    throw new ParkingError("INVALID_INPUT", "Ticket code must be text.");
  }
  const code = input.toUpperCase().replace(/[\s-]/g, "");
  if (!VALID_CODE.test(code)) {
    throw new ParkingError("INVALID_INPUT", "Ticket code must be 8 characters, letters and digits only.");
  }
  return code;
}
