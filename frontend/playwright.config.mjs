import { defineConfig } from '@playwright/test'

// Renders the production build (vite preview of dist/) under the Pages base.
// Uses an installed Chrome; override with SF_CHROME=/path/to/chrome.
const executablePath = process.env.SF_CHROME || '/usr/bin/google-chrome'
const shots = process.env.SF_SCREENSHOT_DIR || 'test-results/screenshots'

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results/artifacts',
  reporter: [['list'], ['json', { outputFile: process.env.SF_E2E_JSON || 'test-results/e2e.json' }]],
  use: { baseURL: 'http://127.0.0.1:4173/soul-forge-eval/', launchOptions: { executablePath } },
  metadata: { screenshots: shots },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  ],
  webServer: { command: 'npx vite preview --port 4173 --strictPort --host 127.0.0.1', url: 'http://127.0.0.1:4173/soul-forge-eval/', reuseExistingServer: false, timeout: 60000 },
})
