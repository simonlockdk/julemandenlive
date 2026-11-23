import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: 'src/web',
  publicDir: 'public',
  plugins: [react()],
  resolve: {
    alias: { '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)) },
  },
  build: {
    outDir: '../../dist/web',
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('maplibre-gl')) return 'maplibre';
          if (id.includes('hls.js')) return 'hls';
          if (id.includes('node_modules/react')) return 'react';
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:3200',
      '/media': 'http://127.0.0.1:3200',
    },
  },
  test: {
    root: '.',
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
} as any);
