import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const shared = path.resolve(__dirname, '../shared')

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Общие с сервером модули: разбор текста статьи, справочники услуг
  resolve: { alias: { '@shared': shared } },
  server: {
    fs: { allow: [__dirname, shared] },
    // В разработке API на том же адресе: без CORS и без VITE_API_URL
    proxy: { '/api': 'http://localhost:4000', '/uploads': 'http://localhost:4000' },
  },
})
