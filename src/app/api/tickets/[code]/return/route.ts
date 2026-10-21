import { handle, json, readJsonObject, requireUser } from "@/server/http";
import { returnCar } from "@/server/return-car";

export function POST(req: Request, ctx: RouteContext<"/api/tickets/[code]/return">): Promise<Response> {
  return handle(async () => {
    const { db, userId } = await requireUser(req);
    const { code } = await ctx.params;
    const body = await readJsonObject(req);
    return json(await returnCar(db, { code, plate: body.plate }, userId));
  });
}
