import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Plain Vite + React. Styling is hand-authored CSS in src/index.css (ported
// verbatim from the original dashboard for pixel parity) — no Tailwind.
export default defineConfig({
  plugins: [react()],
  server: { port: 5180, host: true },
  preview: { port: 5180 },
})
