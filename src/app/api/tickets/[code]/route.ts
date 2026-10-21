import { handle, json, requireUser } from "@/server/http";
import { getTicket } from "@/server/queries";

export function GET(req: Request, ctx: RouteContext<"/api/tickets/[code]">): Promise<Response> {
  return handle(async () => {
    const { db } = await requireUser(req);
    const { code } = await ctx.params;
    return json({ ticket: await getTicket(db, code) });
  });
}
