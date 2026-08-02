import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Eby-Gold-inv-New/' // MUST match your repo name with capitals
})
