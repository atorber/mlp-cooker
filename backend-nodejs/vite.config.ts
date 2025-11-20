import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'node18',
    outDir: 'dist',
    lib: {
      entry: 'src/app.ts',
      formats: ['cjs'],
      fileName: 'app',
    },
    rollupOptions: {
      external: [
        'express',
        'cors',
        'helmet',
        'morgan',
        'compression',
        'dotenv',
        'yaml',
        'axios',
        'zod',
        'fs',
        'path',
      ],
    },
  },
  server: {
    port: 5002,
    host: '0.0.0.0',
  },
});