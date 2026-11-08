/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { wgslVitePlugin } from 'vgpu/client';

export default defineConfig({
  plugins: [react({ include: /\.(jsx|js|ts|tsx)$/ }), wgslVitePlugin({ minify: true })],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/vitest.setup.js'],
    exclude: ['tests/**', 'node_modules/**'],
  },
  server: {
    port: 5173,
  },
});
