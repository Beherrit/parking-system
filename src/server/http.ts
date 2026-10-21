import { HTTP_STATUS, ParkingError } from "@/domain/errors";
import { getRequestSupabase, type RequestSupabase } from "@/lib/supabase/server";

export interface AuthedRequest {
  db: RequestSupabase["db"];
  userId: string;
}

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function errorResponse(err: unknown): Response {
  if (err instanceof ParkingError) {
    return json({ error: { code: err.code, message: err.message } }, HTTP_STATUS[err.code]);
  }
  // Detail stays server side; the client gets nothing it could use.
  console.error("Unhandled API error:", err instanceof Error ? err.message : "unknown error");
  const code = "INTERNAL";
  return json({ error: { code, message: "Something went wrong." } }, HTTP_STATUS[code]);
}

/** Runs a handler body and turns anything it throws into the shared error shape. */
export async function handle(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (err) {
    return errorResponse(err);
  }
}

export async function requireUser(req: Request): Promise<AuthedRequest> {
  const { db, userId } = await getRequestSupabase(req);
  if (!userId) throw new ParkingError("UNAUTHENTICATED", "Sign in to use the parking system.");
  return { db, userId };
}

/** Malformed JSON, or a body that is not a JSON object, is INVALID_INPUT. */
export async function readJsonObject(req: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ParkingError("INVALID_INPUT", "Request body must be valid JSON.");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ParkingError("INVALID_INPUT", "Request body must be a JSON object.");
  }
  return body as Record<string, unknown>;
}
