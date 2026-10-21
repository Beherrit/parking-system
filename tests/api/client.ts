// Tiny HTTP client and shared setup for the black-box API tests. Knows only the contract.
/* eslint-disable @typescript-eslint/no-explicit-any -- response bodies are untyped on purpose; the tests assert their shape */
import { expect } from "vitest";
import { testEnv } from "../support/env";
import type { ParkingErrorCode } from "../../src/domain/errors";
import type { ReturnResult, Size, SpotStatus, Ticket } from "../../src/domain/types";

export interface ApiResponse<T = any> {
  status: number;
  body: T;
  text: string;
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  /** Sent as-is, without JSON.stringify. Used for malformed JSON. */
  rawBody?: string;
  token?: string;
}

export async function api<T = any>(path: string, opts: ApiOptions = {}): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {};
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  let payload: string | undefined = opts.rawBody;
  if (payload === undefined && opts.body !== undefined) payload = JSON.stringify(opts.body);
  if (payload !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${testEnv.baseUrl}${path}`, {
    method: opts.method ?? (payload !== undefined ? "POST" : "GET"),
    headers,
    body: payload,
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  return { status: res.status, body, text };
}

export const park = (token: string, plate: unknown, size: unknown) =>
  api<{ ticket: Ticket }>("/api/tickets", { method: "POST", body: { plate, size }, token });

export const returnCar = (token: string, code: string, plate: unknown) =>
  api<ReturnResult>(`/api/tickets/${encodeURIComponent(code)}/return`, {
    method: "POST",
    body: { plate },
    token,
  });

export const spots = (token: string) => api<{ spots: SpotStatus[] }>("/api/spots", { token });

export const activeTickets = (token: string) =>
  api<{ tickets: Ticket[] }>("/api/tickets?active=true", { token });

export const getTicket = (token: string, code: string) =>
  api<{ ticket: Ticket }>(`/api/tickets/${encodeURIComponent(code)}`, { token });

/** Asserts the contract error shape: HTTP status from HTTP_STATUS, body.error.code, non-empty message. */
export function expectError(res: ApiResponse, status: number, code: ParkingErrorCode): void {
  expect(res.status).toBe(status);
  expect(res.body?.error?.code).toBe(code);
  expect(typeof res.body.error.message).toBe("string");
  expect(res.body.error.message.length).toBeGreaterThan(0);
  expect(Object.keys(res.body)).toEqual(["error"]);
}

/** Parks and asserts 201, returning the ticket. */
export async function parkOk(token: string, plate: string, size: Size): Promise<Ticket> {
  const res = await park(token, plate, size);
  expect(res.status, `park ${plate}: ${res.text}`).toBe(201);
  return res.body.ticket;
}

/**
 * Fills the first `count` spots in allocation order by parking small cars one at a time:
 * S1..S10, then L1..L5 (small cars fall back to large only when all small spots are taken).
 * Plates are FILL01, FILL02, ... Returns the tickets in spot order.
 */
export async function fillSpots(token: string, count: number): Promise<Ticket[]> {
  const tickets: Ticket[] = [];
  for (let i = 1; i <= count; i++) {
    tickets.push(await parkOk(token, `FILL${String(i).padStart(2, "0")}`, "small"));
  }
  return tickets;
}

export const SMALL_SPOTS = Array.from({ length: 10 }, (_, i) => `S${i + 1}`);
export const LARGE_SPOTS = Array.from({ length: 5 }, (_, i) => `L${i + 1}`);
export const ALL_SPOTS = [...SMALL_SPOTS, ...LARGE_SPOTS];
export const CROCKFORD_CODE = /^[0-9A-HJKMNP-TV-Z]{8}$/;

/** The user id (JWT `sub`) of an access token, to compare against issuedBy / returnedBy. */
export function userIdOf(token: string): string {
  const payload = token.split(".")[1];
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).sub;
}
