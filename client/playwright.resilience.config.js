import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.RESILIENCE_TEST_PORT || 5211);

export default defineConfig({
  testDir: './tests',
  testMatch: 'runtime-resilience.spec.js',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 45_000,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 400, height: 800 },
    deviceScaleFactor: 1,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'NODE_ENV=production npm run build && NODE_ENV=test node ../server.js',
    env: { PORT: String(port) },
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
