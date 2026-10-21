// Races: the database constraints, not luck, must keep one car per spot, one return per ticket, one ticket per plate.
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { adminDb, attendantToken, resetLot } from "../support/db";
import { expectError, fillSpots, park, parkOk, returnCar, type ApiResponse } from "./client";

let token: string;
beforeAll(async () => {
  token = await attendantToken();
});
beforeEach(resetLot);

interface ActiveRow {
  spot_id: string;
  plate: string;
  code: string;
}

async function activeRows(): Promise<ActiveRow[]> {
  const { data, error } = await adminDb().from("tickets").select("spot_id, plate, code").is("returned_at", null);
  if (error) throw new Error(error.message);
  return data as ActiveRow[];
}

const statuses = (rs: ApiResponse[]) => rs.map((r) => r.status).sort();

describe("parking races", () => {
  it("14 spots full, 10 different small cars at once: exactly one 201, nine LOT_FULL, no double-booked spot", async () => {
    await fillSpots(token, 14); // S1..S10, L1..L4; only L5 is free
    const plates = Array.from({ length: 10 }, (_, i) => `RACE${String(i).padStart(2, "0")}`);
    const results = await Promise.all(plates.map((p) => park(token, p, "small")));

    // Catches: read-then-insert without a constraint (several 201s into L5).
    const winners = results.filter((r) => r.status === 201);
    expect(winners, JSON.stringify(results.map((r) => r.text))).toHaveLength(1);
    expect(winners[0].body.ticket.spotNumber).toBe("L5");
    const losers = results.filter((r) => r.status !== 201);
    expect(losers).toHaveLength(9);
    for (const r of losers) expectError(r, 409, "LOT_FULL");

    const rows = await activeRows();
    expect(rows).toHaveLength(15);
    expect(new Set(rows.map((r) => r.spot_id)).size).toBe(15);
    expect(new Set(rows.map((r) => r.plate)).size).toBe(15);
  });

  it("stress: 30 small cars at once on an empty lot -> 15 x 201, 15 x LOT_FULL, zero 5xx, no shared spot", async () => {
    const plates = Array.from({ length: 30 }, (_, i) => `STRESS${String(i).padStart(2, "0")}`);
    const results = await Promise.all(plates.map((p) => park(token, p, "small")));
    const summary = JSON.stringify(results.filter((r) => r.status !== 201 && r.status !== 409).map((r) => r.text));

    // Catches: lost-update retries that give up with 500/503 under contention.
    expect(results.filter((r) => r.status >= 500), summary).toHaveLength(0);
    expect(results.filter((r) => r.status === 201), summary).toHaveLength(15);
    const losers = results.filter((r) => r.status !== 201);
    expect(losers).toHaveLength(15);
    for (const r of losers) expectError(r, 409, "LOT_FULL");

    const numbers = results.filter((r) => r.status === 201).map((r) => r.body.ticket.spotNumber);
    expect(new Set(numbers).size).toBe(15);
    const rows = await activeRows();
    expect(rows).toHaveLength(15);
    expect(new Set(rows.map((r) => r.spot_id)).size).toBe(15);
  });

  it("three different cars at once on an empty lot all get distinct spots", async () => {
    const results = await Promise.all(["PAR1", "PAR2", "PAR3"].map((p) => park(token, p, "small")));
    expect(statuses(results), JSON.stringify(results.map((r) => r.text))).toEqual([201, 201, 201]);
    const numbers = results.map((r) => r.body.ticket.spotNumber).sort();
    // Lowest free spots, whatever the arrival order: no gaps and no sharing.
    expect(numbers).toEqual(["S1", "S2", "S3"]);
    const rows = await activeRows();
    expect(new Set(rows.map((r) => r.spot_id)).size).toBe(3);
  });

  it("the same plate parked 5 times at once: exactly one 201, the rest ALREADY_PARKED", async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => park(token, "SAMEPLATE", "small")));
    // Catches: a check-then-insert on the plate that lets two tickets through.
    expect(results.filter((r) => r.status === 201), JSON.stringify(results.map((r) => r.text))).toHaveLength(1);
    const losers = results.filter((r) => r.status !== 201);
    expect(losers).toHaveLength(4);
    for (const r of losers) expectError(r, 409, "ALREADY_PARKED");

    const rows = await activeRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].plate).toBe("SAMEPLATE");
  });

  it("the same plate in different spellings at once still yields one ticket", async () => {
    const spellings = ["race-77", "RACE77", " race 77 ", "Race-77", "RACE 77"];
    const results = await Promise.all(spellings.map((p) => park(token, p, "small")));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    for (const r of results.filter((x) => x.status !== 201)) expectError(r, 409, "ALREADY_PARKED");
    expect(await activeRows()).toHaveLength(1);
  });
});

describe("return races", () => {
  it("the same ticket returned 5 times at once: exactly one 200, the rest ALREADY_RETURNED", async () => {
    const t = await parkOk(token, "ONCEONLY", "small");
    const results = await Promise.all(Array.from({ length: 5 }, () => returnCar(token, t.code, "ONCEONLY")));

    // Catches: a return that does not guard on "returned_at is null" (several 200s).
    expect(results.filter((r) => r.status === 200), JSON.stringify(results.map((r) => r.text))).toHaveLength(1);
    const losers = results.filter((r) => r.status !== 200);
    expect(losers).toHaveLength(4);
    for (const r of losers) expectError(r, 409, "ALREADY_RETURNED");
    expect(await activeRows()).toHaveLength(0);

    // The freed spot is usable exactly once afterwards.
    expect((await parkOk(token, "AFTERRACE", "small")).spotNumber).toBe("S1");
  });

  it("a return racing a park of the same plate never leaves two active tickets for it", async () => {
    const t = await parkOk(token, "SWAPPER", "small");
    const [ret, again] = await Promise.all([returnCar(token, t.code, "SWAPPER"), park(token, "SWAPPER", "small")]);
    expect(ret.status).toBe(200);
    // Either order is legal: the park saw the old ticket (ALREADY_PARKED) or the freed plate (201).
    if (again.status !== 201) expectError(again, 409, "ALREADY_PARKED");
    const rows = (await activeRows()).filter((r) => r.plate === "SWAPPER");
    expect(rows).toHaveLength(again.status === 201 ? 1 : 0);
  });
});
