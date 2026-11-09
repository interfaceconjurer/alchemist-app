import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.COMPATIBILITY_TEST_PORT || 5213);
const runtime = 'runtime-resilience.spec.js';
const mobile = 'mobile-shell.spec.js';
const dormancy = 'crystal-dormancy.spec.js';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 45_000,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium-desktop', testMatch: [runtime, dormancy],
      use: { ...devices['Desktop Chrome'], viewport: { width: 400, height: 800 }, deviceScaleFactor: 1 } },
    { name: 'webkit-desktop', testMatch: [runtime, dormancy],
      use: { ...devices['Desktop Safari'], viewport: { width: 400, height: 800 }, deviceScaleFactor: 1 } },
    { name: 'android-chromium', testMatch: [runtime, mobile, dormancy], use: { ...devices['Pixel 7'] } },
    { name: 'ios-webkit', testMatch: [runtime, mobile, dormancy], use: { ...devices['iPhone 13'] } },
    { name: 'ipad-webkit', testMatch: mobile, use: { ...devices['iPad Mini'] } },
  ],
  webServer: {
    command: 'NODE_ENV=production npm run build && NODE_ENV=test node ../server.js',
    env: { PORT: String(port) },
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
