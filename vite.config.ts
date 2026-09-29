import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: './', // Très important pour Electron : utilise des chemins relatifs
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/tournament_data.json'],
    },
  },
  build: {
    outDir: 'dist',
  }
});