// Row level security, checked as a signed-in attendant and as anon.
import { beforeEach, describe, expect, it } from "vitest";
import { adminDb, resetLot } from "../support/db";
import { testEnv } from "../support/env";
import { anonClient, attendantClient, ticketRow } from "./db-helpers";

const PERMISSION_DENIED = "42501";
const now = () => new Date().toISOString();

/** An active ticket issued by `userId`, created behind RLS so tests can then update it. */
async function seedTicket(userId: string) {
  const { data, error } = await adminDb()
    .from("tickets")
    .insert(await ticketRow({ issued_by: userId }))
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}

describe("anon", () => {
  beforeEach(resetLot);

  it("cannot read spots or tickets", async () => {
    const spots = await anonClient().from("spots").select("id");
    const tickets = await anonClient().from("tickets").select("id");
    expect(spots.error?.code).toBe(PERMISSION_DENIED);
    expect(tickets.error?.code).toBe(PERMISSION_DENIED);
  });

  it("cannot insert a ticket", async () => {
    const { error } = await anonClient().from("tickets").insert(await ticketRow());
    expect(error?.code).toBe(PERMISSION_DENIED);
  });
});

describe("attendant reads and inserts", () => {
  beforeEach(resetLot);

  it("signs in and reads the 15 seeded spots", async () => {
    const { db } = await attendantClient();
    const { data, error } = await db.from("spots").select("number");
    expect(error).toBeNull();
    expect(data).toHaveLength(15);
  });

  it("inserts a ticket for themself, issued_by defaulting to their id", async () => {
    const { db, userId } = await attendantClient();
    const { data, error } = await db.from("tickets").insert(await ticketRow()).select().single();
    expect(error).toBeNull();
    expect(data?.issued_by).toBe(userId);
  });

  it("reads tickets issued by the other attendant", async () => {
    const one = await attendantClient();
    const two = await attendantClient(testEnv.attendantEmail2);
    await seedTicket(one.userId);
    const { data } = await two.db.from("tickets").select("id");
    expect(data).toHaveLength(1);
  });

  it("cannot insert with issued_by of the other attendant", async () => {
    const { db } = await attendantClient();
    const other = await attendantClient(testEnv.attendantEmail2);
    const { error } = await db.from("tickets").insert(await ticketRow({ issued_by: other.userId }));
    expect(error?.code).toBe(PERMISSION_DENIED);
  });

  it("cannot insert a ticket that is already returned", async () => {
    const { db } = await attendantClient();
    const { error } = await db.from("tickets").insert(await ticketRow({ returned_at: now() }));
    expect(error?.code).toBe(PERMISSION_DENIED);
  });
});

describe("attendant updates and deletes", () => {
  beforeEach(resetLot);

  it("returns an active ticket once, then the returned ticket is untouchable", async () => {
    const { db, userId } = await attendantClient();
    const ticket = await seedTicket(userId);
    const patch = { returned_at: now(), returned_by: userId };
    const first = await db.from("tickets").update(patch).eq("id", ticket.id).select();
    expect(first.error).toBeNull();
    expect(first.data).toHaveLength(1);
    // Second attempt: USING (returned_at is null) hides the row, so nothing is updated.
    const second = await db.from("tickets").update(patch).eq("id", ticket.id).select();
    expect(second.error).toBeNull();
    expect(second.data).toHaveLength(0);
  });

  it("lets the other attendant return it, recorded under their own id", async () => {
    const one = await attendantClient();
    const two = await attendantClient(testEnv.attendantEmail2);
    const ticket = await seedTicket(one.userId);
    const { data, error } = await two.db
      .from("tickets")
      .update({ returned_at: now(), returned_by: two.userId })
      .eq("id", ticket.id)
      .select();
    expect(error).toBeNull();
    expect(data?.[0]?.returned_by).toBe(two.userId);
  });

  it("cannot record the return under another user", async () => {
    const one = await attendantClient();
    const two = await attendantClient(testEnv.attendantEmail2);
    const ticket = await seedTicket(one.userId);
    const { error } = await one.db
      .from("tickets")
      .update({ returned_at: now(), returned_by: two.userId })
      .eq("id", ticket.id);
    expect(error?.code).toBe(PERMISSION_DENIED);
  });

  it("cannot change plate, spot or issued_by", async () => {
    const { db, userId } = await attendantClient();
    const ticket = await seedTicket(userId);
    const plate = await db.from("tickets").update({ plate: "HACKED1" }).eq("id", ticket.id);
    const spot = await db.from("tickets").update({ spot_id: crypto.randomUUID() }).eq("id", ticket.id);
    const issuer = await db.from("tickets").update({ issued_by: null }).eq("id", ticket.id);
    for (const result of [plate, spot, issuer]) expect(result.error?.code).toBe(PERMISSION_DENIED);
  });

  it("cannot delete tickets", async () => {
    const { db, userId } = await attendantClient();
    const ticket = await seedTicket(userId);
    const { error } = await db.from("tickets").delete().eq("id", ticket.id);
    expect(error?.code).toBe(PERMISSION_DENIED);
    const still = await adminDb().from("tickets").select("id").eq("id", ticket.id);
    expect(still.data).toHaveLength(1);
  });

  it("cannot modify or delete spots", async () => {
    const { db } = await attendantClient();
    const update = await db.from("spots").update({ number: "X1" }).eq("number", "S1");
    const remove = await db.from("spots").delete().eq("number", "S1");
    expect(update.error?.code).toBe(PERMISSION_DENIED);
    expect(remove.error?.code).toBe(PERMISSION_DENIED);
  });
});
