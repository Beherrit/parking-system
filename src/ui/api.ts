// Client-side calls to the HTTP API. Same origin, so the session cookie travels with every request.
import type { ReturnResult, SpotStatus, Ticket } from "@/domain/types";
import { friendlyMessage, type UiErrorCode } from "./messages";

export class ApiError extends Error {
  constructor(
    public readonly code: UiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface FormError {
  code: string;
  message: string;
}

export function describeError(err: unknown): FormError {
  if (err instanceof ApiError) return { code: err.code, message: err.message };
  return { code: "UNKNOWN", message: friendlyMessage("UNKNOWN") };
}

async function request<T>(path: string, init?: { method: string; body: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init?.method ?? "GET",
      headers: { "Content-Type": "application/json" },
      body: init ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiError("NETWORK", friendlyMessage("NETWORK"));
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const code = body?.error?.code as string | undefined;
    throw new ApiError((code ?? "UNKNOWN") as UiErrorCode, friendlyMessage(code));
  }
  return body as T;
}

export async function fetchSpots(): Promise<SpotStatus[]> {
  return (await request<{ spots: SpotStatus[] }>("/api/spots")).spots;
}

export async function fetchActiveTickets(): Promise<Ticket[]> {
  return (await request<{ tickets: Ticket[] }>("/api/tickets?active=true")).tickets;
}

export async function fetchTicket(code: string): Promise<Ticket> {
  return (await request<{ ticket: Ticket }>(`/api/tickets/${encodeURIComponent(code)}`)).ticket;
}

export async function parkCar(plate: string, size: string): Promise<Ticket> {
  return (await request<{ ticket: Ticket }>("/api/tickets", { method: "POST", body: { plate, size } })).ticket;
}

export function returnCar(code: string, plate: string): Promise<ReturnResult> {
  return request<ReturnResult>(`/api/tickets/${encodeURIComponent(code.trim())}/return`, {
    method: "POST",
    body: { plate },
  });
}
