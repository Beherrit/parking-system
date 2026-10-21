// D7: every route needs a session. No token or a garbage token -> 401 UNAUTHENTICATED.
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { attendantToken, resetLot } from "../support/db";
import { testEnv } from "../support/env";
import { activeTickets, api, expectError, parkOk, spots } from "./client";

const routes: { name: string; method: string; path: string; body?: unknown }[] = [
  { name: "POST /api/tickets", method: "POST", path: "/api/tickets", body: { plate: "AUTH1", size: "small" } },
  { name: "GET /api/tickets?active=true", method: "GET", path: "/api/tickets?active=true" },
  { name: "GET /api/tickets/{code}", method: "GET", path: "/api/tickets/ABCD1234" },
  { name: "POST /api/tickets/{code}/return", method: "POST", path: "/api/tickets/ABCD1234/return", body: { plate: "AUTH1" } },
  { name: "GET /api/spots", method: "GET", path: "/api/spots" },
];

let token: string;
beforeAll(async () => {
  token = await attendantToken();
});
beforeEach(resetLot);

describe.each(routes)("$name", ({ method, path, body }) => {
  it("without a token -> 401 UNAUTHENTICATED", async () => {
    expectError(await api(path, { method, body }), 401, "UNAUTHENTICATED");
  });

  it("with a garbage token -> 401 UNAUTHENTICATED", async () => {
    expectError(await api(path, { method, body, token: "not-a-real-token" }), 401, "UNAUTHENTICATED");
  });

  it("with a well-formed but forged JWT -> 401 UNAUTHENTICATED", async () => {
    const [header, payload] = token.split(".");
    const forged = `${header}.${payload}.${Buffer.from("forged-signature").toString("base64url")}`;
    expectError(await api(path, { method, body, token: forged }), 401, "UNAUTHENTICATED");
  });
});

describe("unauthenticated calls have no side effects", () => {
  it("a rejected POST does not park a car", async () => {
    // Catches: a handler that does the work and then checks the session.
    await api("/api/tickets", { method: "POST", body: { plate: "GHOST1", size: "small" } });
    expect((await spots(token)).body.spots.every((s) => s.ticket === null)).toBe(true);
    expect((await activeTickets(token)).body.tickets).toEqual([]);
  });

  it("a rejected return does not return the car", async () => {
    const t = await parkOk(token, "STAYING", "small");
    await api(`/api/tickets/${t.code}/return`, { method: "POST", body: { plate: "STAYING" } });
    await api(`/api/tickets/${t.code}/return`, { method: "POST", body: { plate: "STAYING" }, token: "garbage" });
    const active = (await activeTickets(token)).body.tickets;
    expect(active.map((x) => x.code)).toEqual([t.code]);
  });

  it("the error body carries no ticket data", async () => {
    const t = await parkOk(token, "PRIVATE1", "small");
    const res = await api(`/api/tickets/${t.code}`);
    expectError(res, 401, "UNAUTHENTICATED");
    expect(res.text).not.toContain("PRIVATE1");
  });
});

it("nobody can create their own account (sign-up is off)", async () => {
  const anon = createClient(testEnv.supabaseUrl, testEnv.anonKey, { auth: { persistSession: false } });
  const email = `intruder${Date.now()}@example.com`;
  const { data, error } = await anon.auth.signUp({ email, password: "Intruder-123456" });
  expect(error).not.toBeNull();
  expect(data.session).toBeNull();
});

it("sanity: the same calls succeed with a valid token", async () => {
  expect((await spots(token)).status).toBe(200);
  expect((await activeTickets(token)).status).toBe(200);
});
