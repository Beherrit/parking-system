// Test setup through the HTTP API, using the signed-in session of the Playwright context.
// Specs assert through the UI; this only builds the starting state quickly.
import { expect, type APIRequestContext } from "@playwright/test";
import type { CarSize } from "./pages/LotPage";

export async function parkViaApi(request: APIRequestContext, plate: string, size: CarSize): Promise<string> {
  const res = await request.post("/api/tickets", { data: { plate, size } });
  expect(res.status(), `park ${plate} (${size})`).toBe(201);
  return (await res.json()).ticket.code;
}

/** Parks `count` cars of one size, with plates like SM01, SM02 (or LG01, LG02). */
export async function fillViaApi(request: APIRequestContext, size: CarSize, count: number): Promise<void> {
  const prefix = size === "small" ? "SM" : "LG";
  for (let i = 1; i <= count; i++) {
    await parkViaApi(request, `${prefix}${String(i).padStart(2, "0")}`, size);
  }
}
