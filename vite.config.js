import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Tailwind v4 plugs straight into Vite — no tailwind.config.js / postcss.config.js
// needed. Theme tokens live in src/index.css under @theme.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5180, host: true },
  preview: { port: 5180 },
})
