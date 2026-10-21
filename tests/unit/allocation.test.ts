import { describe, it, expect } from "vitest";
import { chooseSpot, compareSpotNumbers } from "@/domain/allocation";
import type { Size, Spot } from "@/domain/types";

function spot(number: string): Spot {
  const size: Size = number.startsWith("L") ? "large" : "small";
  return { id: `id-${number}`, number, size };
}
const spots = (...numbers: string[]) => numbers.map(spot);

describe("compareSpotNumbers (D6)", () => {
  it("orders S2 before S10", () => {
    expect(compareSpotNumbers("S2", "S10")).toBeLessThan(0);
    expect(compareSpotNumbers("S10", "S2")).toBeGreaterThan(0);
  });
  it("returns 0 for equal numbers", () => expect(compareSpotNumbers("S3", "S3")).toBe(0));
  it("compares the letter prefix first", () => {
    expect(compareSpotNumbers("L1", "S1")).toBeLessThan(0);
    expect(compareSpotNumbers("S1", "L9")).toBeGreaterThan(0);
  });
  it("sorts a seed-like list naturally", () => {
    const sorted = ["S10", "S2", "S1", "L5", "L10", "L2"].sort(compareSpotNumbers);
    expect(sorted).toEqual(["L2", "L5", "L10", "S1", "S2", "S10"]);
  });
});

describe("chooseSpot", () => {
  it("small car takes the lowest small spot (R3)", () => {
    expect(chooseSpot(spots("S5", "S3", "L1"), "small")?.number).toBe("S3");
  });
  it("uses natural order, S2 before S10 (D6)", () => {
    expect(chooseSpot(spots("S10", "S2"), "small")?.number).toBe("S2");
    expect(chooseSpot(spots("L10", "L2"), "large")?.number).toBe("L2");
  });
  it("small car falls back to the lowest large spot when no small is free (R3)", () => {
    expect(chooseSpot(spots("L3", "L1", "L2"), "small")?.number).toBe("L1");
  });
  it("small car prefers a small spot even if a large has a lower number", () => {
    expect(chooseSpot(spots("L1", "S10"), "small")?.number).toBe("S10");
  });
  it("large car takes the lowest large spot (R4)", () => {
    expect(chooseSpot(spots("S1", "L4", "L2"), "large")?.number).toBe("L2");
  });
  it("large car gets null when only small spots are free (R4)", () => {
    expect(chooseSpot(spots("S1", "S2"), "large")).toBeNull();
  });
  it("returns null for an empty list", () => {
    expect(chooseSpot([], "small")).toBeNull();
    expect(chooseSpot([], "large")).toBeNull();
  });
  it("returns the spot object itself", () => {
    const free = spots("S1");
    expect(chooseSpot(free, "small")).toBe(free[0]);
  });
  it("does not mutate its input", () => {
    const free = spots("S10", "L2", "S2", "L1");
    const before = free.map((s) => s.number);
    chooseSpot(free, "small");
    chooseSpot(free, "large");
    expect(free.map((s) => s.number)).toEqual(before);
  });
});
