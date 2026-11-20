import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site from /<repo-name>/, so production builds need
// that base path. The dev server keeps serving from / .
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/system-design-playground/' : '/',
  plugins: [react()],
}));
