// R3, R4, D1, D2, D6, R6: parking allocation, plate normalization, validation, ticket shape.
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { attendantToken, resetLot } from "../support/db";
import {
  CROCKFORD_CODE,
  activeTickets,
  api,
  expectError,
  fillSpots,
  park,
  parkOk,
  returnCar,
  spots,
  userIdOf,
} from "./client";

let token: string;
beforeAll(async () => {
  token = await attendantToken();
});
beforeEach(resetLot);

describe("allocation", () => {
  it("R3: small cars take S1, S2, S3 in order", async () => {
    const numbers = [];
    for (const plate of ["AA1", "AA2", "AA3"]) numbers.push((await parkOk(token, plate, "small")).spotNumber);
    // Catches: random free spot, highest spot, or always S1 (the second would collide).
    expect(numbers).toEqual(["S1", "S2", "S3"]);
  });

  it("R3: a freed low spot is reused before higher free ones", async () => {
    const t = await fillSpots(token, 3);
    expect((await returnCar(token, t[1].code, t[1].plate)).status).toBe(200);
    // Catches: "next after the last taken" (S4) instead of lowest free (S2).
    expect((await parkOk(token, "NEWCAR", "small")).spotNumber).toBe("S2");
  });

  it("D6: lowest-numbered is natural order, S2 before S10", async () => {
    const t = await fillSpots(token, 10);
    await returnCar(token, t[9].code, t[9].plate); // frees S10
    await returnCar(token, t[1].code, t[1].plate); // frees S2
    // Catches: string sort ("S10" < "S2") picking S10.
    expect((await parkOk(token, "NATURAL", "small")).spotNumber).toBe("S2");
  });

  it("R3: a small car falls back to L1 only when all ten small spots are taken", async () => {
    const t = await fillSpots(token, 10);
    expect(t.map((x) => x.spotNumber)).toEqual(["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10"]);
    const eleventh = await parkOk(token, "ELEVEN", "small");
    expect(eleventh.spotNumber).toBe("L1");
    expect(eleventh.carSize).toBe("small");
    expect(eleventh.spotSize).toBe("large");
  });

  it("R3: a small car never goes to a large spot while a small spot is free", async () => {
    const t = await fillSpots(token, 10);
    await returnCar(token, t[4].code, t[4].plate); // frees S5 only
    // Catches: putting a small car into L1 while S5 is free.
    const ticket = await parkOk(token, "WANTS5", "small");
    expect(ticket.spotNumber).toBe("S5");
    expect(ticket.spotSize).toBe("small");
  });

  it("R3: fallback picks the lowest free large spot", async () => {
    const t = await fillSpots(token, 12); // S1..S10, L1, L2
    await returnCar(token, t[10].code, t[10].plate); // frees L1
    expect((await parkOk(token, "BACKFILL", "small")).spotNumber).toBe("L1");
    expect((await parkOk(token, "NEXTONE", "small")).spotNumber).toBe("L3");
  });

  it("R4: large cars take L1..L5 in order", async () => {
    const numbers = [];
    for (let i = 1; i <= 5; i++) numbers.push((await parkOk(token, `BIG${i}`, "large")).spotNumber);
    expect(numbers).toEqual(["L1", "L2", "L3", "L4", "L5"]);
  });

  it("R4: a large car skips a large spot already taken by a small car", async () => {
    await fillSpots(token, 11); // L1 now holds a small car
    expect((await parkOk(token, "BIGONE", "large")).spotNumber).toBe("L2");
  });

  it("R4: large car is refused with LOT_FULL while small spots are free, and nothing is parked", async () => {
    for (let i = 1; i <= 5; i++) await parkOk(token, `BIG${i}`, "large");
    // Catches: a large car squeezed into S1.
    expectError(await park(token, "BIG6", "large"), 409, "LOT_FULL");
    const list = (await spots(token)).body.spots;
    expect(list.filter((s) => s.size === "small").every((s) => s.ticket === null)).toBe(true);
    expect(list.filter((s) => s.ticket !== null)).toHaveLength(5);
  });

  it("fully full lot: small and large are both LOT_FULL, and the plate is not recorded", async () => {
    await fillSpots(token, 15);
    expectError(await park(token, "EXTRA1", "small"), 409, "LOT_FULL");
    expectError(await park(token, "EXTRA2", "large"), 409, "LOT_FULL");
    const active = (await activeTickets(token)).body.tickets;
    expect(active).toHaveLength(15);
    expect(active.map((t) => t.plate)).not.toContain("EXTRA1");
    expect(active.map((t) => t.plate)).not.toContain("EXTRA2");
  });
});

describe("plates (D1, D2)", () => {
  it("normalizes ' abc-123 ' to ABC123, then 'ABC 123' is ALREADY_PARKED", async () => {
    const first = await park(token, " abc-123 ", "small");
    expect(first.status).toBe(201);
    expect(first.body.ticket.plate).toBe("ABC123");
    expectError(await park(token, "ABC 123", "small"), 409, "ALREADY_PARKED");
    expectError(await park(token, "abc123", "large"), 409, "ALREADY_PARKED");
    // The refused attempts must not take a spot.
    const taken = (await spots(token)).body.spots.filter((s) => s.ticket !== null);
    expect(taken.map((s) => s.number)).toEqual(["S1"]);
  });

  it("accepts the 2 and 10 character boundaries", async () => {
    expect((await park(token, "ab", "small")).body.ticket.plate).toBe("AB");
    expect((await park(token, "abcde-fghij", "small")).body.ticket.plate).toBe("ABCDEFGHIJ");
  });

  it("a plate can park again once its car has been returned", async () => {
    const t = await parkOk(token, "BOUNCE", "small");
    await returnCar(token, t.code, "BOUNCE");
    const again = await park(token, "BOUNCE", "small");
    expect(again.status).toBe(201);
    expect(again.body.ticket.code).not.toBe(t.code);
  });
});

describe("validation", () => {
  const badPlates: [string, unknown][] = [
    ["empty", ""],
    ["only separators", " - "],
    ["one character", "A"],
    ["eleven characters", "ABCDEFGHIJK"],
    ["symbols", "AB$12"],
    ["number", 12345],
    ["null", null],
    ["missing", undefined],
  ];
  it.each(badPlates)("invalid plate (%s) -> 400 INVALID_INPUT and no spot used", async (_name, plate) => {
    expectError(await park(token, plate, "small"), 400, "INVALID_INPUT");
    expect((await spots(token)).body.spots.every((s) => s.ticket === null)).toBe(true);
  });

  it.each([["medium"], [""], [null], [undefined], [1]])("invalid size %j -> 400 INVALID_INPUT", async (size) => {
    expectError(await park(token, "GOODPLATE", size), 400, "INVALID_INPUT");
    expect((await spots(token)).body.spots.every((s) => s.ticket === null)).toBe(true);
  });

  it("malformed JSON -> 400 INVALID_INPUT", async () => {
    const res = await api("/api/tickets", { method: "POST", rawBody: '{"plate": "ABC123", ', token });
    expectError(res, 400, "INVALID_INPUT");
  });

  it("empty body -> 400 INVALID_INPUT", async () => {
    expectError(await api("/api/tickets", { method: "POST", rawBody: "", token }), 400, "INVALID_INPUT");
  });
});

describe("ticket shape (R6)", () => {
  it("has an 8 char Crockford code, plate, spot, ISO arrival time and issuer", async () => {
    const before = Date.now();
    const res = await park(token, "shape1", "small");
    expect(res.status).toBe(201);
    expect(Object.keys(res.body)).toEqual(["ticket"]);
    const t = res.body.ticket;
    expect(t.code).toMatch(CROCKFORD_CODE);
    expect(t.plate).toBe("SHAPE1");
    expect(t.spotNumber).toBe("S1");
    expect(t.spotSize).toBe("small");
    expect(t.carSize).toBe("small");
    expect(t.arrivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(Math.abs(new Date(t.arrivedAt).getTime() - before)).toBeLessThan(60_000);
    expect(t.returnedAt).toBeNull();
    expect(t.returnedBy).toBeNull();
    expect(t.issuedBy).toBe(userIdOf(token));
  });

  it("every ticket gets a different code", async () => {
    const codes = new Set<string>();
    for (const t of await fillSpots(token, 6)) codes.add(t.code);
    expect(codes.size).toBe(6);
  });
});
