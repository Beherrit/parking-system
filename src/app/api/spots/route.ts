import { handle, json, requireUser } from "@/server/http";
import { listSpots } from "@/server/queries";

export function GET(req: Request): Promise<Response> {
  return handle(async () => {
    const { db } = await requireUser(req);
    return json({ spots: await listSpots(db) });
  });
}
