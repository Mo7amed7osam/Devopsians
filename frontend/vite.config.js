import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,          // مهم عشان requests من برّه localhost
    port: 3001,
    allowedHosts: true,  // يسمح لأي دومين (زي trycloudflare)
    proxy: {
      '/api': {
        target: 'http://localhost:3030',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/socket.io': {
        target: 'http://localhost:3030',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});