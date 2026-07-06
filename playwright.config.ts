import { defineConfig, devices } from '@playwright/test';

const CI = !!process.env.CI;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: CI ? 1 : 0,
  timeout: 40_000,
  expect: { timeout: 7_000 },
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'de-DE',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'npm run e2e:server',
    url: 'http://localhost:4173',
    reuseExistingServer: !CI,
    timeout: 240_000
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } }
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] }
    },
    {
      // WebKit als Mobile-Safari-Proxy: Smoke- und Mobile-Spezifika
      name: 'mobile-webkit',
      use: { ...devices['iPhone 13'] },
      testMatch: /(smoke|mobile)\.spec\.ts/
    }
  ]
});
