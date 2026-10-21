import type { Locator, Page } from "@playwright/test";

/** The printable ticket at "/tickets/{code}". */
export class TicketPage {
  readonly code: Locator;
  readonly plate: Locator;
  readonly spot: Locator;
  readonly arrived: Locator;
  readonly printButton: Locator;
  readonly error: Locator;

  constructor(private readonly page: Page) {
    this.code = page.getByTestId("ticket-code");
    this.plate = page.getByTestId("ticket-plate");
    this.spot = page.getByTestId("ticket-spot");
    this.arrived = page.getByTestId("ticket-arrived");
    this.printButton = page.getByTestId("print-button");
    this.error = page.getByTestId("ticket-error");
  }

  async goto(code: string): Promise<void> {
    await this.page.goto(`/tickets/${code}`);
  }
}
