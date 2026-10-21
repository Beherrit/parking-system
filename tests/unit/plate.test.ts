import { describe, it, expect } from "vitest";
import { normalizePlate } from "@/domain/plate";
import { ParkingError } from "@/domain/errors";

function invalid(input: unknown) {
  try {
    normalizePlate(input);
  } catch (e) {
    expect(e).toBeInstanceOf(ParkingError);
    expect((e as ParkingError).code).toBe("INVALID_INPUT");
    expect((e as ParkingError).message).not.toBe("");
    return;
  }
  throw new Error(`expected INVALID_INPUT for ${JSON.stringify(input)}`);
}

describe("normalizePlate (D1)", () => {
  it("upper cases", () => expect(normalizePlate("abc123")).toBe("ABC123"));
  it("strips spaces and dashes", () => expect(normalizePlate(" abc-123 ")).toBe("ABC123"));
  it("strips inner whitespace of any kind", () => expect(normalizePlate("ab \t c-1 2")).toBe("ABC12"));
  it("accepts the minimum length of 2", () => expect(normalizePlate("a-1")).toBe("A1"));
  it("accepts the maximum length of 10", () => expect(normalizePlate("abcde-12345")).toBe("ABCDE12345"));
  it("treats differently formatted plates as equal", () => {
    expect(normalizePlate("ab-123")).toBe(normalizePlate("AB 123"));
  });

  it("rejects too short", () => {
    invalid("a");
    invalid(" - ");
  });
  it("rejects empty", () => invalid(""));
  it("rejects too long", () => invalid("ABCDE-123456"));
  it("rejects symbols", () => {
    invalid("AB#123");
    invalid("AB_123");
    invalid("AB.123");
  });
  it("rejects non-ASCII letters", () => invalid("ÄB123"));
  it("rejects non-strings", () => {
    invalid(undefined);
    invalid(null);
    invalid(123456);
    invalid({});
    invalid(["ABC123"]);
    invalid(true);
  });
});
