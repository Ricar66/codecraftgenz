import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'https://codecraftgenz.com.br',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    extraHTTPHeaders: {
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    },
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 720 } } },
    { name: 'mobile', use: { viewport: { width: 375, height: 812 }, isMobile: true } },
  ],
  reporter: [['html', { open: 'never' }], ['list']],
});
