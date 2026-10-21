import { describe, it, expect } from "vitest";
import { durationMinutes } from "@/domain/duration";
import { ParkingError } from "@/domain/errors";

const T0 = "2026-01-01T10:00:00.000Z";

function invalid(arrived: string, returned: string) {
  try {
    durationMinutes(arrived, returned);
  } catch (e) {
    expect(e).toBeInstanceOf(ParkingError);
    expect((e as ParkingError).code).toBe("INVALID_INPUT");
    return;
  }
  throw new Error(`expected INVALID_INPUT for ${arrived} / ${returned}`);
}

describe("durationMinutes (D5)", () => {
  it("is 0 for identical times", () => expect(durationMinutes(T0, T0)).toBe(0));
  it("floors 59 seconds to 0 minutes", () => {
    expect(durationMinutes(T0, "2026-01-01T10:00:59.000Z")).toBe(0);
  });
  it("is 1 at exactly 60 seconds", () => {
    expect(durationMinutes(T0, "2026-01-01T10:01:00.000Z")).toBe(1);
  });
  it("floors 119 seconds to 1 minute", () => {
    expect(durationMinutes(T0, "2026-01-01T10:01:59.999Z")).toBe(1);
  });
  it("handles 61 minutes", () => {
    expect(durationMinutes(T0, "2026-01-01T11:01:00.000Z")).toBe(61);
  });
  it("handles spans over a day", () => {
    expect(durationMinutes(T0, "2026-01-03T10:30:00.000Z")).toBe(2 * 24 * 60 + 30);
  });
  it("compares instants, not offsets", () => {
    expect(durationMinutes("2026-01-01T10:00:00+00:00", "2026-01-01T12:30:00+02:00")).toBe(30);
  });

  it("rejects unparseable dates", () => {
    invalid("not a date", T0);
    invalid(T0, "nope");
    invalid("", T0);
  });
  it("rejects returned before arrived", () => {
    invalid(T0, "2026-01-01T09:59:59.000Z");
  });
});
