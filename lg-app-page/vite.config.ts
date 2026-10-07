import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // porta fixa: o cors do back libera só essa origem
  server: { port: 5173, strictPort: true },
})
