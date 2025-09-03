import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'js-cookie': path.resolve(__dirname, 'node_modules/js-cookie'),
      'react-router-dom': path.resolve(__dirname, 'node_modules/react-router-dom')
    }
  },
  server: {
    port: 5173,
    host: true
  }
});
