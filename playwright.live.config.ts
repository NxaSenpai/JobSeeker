import { defineConfig, devices } from "@playwright/test";

/**
 * Real-stack admin E2E: expects the frontend, API, and database to already be
 * running. Unlike playwright.config.ts, this config does not mock API traffic.
 */
export default defineConfig({
  testDir: "./tests",
  testMatch: "admin-live.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.E2E_FRONTEND_URL ?? "http://localhost:5173",
    reducedMotion: "reduce",
    trace: "off",
  },
});
