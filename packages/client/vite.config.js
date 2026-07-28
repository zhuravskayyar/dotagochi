import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
  // Keep shared client/server environment values in the monorepo root.
  // Without this, local browser sessions never receive VITE_DEV_USER_ID
  // and the UI stays on the "open in Telegram" gate.
  envDir: '../../',
  server: {
    port: 5173,
    host: true
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['../../tests/client/**/*.test.jsx', '../../tests/client/**/*.test.js']
  }
});
