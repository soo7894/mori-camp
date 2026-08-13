import { defineConfig } from 'vite';

export default defineConfig({
  // Electron loads the production bundle through file://, so assets must be relative.
  base: './',
});
