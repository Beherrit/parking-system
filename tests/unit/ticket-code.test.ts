import { describe, it, expect } from "vitest";
import { generateTicketCode, normalizeTicketCode } from "@/domain/ticket-code";
import { ParkingError } from "@/domain/errors";

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const SHAPE = /^[0-9A-HJKMNP-TV-Z]{8}$/;

function invalid(input: unknown) {
  try {
    normalizeTicketCode(input);
  } catch (e) {
    expect(e).toBeInstanceOf(ParkingError);
    expect((e as ParkingError).code).toBe("INVALID_INPUT");
    return;
  }
  throw new Error(`expected INVALID_INPUT for ${JSON.stringify(input)}`);
}

describe("generateTicketCode (D3)", () => {
  it("has 8 characters from the Crockford alphabet", () => {
    for (let i = 0; i < 200; i++) expect(generateTicketCode()).toMatch(SHAPE);
  });

  it("never uses I, L, O or U", () => {
    const all = Array.from({ length: 200 }, () => generateTicketCode()).join("");
    expect(all).not.toMatch(/[ILOU]/);
  });

  it("is deterministic with injected bytes", () => {
    const bytes = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(generateTicketCode(() => bytes)).toBe("01234567");
  });

  it("asks for 8 bytes", () => {
    let asked = 0;
    generateTicketCode((n) => {
      asked = n;
      return new Uint8Array(n);
    });
    expect(asked).toBe(8);
  });

  it("masks with 31, so 32 wraps to the first symbol and 255 to the last", () => {
    const bytes = Uint8Array.from([31, 32, 255, 0, 64, 96, 128, 160]);
    expect(generateTicketCode(() => bytes)).toBe("Z0Z00000");
  });

  it("reaches every alphabet symbol across byte values 0..31", () => {
    const code = (offset: number) =>
      generateTicketCode(() => Uint8Array.from({ length: 8 }, (_, i) => offset + i));
    expect([0, 8, 16, 24].map(code).join("")).toBe(ALPHABET);
  });

  it("produces different codes from the default source", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateTicketCode()));
    expect(codes.size).toBeGreaterThan(45);
  });
});

describe("normalizeTicketCode (D3)", () => {
  it("upper cases", () => expect(normalizeTicketCode("abcd1234")).toBe("ABCD1234"));
  it("strips spaces and dashes", () => expect(normalizeTicketCode(" abcd-1234 ")).toBe("ABCD1234"));
  it("leaves a clean code unchanged", () => expect(normalizeTicketCode("7K3M9QXZ")).toBe("7K3M9QXZ"));
  it("round-trips a generated code", () => {
    const code = generateTicketCode();
    expect(normalizeTicketCode(code.toLowerCase())).toBe(code);
  });

  it("rejects wrong length", () => {
    invalid("ABCD123");
    invalid("ABCD12345");
    invalid("");
  });
  it("rejects characters outside the alphabet", () => {
    invalid("ABCDEFGI");
    invalid("ABCDEFGL");
    invalid("ABCDEFGO");
    invalid("ABCDEFGU");
    invalid("ABCD123!");
  });
  it("rejects non-strings", () => {
    invalid(undefined);
    invalid(null);
    invalid(12345678);
    invalid({});
    invalid(["ABCD1234"]);
  });
});
