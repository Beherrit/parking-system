import { handle, json, readJsonObject, requireUser } from "@/server/http";
import { parkCar } from "@/server/park";
import { listActiveTickets } from "@/server/queries";

export function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const { db, userId } = await requireUser(req);
    const body = await readJsonObject(req);
    const ticket = await parkCar(db, { plate: body.plate, size: body.size }, userId);
    return json({ ticket }, 201);
  });
}

export function GET(req: Request): Promise<Response> {
  return handle(async () => {
    const { db } = await requireUser(req);
    // Only the active listing exists, with or without active=true.
    return json({ tickets: await listActiveTickets(db) });
  });
}
