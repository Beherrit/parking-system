import type { Locator, Page } from "@playwright/test";

export type CarSize = "small" | "large";

export interface TicketFields {
  code: string;
  plate: string;
  spot: string;
  arrived: string;
}

/** The attendant screen at "/": spot grid, park form, return form, active tickets. */
export class LotPage {
  readonly lotName: Locator;
  readonly signOut: Locator;
  readonly freeSmall: Locator;
  readonly freeLarge: Locator;
  readonly parkResult: Locator;
  readonly parkError: Locator;
  readonly returnResult: Locator;
  readonly returnError: Locator;
  readonly activeTickets: Locator;

  constructor(private readonly page: Page) {
    this.lotName = page.getByTestId("lot-name");
    this.signOut = page.getByTestId("sign-out");
    this.freeSmall = page.getByTestId("free-small-count");
    this.freeLarge = page.getByTestId("free-large-count");
    this.parkResult = page.getByTestId("park-result");
    this.parkError = page.getByTestId("park-error");
    this.returnResult = page.getByTestId("return-result");
    this.returnError = page.getByTestId("return-error");
    this.activeTickets = page.getByTestId("active-tickets");
  }

  async goto(): Promise<void> {
    await this.page.goto("/");
    await this.freeSmall.waitFor(); // the grid has loaded
  }

  spot(number: string): Locator {
    return this.page.getByTestId(`spot-${number}`);
  }

  activeTicket(code: string): Locator {
    return this.page.getByTestId(`active-ticket-${code}`);
  }

  async park(plate: string, size: CarSize): Promise<void> {
    await this.page.getByTestId("park-plate").fill(plate);
    await this.page.getByTestId(`park-size-${size}`).check();
    await this.page.getByTestId("park-submit").click();
  }

  async returnCar(code: string, plate: string): Promise<void> {
    await this.page.getByTestId("return-code").fill(code);
    await this.page.getByTestId("return-plate").fill(plate);
    await this.page.getByTestId("return-submit").click();
  }

  /** Reads the ticket shown after a successful park. Waits for it to appear. */
  async issuedTicket(): Promise<TicketFields> {
    return this.readTicket("park-ticket");
  }

  returnedTicketSpot(): Locator {
    return this.page.getByTestId("return-ticket-spot");
  }

  returnedDuration(): Locator {
    return this.page.getByTestId("return-ticket-duration");
  }

  private async readTicket(prefix: string): Promise<TicketFields> {
    const text = (field: string) => this.page.getByTestId(`${prefix}-${field}`);
    await text("code").waitFor();
    return {
      code: (await text("code").textContent()) ?? "",
      plate: (await text("plate").textContent()) ?? "",
      spot: (await text("spot").textContent()) ?? "",
      arrived: (await text("arrived").textContent()) ?? "",
    };
  }
}
