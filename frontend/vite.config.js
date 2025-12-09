import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      // Proxy API calls during local dev to the backend
      '/api': {
        target: 'http://localhost:3030',
        changeOrigin: true,
        secure: false,
        // Strip the /api prefix so backend receives plain /user/... like in production after ingress rewrite
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // Proxy Socket.IO websocket traffic
      '/socket.io': {
        target: 'http://localhost:3030',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});