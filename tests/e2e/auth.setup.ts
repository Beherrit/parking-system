// Signs in through the UI once and saves the session for every spec.
import { expect, test as setup } from "@playwright/test";
import { ATTENDANT_STATE } from "../../playwright.config";
import { testEnv } from "../support/env";
import { LoginPage } from "./pages/LoginPage";
import { LotPage } from "./pages/LotPage";

setup("sign in as the attendant", async ({ page }) => {
  await new LoginPage(page).signIn(testEnv.attendantEmail, testEnv.attendantPassword);
  await expect(new LotPage(page).lotName).toBeVisible();
  await page.context().storageState({ path: ATTENDANT_STATE });
});
