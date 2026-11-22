import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  // Relative asset paths so the build works when served from a subpath (GitHub Pages).
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
