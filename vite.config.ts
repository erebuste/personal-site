import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const api = 'http://localhost:3001';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { '/api': api, '/uploads': api },
    watch: { ignored: ['**/data/**'] }, // saving from /admin shouldn't reload the page
  },
});
