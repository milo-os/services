import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the automated demo recording (ui/e2e/demo.spec.ts).
 *
 * Differences from the main config:
 * - Targets only demo.spec.ts
 * - Video always on
 * - 1280×800 viewport for a clean recording frame
 * - Single worker, no retries — one clean take
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/demo.spec.ts',

  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,

  reporter: [['html', { outputFolder: 'playwright-report-demo' }]],

  use: {
    baseURL,
    video: 'on',
    screenshot: 'off',
    trace: 'off',
    viewport: { width: 1280, height: 800 },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: `${baseURL}/health`,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 120 * 1000,
  },
});
