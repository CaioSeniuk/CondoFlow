import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/ui',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:3101', viewport: { width: 390, height: 844 } },
  webServer: {
    command: 'npm run start -- --hostname 127.0.0.1 --port 3101',
    url: 'http://127.0.0.1:3101',
    reuseExistingServer: false,
  },
});
