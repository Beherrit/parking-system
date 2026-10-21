import { expect, test } from "@playwright/test";
import { resetLot } from "../support/db";
import { LotPage } from "./pages/LotPage";
import { TicketPage } from "./pages/TicketPage";

test.beforeEach(async () => {
  await resetLot();
});

test("R6: the printable ticket shows code, plate, spot and arrival time", async ({ page }) => {
  const lot = new LotPage(page);
  await lot.goto();
  await lot.park("PRINT1", "small");
  const issued = await lot.issuedTicket();

  await page.getByTestId("park-ticket-link").click();

  await expect(page).toHaveURL(`/tickets/${issued.code}`);
  const ticket = new TicketPage(page);
  await expect(ticket.code).toHaveText(issued.code);
  await expect(ticket.plate).toHaveText("PRINT1");
  await expect(ticket.spot).toHaveText("S1");
  await expect(ticket.arrived).toHaveText(issued.arrived); // same local time as on the lot screen
  await expect(ticket.arrived).toHaveText(/\d{1,2}:\d{2}/);
});

test("the ticket page hides the Print button when printing", async ({ page }) => {
  const lot = new LotPage(page);
  await lot.goto();
  await lot.park("PRINT2", "small");
  const { code } = await lot.issuedTicket();
  const ticket = new TicketPage(page);
  await ticket.goto(code);
  await expect(ticket.printButton).toBeVisible();

  await page.emulateMedia({ media: "print" });

  await expect(ticket.printButton).toBeHidden();
  await expect(ticket.code).toBeVisible();
});

test("an unknown ticket code shows a not-found message", async ({ page }) => {
  const ticket = new TicketPage(page);
  await ticket.goto("ZZZZZZZZ");
  await expect(ticket.error).toHaveAttribute("data-code", "TICKET_NOT_FOUND");
});
