// R5, R7, D4, D5: returning a car.
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { adminDb, attendantToken, resetLot } from "../support/db";
import { testEnv } from "../support/env";
import { activeTickets, api, expectError, fillSpots, getTicket, parkOk, returnCar, spots, userIdOf } from "./client";

let token: string;
let token2: string;
beforeAll(async () => {
  token = await attendantToken();
  token2 = await attendantToken(testEnv.attendantEmail2);
});
beforeEach(resetLot);

describe("successful return", () => {
  it("correct code and plate -> 200 with the returned ticket and a whole-number duration", async () => {
    const t = await parkOk(token, "RETURN1", "small");
    const res = await returnCar(token, t.code, "RETURN1");
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(["durationMinutes", "ticket"]);
    expect(Number.isInteger(res.body.durationMinutes)).toBe(true);
    expect(res.body.durationMinutes).toBeGreaterThanOrEqual(0);
    expect(res.body.durationMinutes).toBeLessThan(2);
    expect(res.body.ticket.code).toBe(t.code);
    expect(res.body.ticket.plate).toBe("RETURN1");
    expect(res.body.ticket.spotNumber).toBe("S1");
    expect(res.body.ticket.returnedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(res.body.ticket.returnedBy).toBe(userIdOf(token));
  });

  it("R5: the spot is free again immediately, and other cars are not moved", async () => {
    const [a, b, c] = await fillSpots(token, 3);
    expect((await returnCar(token, a.code, a.plate)).status).toBe(200);
    // Catches: a return that does not free the spot (new car would get S4).
    expect((await parkOk(token, "NEXTSMALL", "small")).spotNumber).toBe("S1");
    const byNumber = Object.fromEntries((await spots(token)).body.spots.map((s) => [s.number, s.ticket?.code]));
    expect(byNumber.S2).toBe(b.code);
    expect(byNumber.S3).toBe(c.code);
  });

  it("R5: a returned large car frees its large spot for the next large car", async () => {
    const big = await parkOk(token, "BIGCAR", "large");
    await parkOk(token, "BIGCAR2", "large");
    await returnCar(token, big.code, "BIGCAR");
    expect((await parkOk(token, "BIGCAR3", "large")).spotNumber).toBe("L1");
  });

  it("D5: duration is whole minutes, floored (125.9 minutes parked -> 125)", async () => {
    const t = await parkOk(token, "LONGSTAY", "small");
    const arrived = new Date(Date.now() - 125.9 * 60_000).toISOString();
    const { error } = await adminDb().from("tickets").update({ arrived_at: arrived }).eq("code", t.code);
    expect(error).toBeNull();
    const res = await returnCar(token, t.code, "LONGSTAY");
    expect(res.status).toBe(200);
    // Catches: rounding (126), ceiling (126) or reporting seconds / hours.
    expect(res.body.durationMinutes).toBe(125);
  });

  it("D3: a code typed in lower case with a dash still works", async () => {
    const t = await parkOk(token, "DASHCODE", "small");
    const typed = `${t.code.slice(0, 4)}-${t.code.slice(4)}`.toLowerCase();
    const res = await returnCar(token, typed, "DASHCODE");
    expect(res.status).toBe(200);
    expect(res.body.ticket.code).toBe(t.code);
  });

  it("the plate may be typed in lower case with a dash (D1)", async () => {
    const t = await parkOk(token, "ABC123", "small");
    const res = await returnCar(token, t.code, " abc-123 ");
    expect(res.status).toBe(200);
  });

  it("D7: returnedBy is the second attendant when they return a ticket issued by the first", async () => {
    const t = await parkOk(token, "TWOUSERS", "small");
    expect(t.issuedBy).toBe(userIdOf(token));
    const res = await returnCar(token2, t.code, "TWOUSERS");
    expect(res.status).toBe(200);
    expect(userIdOf(token2)).not.toBe(userIdOf(token));
    expect(res.body.ticket.issuedBy).toBe(userIdOf(token));
    expect(res.body.ticket.returnedBy).toBe(userIdOf(token2));
    const stored = (await getTicket(token, t.code)).body.ticket;
    expect(stored.returnedBy).toBe(userIdOf(token2));
  });

  it("D4: a returned ticket is kept, shows returnedAt, and leaves the active list", async () => {
    const [a, b] = await fillSpots(token, 2);
    await returnCar(token, a.code, a.plate);
    const kept = await getTicket(token, a.code);
    expect(kept.status).toBe(200);
    expect(kept.body.ticket.returnedAt).not.toBeNull();
    const active = (await activeTickets(token)).body.tickets;
    expect(active.map((t) => t.code)).toEqual([b.code]);
  });
});

describe("wrong plate (R7)", () => {
  it("422 PLATE_MISMATCH, does not reveal the real plate, and the ticket stays usable", async () => {
    const t = await parkOk(token, "SECRET99", "small");
    const res = await returnCar(token, t.code, "WRONG11");
    // Catches: a message or field that echoes the stored plate.
    expectError(res, 422, "PLATE_MISMATCH");
    expect(res.text.toUpperCase()).not.toContain("SECRET99");

    // Catches: a mismatch that returns the car anyway or burns the ticket.
    const still = (await getTicket(token, t.code)).body.ticket;
    expect(still.returnedAt).toBeNull();
    expect((await spots(token)).body.spots.find((s) => s.number === "S1")?.ticket?.code).toBe(t.code);
    expect((await parkOk(token, "NEIGHBOR", "small")).spotNumber).toBe("S2");

    const ok = await returnCar(token, t.code, "SECRET99");
    expect(ok.status).toBe(200);
    expect(ok.body.ticket.returnedAt).not.toBeNull();
  });

  it("a plate that merely starts with the real one does not match", async () => {
    const t = await parkOk(token, "ABC123", "small");
    expectError(await returnCar(token, t.code, "ABC1234"), 422, "PLATE_MISMATCH");
    expectError(await returnCar(token, t.code, "ABC12"), 422, "PLATE_MISMATCH");
  });

  it("the right plate with another car's code is a mismatch", async () => {
    const [a, b] = await fillSpots(token, 2);
    expectError(await returnCar(token, a.code, b.plate), 422, "PLATE_MISMATCH");
    expect((await activeTickets(token)).body.tickets).toHaveLength(2);
  });
});

describe("other errors", () => {
  it("unknown code -> 404 TICKET_NOT_FOUND", async () => {
    expectError(await returnCar(token, "ZZZZZZZZ", "ANYPLATE"), 404, "TICKET_NOT_FOUND");
  });

  it("D8: a returned ticket given the wrong plate is ALREADY_RETURNED, not PLATE_MISMATCH", async () => {
    const t = await parkOk(token, "DONEDEAL", "small");
    await returnCar(token, t.code, "DONEDEAL");
    // Catches: checking the plate before the returned state (would be 422).
    expectError(await returnCar(token, t.code, "WRONG22"), 409, "ALREADY_RETURNED");
  });

  it("D8: an unknown code with a wrong or odd plate is still 404", async () => {
    expectError(await returnCar(token, "ZZZZZZZZ", "WRONG22"), 404, "TICKET_NOT_FOUND");
  });

  it.each([["abc"], ["ABCD!234"], ["ILOU1234"], ["ABCDEFGHJ"], [""]])(
    "D8: malformed code %j -> 400 INVALID_INPUT",
    async (code) => {
      // Catches: treating a malformed code as merely unknown (404).
      const res = await api(`/api/tickets/${encodeURIComponent(code || "%20")}/return`, {
        method: "POST",
        body: { plate: "ANYPLATE" },
        token,
      });
      expectError(res, 400, "INVALID_INPUT");
    },
  );

  it("returned twice -> 409 ALREADY_RETURNED, and the first return is not overwritten", async () => {
    const t = await parkOk(token, "TWICE1", "small");
    const first = await returnCar(token, t.code, "TWICE1");
    expect(first.status).toBe(200);
    const second = await returnCar(token2, t.code, "TWICE1");
    expectError(second, 409, "ALREADY_RETURNED");
    const stored = (await getTicket(token, t.code)).body.ticket;
    expect(stored.returnedAt).toBe(first.body.ticket.returnedAt);
    expect(stored.returnedBy).toBe(userIdOf(token));
  });

  it("missing plate -> 400 INVALID_INPUT and the ticket stays active", async () => {
    const t = await parkOk(token, "NOPLATE", "small");
    const res = await api(`/api/tickets/${t.code}/return`, { method: "POST", body: {}, token });
    expectError(res, 400, "INVALID_INPUT");
    expect((await getTicket(token, t.code)).body.ticket.returnedAt).toBeNull();
  });

  it("malformed JSON -> 400 INVALID_INPUT", async () => {
    const t = await parkOk(token, "BADJSON", "small");
    const res = await api(`/api/tickets/${t.code}/return`, { method: "POST", rawBody: "{plate:", token });
    expectError(res, 400, "INVALID_INPUT");
  });
});
