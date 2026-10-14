import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages serves this repo at /effectshop/, not the domain root, so
  // built asset URLs need that prefix baked in — otherwise the deployed
  // index.html requests /assets/... (404) instead of /effectshop/assets/....
  base: '/effectshop/',
  plugins: [react(), tailwindcss()],
})
