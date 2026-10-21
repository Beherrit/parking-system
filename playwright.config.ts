import { defineConfig, devices } from "@playwright/test";
import { testEnv } from "./tests/support/env"; // loads .env.local as a side effect

export const ATTENDANT_STATE = "test-results/.auth/attendant.json";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "test-results/artifacts",
  fullyParallel: false,
  workers: 1, // one shared lot, so tests cannot run side by side
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: testEnv.baseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      testMatch: /.*\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: ATTENDANT_STATE },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: testEnv.baseUrl,
    reuseExistingServer: true,
  },
});
