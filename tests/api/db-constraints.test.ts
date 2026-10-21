// Database constraints, checked as service_role (bypasses RLS, never constraints).
import { beforeEach, describe, expect, it } from "vitest";
import { adminDb, resetLot } from "../support/db";
import { newPlate, spotByNumber, ticketRow } from "./db-helpers";

async function insert(overrides: Record<string, unknown> = {}) {
  return adminDb().from("tickets").insert(await ticketRow(overrides));
}

describe("tickets constraints", () => {
  beforeEach(resetLot);

  it("accepts a valid ticket", async () => {
    expect((await insert()).error).toBeNull();
  });

  it("rejects a large car in a small spot", async () => {
    const { error } = await insert({ car_size: "large" });
    expect(error?.code).toBe("23514");
  });

  it("accepts a small car in a large spot and a large car in a large spot", async () => {
    const l1 = await spotByNumber("L1");
    expect((await insert({ spot_id: l1.id, spot_size: "large" })).error).toBeNull();
    const l2 = await spotByNumber("L2");
    expect((await insert({ car_size: "large", spot_id: l2.id, spot_size: "large" })).error).toBeNull();
  });

  it("rejects a spot_size that does not match the spot", async () => {
    // L1 is large; claiming small for it breaks the (spot_id, spot_size) foreign key.
    const l1 = await spotByNumber("L1");
    const { error } = await insert({ spot_id: l1.id, spot_size: "small" });
    expect(error?.code).toBe("23503");
  });

  it("rejects two active tickets on one spot", async () => {
    expect((await insert()).error).toBeNull();
    const { error } = await insert();
    expect(error?.code).toBe("23505");
    expect(error?.message).toContain("tickets_one_car_per_spot");
  });

  it("rejects two active tickets for one plate", async () => {
    const plate = newPlate();
    expect((await insert({ plate })).error).toBeNull();
    const s2 = await spotByNumber("S2");
    const { error } = await insert({ plate, spot_id: s2.id, spot_size: s2.size });
    expect(error?.code).toBe("23505");
    expect(error?.message).toContain("tickets_one_active_per_plate");
  });

  it("allows the spot and the plate again after a return", async () => {
    const plate = newPlate();
    expect((await insert({ plate })).error).toBeNull();
    const returned = await adminDb()
      .from("tickets")
      .update({ returned_at: new Date().toISOString() })
      .eq("plate", plate);
    expect(returned.error).toBeNull();
    expect((await insert({ plate })).error).toBeNull();
  });

  it("rejects a duplicate ticket code", async () => {
    const first = await ticketRow();
    expect((await adminDb().from("tickets").insert(first)).error).toBeNull();
    const s2 = await spotByNumber("S2");
    const { error } = await insert({ code: first.code, spot_id: s2.id, spot_size: s2.size });
    expect(error?.message).toContain("tickets_code_key");
  });

  it.each(["abcd1234", "ABCD123", "ABCD12345", "ILOU1234", "ABCD-234"])("rejects bad code %s", async (code) => {
    expect((await insert({ code })).error?.code).toBe("23514");
  });

  it.each(["a", "ab12", "AB 12", "AB-12", "ABCDEFGHIJK", ""])("rejects bad plate '%s'", async (plate) => {
    expect((await insert({ plate })).error?.code).toBe("23514");
  });

  it("rejects returned_at before arrived_at", async () => {
    const { error } = await insert({
      arrived_at: "2026-01-01T10:00:00Z",
      returned_at: "2026-01-01T09:59:59Z",
    });
    expect(error?.code).toBe("23514");
  });
});
