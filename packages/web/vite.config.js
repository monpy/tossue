import { defineConfig } from 'vite'

export default defineConfig({
  base: '/tossue/',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        privacy: 'privacy.html',
      },
    },
  },
})
