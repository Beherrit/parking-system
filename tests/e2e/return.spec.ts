import { expect, test } from "@playwright/test";
import { resetLot } from "../support/db";
import { LotPage } from "./pages/LotPage";

test.beforeEach(async () => {
  await resetLot();
});

test("R5: returning with the right plate frees the spot", async ({ page }) => {
  const lot = new LotPage(page);
  await lot.goto();
  await lot.park("RETURN1", "small");
  const ticket = await lot.issuedTicket();
  await expect(lot.spot("S1")).toHaveAttribute("data-state", "taken");

  await lot.returnCar(ticket.code, "return 1");

  await expect(lot.returnedDuration()).toHaveText("0 minutes"); // D5: whole minutes, floored
  await expect(lot.returnedTicketSpot()).toHaveText("S1");
  await expect(lot.spot("S1")).toHaveAttribute("data-state", "free");
  await expect(lot.freeSmall).toHaveText("10");
  await expect(lot.activeTicket(ticket.code)).toHaveCount(0);
  await expect(page.getByTestId("active-empty")).toBeVisible();
});

test("R7: a wrong plate is refused and the car stays parked", async ({ page }) => {
  const lot = new LotPage(page);
  await lot.goto();
  await lot.park("RIGHT1", "small");
  const ticket = await lot.issuedTicket();

  await lot.returnCar(ticket.code, "WRONG1");

  await expect(lot.returnError).toHaveAttribute("data-code", "PLATE_MISMATCH");
  await expect(lot.returnError).toContainText("does not match");
  await expect(lot.returnError).not.toContainText("RIGHT1"); // never reveals the real plate
  await expect(lot.spot("S1")).toHaveAttribute("data-state", "taken");
  await expect(lot.activeTicket(ticket.code)).toBeVisible();

  await lot.returnCar(ticket.code, "RIGHT1"); // the ticket stays valid
  await expect(lot.spot("S1")).toHaveAttribute("data-state", "free");
});

test("D4: returning the same ticket twice is refused", async ({ page }) => {
  const lot = new LotPage(page);
  await lot.goto();
  await lot.park("ONCE1", "small");
  const ticket = await lot.issuedTicket();
  await lot.returnCar(ticket.code, "ONCE1");
  await expect(lot.returnedDuration()).toBeVisible();

  await lot.returnCar(ticket.code, "ONCE1");

  await expect(lot.returnError).toHaveAttribute("data-code", "ALREADY_RETURNED");
});

test("an unknown ticket code shows a not-found message", async ({ page }) => {
  const lot = new LotPage(page);
  await lot.goto();
  await lot.returnCar("ZZZZZZZZ", "NOPLATE");
  await expect(lot.returnError).toHaveAttribute("data-code", "TICKET_NOT_FOUND");
});
