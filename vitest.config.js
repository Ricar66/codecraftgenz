import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
    // e2e/ roda pelo Playwright (npx playwright test), nao pelo Vitest.
    // Sem esta exclusao, o Vitest varre os *.spec.js de e2e e falha.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
  },
});