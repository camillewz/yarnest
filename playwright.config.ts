import { defineConfig, devices } from '@playwright/test';

const widths = [360, 390, 430] as const;

const engines = [
  { name: 'chromium', device: devices['Pixel 7'] },
  { name: 'webkit', device: devices['iPhone 14'] },
] as const;

// Locally only Chromium may be installed: PW_PROJECTS=chromium restricts the run.
const only = process.env.PW_PROJECTS?.split(',');

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  // Scénarios fonctionnels à 390 px ; contrôles de mise en page aux trois largeurs (section 8).
  projects: engines
    .filter((e) => !only || only.includes(e.name))
    .flatMap((e) =>
      widths.map((width) => ({
        name: `${e.name}-${width}`,
        use: { ...e.device, locale: 'fr-FR', viewport: { width, height: 800 } },
        ...(width === 390 ? {} : { testMatch: /layout\.spec\.ts/ }),
      })),
    ),
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
