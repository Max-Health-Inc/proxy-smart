import { defineConfig, devices } from "@playwright/test"

/**
 * E2E test configuration for Proxy Smart apps.
 *
 * Environments (set via E2E_TARGET):
 *   local  → docker-compose dev stack on localhost:8445
 *   beta   → https://beta.proxy-smart.com
 */

const target = (process.env.E2E_TARGET ?? "beta") as "local" | "beta"

const envMap = {
  local: {
    baseURL: "http://localhost:8445",
    keycloakURL: "http://localhost:8080",
  },
  beta: {
    baseURL: "https://beta.proxy-smart.com",
    keycloakURL: "https://beta.proxy-smart.com/auth",
  },
} as const

const env = envMap[target]

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false, // sequential — tests share auth state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 60_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: env.baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    ignoreHTTPSErrors: true,
    ...devices["Desktop Chrome"],
  },

  projects: [
    {
      name: "patient-portal",
      testMatch: /patient-portal\/.+\.spec\.ts$/,
    },
    {
      name: "consent-app",
      testMatch: /consent-app\/.+\.spec\.ts$/,
    },
  ],

  // Make environment info available to tests
  metadata: {
    target,
    baseURL: env.baseURL,
    keycloakURL: env.keycloakURL,
  },
})
