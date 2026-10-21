// Read endpoints: GET /api/spots, GET /api/tickets?active=true, GET /api/tickets/{code}.
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { attendantToken, resetLot } from "../support/db";
import { ALL_SPOTS, activeTickets, api, expectError, fillSpots, getTicket, parkOk, returnCar, spots } from "./client";

let token: string;
beforeAll(async () => {
  token = await attendantToken();
});
beforeEach(resetLot);

describe("GET /api/spots", () => {
  it("lists 15 spots in natural order S1..S10 then L1..L5, all free on an empty lot", async () => {
    const res = await spots(token);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body)).toEqual(["spots"]);
    // Catches: string sort (S1, S10, S2 ...) or large before small.
    expect(res.body.spots.map((s) => s.number)).toEqual(ALL_SPOTS);
    expect(res.body.spots.map((s) => s.size)).toEqual([...Array(10).fill("small"), ...Array(5).fill("large")]);
    expect(res.body.spots.every((s) => s.ticket === null)).toBe(true);
    expect(res.body.spots.every((s) => typeof s.id === "string" && s.id.length > 0)).toBe(true);
  });

  it("occupied spots show their ticket, free ones show null", async () => {
    const small = await parkOk(token, "READ1", "small");
    const large = await parkOk(token, "READ2", "large");
    const list = (await spots(token)).body.spots;
    const byNumber = Object.fromEntries(list.map((s) => [s.number, s]));

    expect(byNumber.S1.ticket).toMatchObject({
      code: small.code,
      plate: "READ1",
      carSize: "small",
      arrivedAt: small.arrivedAt,
    });
    expect(byNumber.L1.ticket).toMatchObject({
      code: large.code,
      plate: "READ2",
      carSize: "large",
      arrivedAt: large.arrivedAt,
    });
    // Catches: ticket attached to the wrong spot, or shown on every spot.
    expect(list.filter((s) => s.ticket !== null).map((s) => s.number)).toEqual(["S1", "L1"]);
  });

  it("a small car parked in a large spot is shown on the large spot with carSize small", async () => {
    await fillSpots(token, 11);
    const l1 = (await spots(token)).body.spots.find((s) => s.number === "L1");
    expect(l1?.size).toBe("large");
    expect(l1?.ticket?.carSize).toBe("small");
    expect(l1?.ticket?.plate).toBe("FILL11");
  });

  it("a returned car disappears from its spot", async () => {
    const t = await parkOk(token, "LEAVING", "small");
    await returnCar(token, t.code, "LEAVING");
    expect((await spots(token)).body.spots.every((s) => s.ticket === null)).toBe(true);
  });
});

describe("GET /api/tickets?active=true", () => {
  it("is empty on an empty lot", async () => {
    const res = await activeTickets(token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ tickets: [] });
  });

  it("lists only active tickets, newest first", async () => {
    const [a, b, c, d] = await fillSpots(token, 4);
    await returnCar(token, b.code, b.plate);
    const res = await activeTickets(token);
    expect(res.status).toBe(200);
    // Catches: oldest-first order, or returned tickets still listed.
    expect(res.body.tickets.map((t) => t.code)).toEqual([d.code, c.code, a.code]);
    expect(res.body.tickets.every((t) => t.returnedAt === null)).toBe(true);
    expect(res.body.tickets[0]).toMatchObject({ plate: d.plate, spotNumber: d.spotNumber, carSize: "small" });
  });

  it("a returned and re-parked plate appears once, with the new ticket", async () => {
    const first = await parkOk(token, "AGAIN1", "small");
    await returnCar(token, first.code, "AGAIN1");
    const second = await parkOk(token, "AGAIN1", "small");
    const active = (await activeTickets(token)).body.tickets;
    expect(active.map((t) => t.code)).toEqual([second.code]);
  });
});

describe("GET /api/tickets without a query", () => {
  it("lists the active tickets, newest first, same as active=true", async () => {
    const [a, b, c] = await fillSpots(token, 3);
    await returnCar(token, a.code, a.plate);
    const res = await api<{ tickets: { code: string }[] }>("/api/tickets", { token });
    expect(res.status).toBe(200);
    expect(res.body.tickets.map((t) => t.code)).toEqual([c.code, b.code]);
    expect(res.body).toEqual((await activeTickets(token)).body);
  });
});

describe("GET /api/tickets/{code}", () => {
  it("returns the ticket for a known code", async () => {
    const t = await parkOk(token, "LOOKUP1", "large");
    const res = await getTicket(token, t.code);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body)).toEqual(["ticket"]);
    expect(res.body.ticket).toEqual(t);
  });

  it("accepts the code in lower case with a dash (D3)", async () => {
    const t = await parkOk(token, "LOOKUP2", "small");
    const typed = `${t.code.slice(0, 4)}-${t.code.slice(4)}`.toLowerCase();
    const res = await getTicket(token, typed);
    expect(res.status).toBe(200);
    expect(res.body.ticket.code).toBe(t.code);
  });

  it("returns a returned ticket too (D4), with returnedAt set", async () => {
    const t = await parkOk(token, "LOOKUP3", "small");
    await returnCar(token, t.code, "LOOKUP3");
    const res = await getTicket(token, t.code);
    expect(res.status).toBe(200);
    expect(res.body.ticket.returnedAt).not.toBeNull();
  });

  it.each([["abc"], ["ABCD!234"], ["ILOU1234"], ["ABCDEFGHJ"], ["%20"]])(
    "malformed code %j -> 400 INVALID_INPUT",
    async (code) => {
      expectError(await getTicket(token, code === "%20" ? " " : code), 400, "INVALID_INPUT");
    },
  );

  it("unknown code -> 404 TICKET_NOT_FOUND", async () => {
    expectError(await getTicket(token, "ZZZZZZZZ"), 404, "TICKET_NOT_FOUND");
  });
});
