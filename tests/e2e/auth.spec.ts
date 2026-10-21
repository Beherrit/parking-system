import { expect, test } from "@playwright/test";
import { testEnv } from "../support/env";
import { LoginPage } from "./pages/LoginPage";
import { LotPage } from "./pages/LotPage";

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("sign-in fails with a wrong password and stays on the login page", async ({ page }) => {
    const login = new LoginPage(page);
    await login.signIn(testEnv.attendantEmail, "not-the-password");
    await expect(login.error).toBeVisible();
    await expect(login.error).toContainText("Sign-in failed");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("a signed-out visit to / redirects to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(new LoginPage(page).submit).toBeVisible();
  });

  test("a signed-out visit to a ticket page redirects to /login", async ({ page }) => {
    await page.goto("/tickets/ABCD2345");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("the right password signs in and lands on the lot", async ({ page }) => {
    await new LoginPage(page).signIn(testEnv.attendantEmail, testEnv.attendantPassword);
    await expect(page).toHaveURL(/\/$/);
    await expect(new LotPage(page).lotName).toBeVisible();
  });

  test("signing out returns to the login page", async ({ page }) => {
    // Its own sign-in: signing out revokes that session, so it must not borrow the shared one.
    await new LoginPage(page).signIn(testEnv.attendantEmail, testEnv.attendantPassword);
    const lot = new LotPage(page);
    await expect(lot.lotName).toBeVisible();
    await lot.signOut.click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  // Regression: after sign-out the login form came back with Sign in still disabled.
  test("an attendant can sign out and sign straight back in, twice", async ({ page }) => {
    const login = new LoginPage(page);
    const lot = new LotPage(page);
    await page.goto("/");
    for (let round = 0; round < 2; round++) {
      await login.signIn(testEnv.attendantEmail, testEnv.attendantPassword);
      await expect(lot.lotName).toBeVisible();
      await lot.signOut.click();
      await expect(page).toHaveURL(/\/login$/);
      await expect(login.submit).toBeEnabled();
    }
  });
});
