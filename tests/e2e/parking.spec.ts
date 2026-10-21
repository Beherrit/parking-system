import { expect, test } from "@playwright/test";
import { resetLot } from "../support/db";
import { fillViaApi } from "./lot-api";
import { LotPage } from "./pages/LotPage";

test.beforeEach(async () => {
  await resetLot();
});

test("R3: a small car gets S1, and the grid marks S1 taken", async ({ page }) => {
  const lot = new LotPage(page);
  await lot.goto();
  await expect(lot.freeSmall).toHaveText("10");
  await expect(lot.freeLarge).toHaveText("5");

  await lot.park("ab-123 c", "small"); // D1: normalized to AB123C

  const ticket = await lot.issuedTicket();
  expect(ticket.spot).toBe("S1");
  expect(ticket.plate).toBe("AB123C");
  expect(ticket.code).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
  await expect(lot.spot("S1")).toHaveAttribute("data-state", "taken");
  await expect(page.getByTestId("spot-S1-plate")).toHaveText("AB123C");
  await expect(lot.spot("S2")).toHaveAttribute("data-state", "free");
  await expect(lot.freeSmall).toHaveText("9");
  await expect(lot.activeTicket(ticket.code)).toBeVisible();
});

test("R3: when every small spot is taken, a small car lands on L1", async ({ page, request }) => {
  await fillViaApi(request, "small", 10);
  const lot = new LotPage(page);
  await lot.goto();
  await expect(lot.freeSmall).toHaveText("0");

  await lot.park("OVERFLOW1", "small");

  expect((await lot.issuedTicket()).spot).toBe("L1");
  await expect(lot.spot("L1")).toHaveAttribute("data-state", "taken");
  await expect(lot.freeLarge).toHaveText("4");
});

test("R4: a large car is refused when every large spot is taken, even with small spots free", async ({
  page,
  request,
}) => {
  await fillViaApi(request, "large", 5);
  const lot = new LotPage(page);
  await lot.goto();
  await expect(lot.freeLarge).toHaveText("0");
  await expect(lot.freeSmall).toHaveText("10");

  await lot.park("BIGTRUCK", "large");

  await expect(lot.parkError).toHaveAttribute("data-code", "LOT_FULL");
  await expect(lot.parkError).toContainText("lot is full");
  await expect(page.getByTestId("park-ticket-card")).toHaveCount(0);
  await expect(lot.freeSmall).toHaveText("10");
});

test("D2: a plate that is already parked is refused", async ({ page }) => {
  const lot = new LotPage(page);
  await lot.goto();
  await lot.park("TWICE1", "small");
  await lot.issuedTicket();

  await lot.park("twice-1", "small");

  await expect(lot.parkError).toHaveAttribute("data-code", "ALREADY_PARKED");
  await expect(lot.freeSmall).toHaveText("9");
});

test("an invalid plate shows a friendly message", async ({ page }) => {
  const lot = new LotPage(page);
  await lot.goto();
  await lot.park("!", "small");
  await expect(lot.parkError).toHaveAttribute("data-code", "INVALID_INPUT");
});
