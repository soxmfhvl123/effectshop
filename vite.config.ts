import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  // Served from the custom domain's root (effectshop.shop — see public/CNAME),
  // not a /effectshop/ subpath, now that a custom domain is set up. GitHub
  // Pages serves a custom domain at its root regardless of the repo name.
  base: '/',
  plugins: [react(), tailwindcss()],
})
