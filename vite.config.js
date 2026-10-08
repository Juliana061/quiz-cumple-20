import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuración de Vite: React + servidor accesible desde el celular en la misma red
export default defineConfig({
  plugins: [react()],
  server: { host: true },
})
