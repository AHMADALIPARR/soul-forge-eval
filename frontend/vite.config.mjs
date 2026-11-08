import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project site: served under /soul-forge-eval/.
export default defineConfig({
  base: '/soul-forge-eval/',
  plugins: [react()],
  server: { fs: { allow: ['..'] } },
  build: { outDir: 'dist', sourcemap: false, emptyOutDir: true },
})
